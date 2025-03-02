import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RepositoryFile, SortColumn, SortDirection, FileStatus } from '../../types/repository';
import FileTable from './FileTable';
import FileFilters from './FileFilters';
import SyncStatus from '././SyncStatus';
import ErrorState from '././ErrorState';
import NotConnectedState from './NotConnectedState';
import FileViewerModal from '././FileViewerModal';
import LoadingState from './LoadingState';
import { syncRepository, getRepositoryFiles } from '../../services/github';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Cog } from 'lucide-react';
import ToolSection from './ToolSection/ToolSection';

// Add this helper function to map legacy 'active' status to 'unchanged'
const normalizeFileStatus = (status: string | undefined): FileStatus => {
  if (!status) return 'unchanged';
  if (status === 'active') return 'unchanged';
  return status as FileStatus;
};

export default function CodebaseViewer() {
  // Hooks
  const { user } = useAuth();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const navigate = useNavigate();
  const { repoName, filePath } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Read filter values from URL or use defaults
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState<FileStatus>(searchParams.get('status') as FileStatus || 'all');
  const [filterLanguage, setFilterLanguage] = useState(searchParams.get('language') || 'all');
  const [filterComponent, setFilterComponent] = useState(searchParams.get('component') || 'all');

  const [sortColumn, setSortColumn] = useState<SortColumn>('path');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'completed' | 'failed';
    lastSynced?: Date;
    error?: string;
  }>({ status: 'idle' });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterLanguage !== 'all') params.set('language', filterLanguage);
    if (filterComponent !== 'all') params.set('component', filterComponent);
    setSearchParams(params);
  }, [searchTerm, filterStatus, filterLanguage, filterComponent, setSearchParams]);

  // Fetch repository data
  useEffect(() => {
    console.log('Current account:', currentAccount); // Debug log
    const fetchRepo = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch repository data
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        const repoRef = doc(db, 'repositories', repoId);
        const repoDoc = await getDoc(repoRef);

        if (!repoDoc.exists()) {
          throw new Error('Repository not found');
        }

        const repoData = repoDoc.data();
        console.log('Fetched repository data:', repoData); // Debug log

        // Update sync status from metadata
        const syncStatus = repoData?.metadata?.sync_status || 'idle';
        const lastSynced = repoData?.metadata?.last_synced?.toDate();
        setSyncStatus({
          status: syncStatus,
          lastSynced: lastSynced,
        });

        // Fetch files from the 'files' subcollection
        const filesCollection = collection(db, `repositories/${repoId}/files`);
        const filesSnapshot = await getDocs(filesCollection);
        const files = filesSnapshot.docs.map((doc) => {
          const fileData = doc.data() as RepositoryFile;
          console.log('File data:', fileData); // Debug log
          return fileData;
        });
        console.log('Fetched files:', files); // Debug log

        if (files.length === 0) {
          throw new Error('No files found in repository');
        }

        setFiles(files);
      } catch (error) {
        console.error('Failed to fetch repository:', error);
        setError('Failed to fetch repository. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRepo();
  }, [currentAccount]);

  // Handle file selection
  const handleFileSelect = (file: RepositoryFile) => {
    setSelectedFile(file);
    navigate(`/repository/${repoName}/file/${encodeURIComponent(file.path)}`);
  };

  const handleSync = async () => {
    if (!currentAccount?.settings?.githubRepository || !currentAccount.id) return;
    try {
      setLoading(true);
      await syncRepository(
        currentAccount.settings.githubRepository,
        currentAccount.id
      );
    } catch (error) {
      console.error('Failed to sync repository:', error);
      setError('Failed to sync repository. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch =
        file.path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.path?.split('/').pop()?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.ai_analysis?.summary?.toLowerCase().includes(searchTerm.toLowerCase());

      // Normalize the file status before comparing
      const normalizedStatus = normalizeFileStatus(file.status);
      const matchesStatus = filterStatus === 'all' || normalizedStatus === filterStatus;

      const matchesLanguage =
        filterLanguage === 'all' || file.language === filterLanguage;

      const matchesComponent =
        filterComponent === 'all' ||
        (file.path && file.path.startsWith(`${filterComponent}/`));

      return matchesSearch && matchesStatus && matchesLanguage && matchesComponent;
    });
  }, [files, searchTerm, filterStatus, filterLanguage, filterComponent]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === undefined || bValue === undefined) return 0;

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredFiles, sortColumn, sortDirection]);

  const components = useMemo(() => {
    const componentMap: { [key: string]: number } = {};

    files.forEach((file) => {
      const pathParts = file.path?.split('/') || [];
      if (pathParts.length > 1) {
        const component = pathParts[0]; // Extract the first part of the path as the component
        componentMap[component] = (componentMap[component] || 0) + 1;
      }
    });

    // Convert to an array of { component, count } and sort by count (descending)
    return Object.entries(componentMap)
      .map(([component, count]) => ({ component, count }))
      .sort((a, b) => b.count - a.count);
  }, [files]);

  // Conditional returns
  if (!currentAccount?.settings?.githubRepository) {
    return <NotConnectedState />;
  }

  if (accountLoading || loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => navigate('/settings/github')} />;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* Title and Subtitle */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Codebase Explorer</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Explore and manage your repository files
            </p>
          </div>

          {/* Sync Status and Actions */}
          <div className="flex items-center gap-4">
            {/* Sync Status */}
            {syncStatus.status !== 'idle' && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Sync status:</span>
                <span className="font-medium">
                  {syncStatus.status === 'syncing' ? 'Syncing...' : 
                   syncStatus.status === 'completed' ? 'Completed' : 
                   syncStatus.status === 'failed' ? 'Failed' : 'Idle'}
                </span>
              </div>
            )}

            {/* Last Synced */}
            {syncStatus.lastSynced && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Last synced:</span>
                <span className="font-medium">
                  {syncStatus.lastSynced.toLocaleString()}
                </span>
              </div>
            )}

            {/* Sync Now Button */}
            <button
              onClick={handleSync}
              className={`
                flex items-center gap-2
                px-4 py-2
                text-sm font-medium
                bg-blue-50 dark:bg-blue-900/30
                text-blue-700 dark:text-blue-400
                rounded-lg
                hover:bg-blue-100 dark:hover:bg-blue-900/40
                transition-colors
              `}
            >
              <Cog className="w-4 h-4" />
              Sync Now
            </button>

            {/* Settings Button */}
            <button
              onClick={() => navigate('/settings/github')}
              className={`
                flex items-center gap-2
                px-4 py-2
                text-sm font-medium
                bg-gray-50 dark:bg-gray-800
                text-gray-700 dark:text-gray-300
                rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
              `}
            >
              <Cog className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Filters and Table */}
      <FileFilters
        searchTerm={searchTerm}
        filterStatus={filterStatus}
        filterLanguage={filterLanguage}
        filterComponent={filterComponent}
        components={components}
        onSearchChange={(value) => setSearchTerm(value)}
        onFilterChange={(key, value) => {
          if (key === 'status') setFilterStatus(value as FileStatus);
          if (key === 'language') setFilterLanguage(value);
          if (key === 'component') setFilterComponent(value);
        }}
      />
      <FileTable
        files={sortedFiles}
        page={page}
        rowsPerPage={rowsPerPage}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onSort={handleSort}
        onFileSelect={handleFileSelect}
      />
      <FileViewerModal
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </div>
  );
}