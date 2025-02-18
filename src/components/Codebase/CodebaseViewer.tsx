import { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, doc, getDoc, onSnapshot, orderBy, limit, Firestore, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Loader2, FolderIcon, XCircle, Search, FileIcon, FileTextIcon, FileCodeIcon, FileJsonIcon, ImageIcon, FileTypeIcon, PackageIcon, Settings2Icon, DatabaseIcon, LockIcon, Github, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Paper, TextField, InputAdornment } from '@mui/material';
import { 
  SiPython, 
  SiJavascript, 
  SiTypescript, 
  SiReact, 
  SiVuedotjs,
  SiHtml5,
  SiCss3,
  SiJavascript as SiJava,
  SiPhp,
  SiRuby,
  SiSwift,
  SiKotlin,
  SiGo,
  SiRust,
  SiMarkdown,
  SiDocker,
  SiGit
} from 'react-icons/si';
import { syncRepository } from '../../services/github';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

// Add helper functions at the top level
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

interface RepositoryFile {
  metadata: {
    language: string;
    last_commit_message: string;
    last_updated: string;  // ISO date string
    name: string;
    path: string;
    sha: string;
    size: number;
    type: string;
  };
  updated_at: string;  // ISO date string
}

interface Repository {
  files: RepositoryFile[];
  metadata: {
    name: string;
    description?: string;
    default_branch: string;
    sync_status: string;
    last_synced?: Date;
  };
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return '-';
  // Handle both Firestore Timestamps and regular dates/numbers
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

const getContentPreview = (content: string | undefined) => {
  if (!content) return '-';
  return content.slice(0, 100) + (content.length > 100 ? '...' : '');
};

const getFileIcon = (filePath: string) => {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const fileName = filePath.toLowerCase();

  // Language-specific icons
  switch (extension) {
    // Python
    case 'py':
      return <SiPython className="h-4 w-4 text-blue-500" />;
    
    // JavaScript
    case 'js':
      return <SiJavascript className="h-4 w-4 text-yellow-400" />;
    
    // TypeScript
    case 'ts':
      return <SiTypescript className="h-4 w-4 text-blue-600" />;
    
    // React
    case 'jsx':
    case 'tsx':
      return <SiReact className="h-4 w-4 text-cyan-400" />;
    
    // Vue
    case 'vue':
      return <SiVuedotjs className="h-4 w-4 text-emerald-400" />;
    
    // HTML
    case 'html':
    case 'htm':
      return <SiHtml5 className="h-4 w-4 text-orange-500" />;
    
    // CSS
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <SiCss3 className="h-4 w-4 text-blue-500" />;
    
    // Java
    case 'java':
      return <SiJava className="h-4 w-4 text-red-500" />;
    
    // PHP
    case 'php':
      return <SiPhp className="h-4 w-4 text-purple-500" />;
    
    // Ruby
    case 'rb':
      return <SiRuby className="h-4 w-4 text-red-600" />;
    
    // Swift
    case 'swift':
      return <SiSwift className="h-4 w-4 text-orange-500" />;
    
    // Kotlin
    case 'kt':
    case 'kts':
      return <SiKotlin className="h-4 w-4 text-purple-600" />;
    
    // Go
    case 'go':
      return <SiGo className="h-4 w-4 text-cyan-500" />;
    
    // Rust
    case 'rs':
      return <SiRust className="h-4 w-4 text-orange-600" />;
    
    // Markdown
    case 'md':
    case 'mdx':
      return <SiMarkdown className="h-4 w-4 text-gray-500" />;
    
    // JSON
    case 'json':
      return <FileJsonIcon className="h-4 w-4 text-yellow-600" />;
    
    // YAML
    case 'yml':
    case 'yaml':
      return <FileCodeIcon className="h-4 w-4 text-gray-500" />;
  }

  // Special files
  if (fileName === 'dockerfile') {
    return <SiDocker className="h-4 w-4 text-blue-500" />;
  }
  if (fileName === '.gitignore' || fileName.endsWith('.git')) {
    return <SiGit className="h-4 w-4 text-orange-600" />;
  }

  // Directory
  if (!extension || extension === filePath) {
    return <FolderIcon className="h-4 w-4 text-yellow-400" />;
  }

  // Default file icon
  return <FileIcon className="h-4 w-4 text-gray-400" />;
};

// Add this new component for file viewing
const FileViewer = ({ file, onClose }: { file: RepositoryFile; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {getFileIcon(file.metadata.path)}
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {file.metadata.path}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {file.metadata.type === 'directory' ? (
            <div className="text-gray-500 dark:text-gray-400">
              This is a directory
            </div>
          ) : (
            <pre className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
              <code className="text-gray-900 dark:text-gray-100">
                {file.metadata.last_commit_message || 'No content available'}
              </code>
            </pre>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex gap-4">
            <span>Size: {file.metadata.size ? formatFileSize(file.metadata.size) : 'Unknown'}</span>
            <span>Last updated: {file.metadata.last_updated ? new Date(file.metadata.last_updated).toLocaleString() : 'Never'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type SortColumn = 'path' | 'language' | 'size' | 'last_updated';
type SortDirection = 'asc' | 'desc';

// Add this new component for the not connected state
const NotConnectedState = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <Github className="h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
          Connect to GitHub
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 max-w-md">
          To view your codebase, you'll need to connect your GitHub account and select a repository.
        </p>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button
          onClick={() => navigate('/settings/github')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2b2f44] hover:bg-[#363b52] text-gray-200 rounded-lg transition-colors duration-200"
        >
          <Settings className="h-5 w-5" />
          Configure GitHub Settings
        </button>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="text-center">You'll need to:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Add your GitHub Personal Access Token</li>
            <li>Select a repository to analyze</li>
            <li>Wait for the initial sync to complete</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

interface SyncMetrics extends DocumentData {
  id?: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  stats: {
    new: number;
    updated: number;
    unchanged: number;
    deleted: number;
    restored: number;
  };
  totals: {
    active_files: number;
    deleted_files: number;
    total_files: number;
  };
}

export const CodebaseMetrics = ({ repoId }: { repoId: string }) => {
  const [metrics, setMetrics] = useState<SyncMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const metricsRef = collection(db, 'repositories', repoId, 'metrics');
        const metricsQuery = query(metricsRef, orderBy('timestamp', 'desc'), limit(10));
        const querySnapshot = await getDocs(metricsQuery);
        
        const metricsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SyncMetrics[];
        
        // Validate the data structure
        const validMetrics = metricsData.filter(metric => 
          metric.timestamp && 
          metric.stats && 
          metric.totals
        );
        
        setMetrics(validMetrics);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [repoId]);

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  const getDateFromTimestamp = (timestamp: { seconds: number; nanoseconds: number }) => {
    return new Date(timestamp.seconds * 1000);
  };

  return (
    <div className="space-y-6">
      {/* Latest Sync Stats */}
      <div className="grid grid-cols-5 gap-4">
        {metrics[0]?.stats && Object.entries(metrics[0].stats).map(([key, value]) => (
          <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {key}
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {value.toString()}
            </div>
          </div>
        ))}
      </div>

      {/* Historical Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Sync History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...metrics].reverse()}>
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(timestamp) => 
                  getDateFromTimestamp(timestamp).toLocaleDateString()
                } 
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(timestamp) => 
                  getDateFromTimestamp(timestamp).toLocaleString()
                }
              />
              <Legend />
              <Bar dataKey="stats.new" name="New" fill="#4CAF50" />
              <Bar dataKey="stats.updated" name="Updated" fill="#2196F3" />
              <Bar dataKey="stats.deleted" name="Deleted" fill="#F44336" />
              <Bar dataKey="stats.restored" name="Restored" fill="#FF9800" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* File Status Summary */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Current Status</h3>
        <div className="grid grid-cols-3 gap-4">
          {metrics[0]?.totals && Object.entries(metrics[0].totals).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {key.replace('_', ' ')}
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {value.toString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function CodebaseViewer() {
  const { user } = useAuth();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('path');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [syncStatus, setSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'completed' | 'failed';
    lastSynced?: Date;
    error?: string;
  }>({ status: 'idle' });
  const [githubStatus, setGithubStatus] = useState<{
    isConnected: boolean;
    lastSynced?: Date;
    error?: string;
  }>({ isConnected: false });

  // Add debug logging
  useEffect(() => {
    console.log('CodebaseViewer - Account state:', {
      isLoading: accountLoading,
      currentAccount,
      githubRepo: currentAccount?.settings?.githubRepository
    });
  }, [accountLoading, currentAccount]);

  useEffect(() => {
    const fetchRepo = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        console.log('No GitHub repository configured');
        return;
      }

      const repoPath = currentAccount.settings.githubRepository.replace('/', '_');
      console.log('Fetching repository with path:', repoPath);

      try {
        const repoRef = doc(db, 'repositories', repoPath);
        const repoDoc = await getDoc(repoRef);
        
        console.log('Repository document exists:', repoDoc.exists());
        if (repoDoc.exists()) {
          console.log('Repository data:', repoDoc.data());
        }

        if (!repoDoc.exists()) {
          setError('Repository not found');
          return;
        }

        // Check if this repository belongs to the current account
        const repoData = repoDoc.data();
        if (repoData.accountId && repoData.accountId !== currentAccount.id) {
          setError('You do not have access to this repository');
          return;
        }

        // Fetch files from the repository
        const filesCollectionRef = collection(repoRef, 'files');
        const filesSnapshot = await getDocs(filesCollectionRef);

        if (filesSnapshot.empty) {
          setError('No files found. Please sync the repository first.');
          return;
        }

        const fetchedFiles = filesSnapshot.docs.map(doc => ({
          metadata: {
            ...doc.data(),
            path: doc.id
          },
          updated_at: new Date().toISOString()
        })) as RepositoryFile[];

        console.log('Files found:', fetchedFiles);
        setFiles(fetchedFiles);

      } catch (error) {
        console.error('Error fetching repository with detailed info:', {
          repoPath,
          error,
          accountId: currentAccount.id,
          userId: user?.uid
        });
        setError(error instanceof Error ? error.message : 'Failed to fetch repository');
      } finally {
        setLoading(false);
      }
    };

    fetchRepo();
  }, [currentAccount]);

  // Monitor repository sync status
  useEffect(() => {
    if (!currentAccount?.settings?.githubRepository || !user?.uid) return;

    const repoId = currentAccount.settings.githubRepository.replace('/', '_');
    const unsubscribe = onSnapshot(
      doc(db, 'repositories', repoId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSyncStatus({
            status: data.metadata.sync_status,
            lastSynced: data.metadata.last_synced?.toDate(),
            error: data.metadata.error
          });
        }
      }
    );

    return () => unsubscribe();
  }, [currentAccount?.settings?.githubRepository, user]);

  // Handle manual sync
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedFiles = (files: RepositoryFile[]) => {
    return [...files].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'path':
          return multiplier * a.metadata.path.localeCompare(b.metadata.path);
        
        case 'language':
          return multiplier * (a.metadata.language || '').localeCompare(b.metadata.language || '');
        
        case 'size':
          return multiplier * (a.metadata.size - b.metadata.size);
        
        case 'last_updated':
          const dateA = new Date(a.metadata.last_updated).getTime();
          const dateB = new Date(b.metadata.last_updated).getTime();
          return multiplier * (dateA - dateB);
        
        default:
          return 0;
      }
    });
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <span className="text-gray-400 ml-2">↕</span>
      );
    }
    return (
      <span className="text-gray-900 dark:text-white ml-2">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Get sorted and filtered files
  const sortedAndFilteredFiles = getSortedFiles(
    files.filter((file) => 
      file.metadata.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.metadata.language || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const renderHeaderActions = () => {
    if (!githubStatus.isConnected) {
      return (
        <button
          onClick={() => navigate('/settings/github')}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md 
                     hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configure GitHub
        </button>
      );
    }

    return (
      <button
        onClick={handleSync}
        disabled={syncStatus.status === 'syncing'}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {syncStatus.status === 'syncing' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          'Sync Now'
        )}
      </button>
    );
  };

  // Modify the early return for when no repository is selected
  if (!currentAccount?.settings?.githubRepository) {
    return <NotConnectedState />;
  }

  // Modify the loading state to be more informative
  if (accountLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          {accountLoading ? 'Loading account...' : 'Loading repository...'}
        </p>
      </div>
    );
  }

  // Modify the error state to be more helpful
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
            {error}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an error loading your repository.
          </p>
          <button
            onClick={() => navigate('/settings/github')}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            Check GitHub Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <header className="mb-6 px-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Repository: {currentAccount?.settings?.githubRepository}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {syncStatus.status === 'completed' ? (
                <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Last synced: {syncStatus.lastSynced?.toLocaleString() || 'Never'}
                </span>
              ) : syncStatus.status === 'syncing' ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  Not synced
                </span>
              )}
            </div>
          </div>
          
          {renderHeaderActions()}
        </div>
      </header>

      <div className="p-6">
        <div className="mb-6">
          <TextField
            fullWidth
            size="small"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dark:bg-gray-800"
            InputProps={{
              className: 'dark:text-white',
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </InputAdornment>
              ),
            }}
          />
        </div>

        {sortedAndFilteredFiles.length > 0 ? (
          <TableContainer 
            component={Paper} 
            className="bg-white dark:bg-gray-800 shadow-sm"
          >
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-gray-700">
                  <TableCell 
                    className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                    onClick={() => handleSort('path')}
                  >
                    <div className="flex items-center">
                      File Path
                      <SortIcon column="path" />
                    </div>
                  </TableCell>
                  <TableCell 
                    className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                    onClick={() => handleSort('language')}
                  >
                    <div className="flex items-center">
                      Language
                      <SortIcon column="language" />
                    </div>
                  </TableCell>
                  <TableCell 
                    className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                    onClick={() => handleSort('size')}
                  >
                    <div className="flex items-center">
                      Size
                      <SortIcon column="size" />
                    </div>
                  </TableCell>
                  <TableCell 
                    className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                    onClick={() => handleSort('last_updated')}
                  >
                    <div className="flex items-center">
                      Last Updated
                      <SortIcon column="last_updated" />
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                    Last Commit Message
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="dark:bg-gray-800">
                {sortedAndFilteredFiles
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((file) => (
                    <TableRow
                      key={file.metadata.path}
                      onClick={() => setSelectedFile(file)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.metadata.path)}
                          <span className="truncate">{file.metadata.path}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.metadata.path)}
                          {file.metadata.language || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {formatFileSize(file.metadata.size)}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {file.metadata.last_updated ? new Date(file.metadata.last_updated).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <div className="truncate max-w-md">
                          {file.metadata.last_commit_message || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={sortedAndFilteredFiles.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              className="text-gray-900 dark:text-gray-100"
              sx={{
                '.MuiTablePagination-select': {
                  color: 'inherit',
                },
                '.MuiTablePagination-selectIcon': {
                  color: 'inherit',
                },
                '.MuiTablePagination-displayedRows': {
                  color: 'inherit',
                },
                '.MuiIconButton-root': {
                  color: 'inherit',
                },
              }}
            />
          </TableContainer>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-gray-400">
            <XCircle className="w-5 h-5 mb-2" />
            <p className="text-sm">No files found</p>
          </div>
        )}
      </div>

      {/* Add the FileViewer modal */}
      {selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}