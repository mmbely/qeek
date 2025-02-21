import { useEffect, useState, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, doc, getDoc, onSnapshot, orderBy, limit, DocumentData } from 'firebase/firestore';
import { 
  Loader2, 
  XCircle, 
  Search, 
  Github, 
  Settings, 
  AlertTriangle, 
} from 'lucide-react';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Paper, TextField, InputAdornment, FormControl, Select, MenuItem } from '@mui/material';
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
import { FileViewer } from './FileViewer';
import { RepositoryFile } from '../../types/repository';
import { ExpandableCell } from './components/ExpandableCell';
import { FileIcon } from './components/FileIcon';

// Add these interfaces at the top of the file
interface CodeFunction {
  name: string;
  purpose?: string;
  params?: string[];
  returns?: string;
}

interface CodeClass {
  name: string;
  purpose?: string;
  methods?: string[];
  properties?: string[];
}

// Add this helper function at the top of the file, before the component
const safeToString = (value: any): string => {
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) return value.join(' ').toLowerCase();
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
};

// Remove the duplicate formatFileSize function and keep only one at the top level
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (filePath: string) => {
  return <FileIcon filePath={filePath} className="h-4 w-4 text-gray-400" />;
};

type SortColumn = 'path' | 'status' | 'language' | 'size' | 'last_updated' | 'functions' | 'classes' | 'summary';
type SortDirection = 'asc' | 'desc';

// Add status type
type FileStatus = 'active' | 'deleted' | 'all';

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

const columns: { id: string; label: string; minWidth?: number }[] = [
  { id: 'path', label: 'File Path', minWidth: 200 },
  { id: 'status', label: 'Status', minWidth: 100 },
  { id: 'language', label: 'Language', minWidth: 100 },
  { id: 'summary', label: 'Summary', minWidth: 300 },
  { id: 'functions', label: 'Functions', minWidth: 120 },
  { id: 'classes', label: 'Classes', minWidth: 120 },
  { id: 'size', label: 'Size', minWidth: 100 },
  { id: 'last_updated', label: 'Last Updated', minWidth: 160 }
];

// Add a helper function to get the summary
const getFileSummary = (file: RepositoryFile): string => {
  return file.summary || '-';
};

// Update the search function
const searchFile = (file: RepositoryFile, term: string): boolean => {
  const searchTerm = term.toLowerCase();
  
  // Basic field search
  if (
    safeToString(file.path).includes(searchTerm) ||
    safeToString(file.language).includes(searchTerm) ||
    safeToString(file.summary).includes(searchTerm) ||
    safeToString(file.last_commit_message).includes(searchTerm)
  ) {
    return true;
  }

  // Search in functions
  if (file.functions?.some((func: CodeFunction) => 
    safeToString(func.name).includes(searchTerm) || 
    safeToString(func.purpose).includes(searchTerm)
  )) {
    return true;
  }

  // Search in classes
  if (file.classes?.some((cls: CodeClass) => 
    safeToString(cls.name).includes(searchTerm) || 
    safeToString(cls.purpose).includes(searchTerm)
  )) {
    return true;
  }

  // Search in imports/exports
  if (
    file.imports?.some(imp => safeToString(imp).includes(searchTerm)) ||
    file.exports?.some(exp => safeToString(exp).includes(searchTerm))
  ) {
    return true;
  }

  return false;
};

export default function CodebaseViewer() {
  const { user } = useAuth();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const navigate = useNavigate();
  const { repoName, filePath } = useParams();
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
  const [filterStatus, setFilterStatus] = useState<FileStatus>('all');

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

        const fetchedFiles = filesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            content: data.content || '',
            sha: data.sha || '',
            type: data.type || '',
            classes: data.classes || [],
            exports: data.exports || [],
            first_indexed_at: data.first_indexed_at,
            functions: data.functions || [],
            imports: data.imports || [],
            language: data.language || '',
            last_commit_message: data.last_commit_message || '',
            last_updated: data.last_updated || '',
            metadata: {
              content_type: data.metadata?.content_type || '',
              sha: data.metadata?.sha || '',
              type: data.metadata?.type || ''
            },
            name: data.name || '',
            path: data.path || '',
            size: data.size || 0,
            summary: data.summary || '',
            status: data.status || 'active',
            updated_at: data.updated_at || new Date().toISOString()
          } as RepositoryFile;
        });

        console.log('Files found:', fetchedFiles);
        setFiles(fetchedFiles);

      } catch (error) {
        console.error('Error fetching repository:', error);
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

  // Add this effect to reset page when search results change
  useEffect(() => {
    setPage(0); // Reset to first page when search/filter changes
  }, [searchTerm, filterStatus]);

  // Update the pagination handling
  const handleChangePage = (event: unknown, newPage: number) => {
    // Ensure page is within bounds
    const maxPage = Math.max(0, Math.ceil(sortedAndFilteredFiles.length / rowsPerPage) - 1);
    setPage(Math.min(newPage, maxPage));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
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

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <span className="text-gray-400 dark:text-gray-500 ml-2">↕</span>
      );
    }
    return (
      <span className="text-gray-900 dark:text-gray-100 ml-2">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Update the search and filter section
  const renderSearchAndFilters = () => (
    <div className="px-6">
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <TextField
            fullWidth
            size="small"
            placeholder="Search files, functions, or classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dark:bg-gray-800"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              },
              '& .MuiInputBase-input': {
                color: 'inherit',
              },
            }}
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
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FileStatus)}
            className="dark:bg-gray-800 dark:text-white"
            MenuProps={{
              PaperProps: {
                className: 'dark:bg-gray-800',
                sx: {
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  },
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <MenuItem value="all" className="dark:text-gray-200">All Files</MenuItem>
            <MenuItem value="active" className="dark:text-gray-200">Active Files</MenuItem>
            <MenuItem value="deleted" className="dark:text-gray-200">Deleted Files</MenuItem>
          </Select>
        </FormControl>
      </div>
    </div>
  );

  // Update the filtering logic to log results
  const sortedAndFilteredFiles = useMemo(() => {
    // First filter the files
    const filtered = files.filter((file) => {
      const matchesSearch = searchTerm ? searchFile(file, searchTerm) : true;
      const matchesStatus = filterStatus === 'all' ? true : (file.status || 'active') === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Then sort the filtered files
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case 'path':
          return multiplier * a.path.localeCompare(b.path);
        
        case 'status':
          return multiplier * (a.status || 'active').localeCompare(b.status || 'active');
        
        case 'language':
          return multiplier * (a.language || '').localeCompare(b.language || '');
        
        case 'size':
          return multiplier * (a.size - b.size);
        
        case 'last_updated':
          const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
          const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
          return multiplier * (dateA - dateB);
        
        case 'functions':
          return multiplier * ((a.functions?.length || 0) - (b.functions?.length || 0));
        
        case 'classes':
          return multiplier * ((a.classes?.length || 0) - (b.classes?.length || 0));
        
        case 'summary':
          return multiplier * ((a.summary || '').localeCompare(b.summary || ''));
        
        default:
          return 0;
      }
    });
  }, [files, searchTerm, filterStatus, sortColumn, sortDirection]);

  // Update the header section to include the search bar
  const renderHeader = () => (
    <header className="mb-6 px-6 pt-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Codebase</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentAccount?.settings?.githubRepository || 'No repository selected'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncStatus.error ? (
            <button
              onClick={() => navigate('/settings/github')}
              className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 
                         hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              title={syncStatus.error}
            >
              <AlertTriangle className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSync}
              disabled={loading || syncStatus.status === 'syncing'}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                         disabled:bg-gray-300 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         disabled:cursor-not-allowed transition-colors duration-150"
            >
              {loading || syncStatus.status === 'syncing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Syncing...
                </>
              ) : (
                'Sync Now'
              )}
            </button>
          )}
          <button
            onClick={() => navigate('/settings/github')}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-md transition-colors"
            title="GitHub Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );

  // Handle file selection
  const handleFileSelect = (file: RepositoryFile) => {
    setSelectedFile(file);
    // Update URL with the file path
    navigate(`/repository/${repoName}/file/${encodeURIComponent(file.path)}`);
  };

  // Load file from URL on mount
  useEffect(() => {
    if (filePath && !selectedFile) {
      const decodedPath = decodeURIComponent(filePath);
      const file = files.find(f => f.path === decodedPath);
      if (file) {
        setSelectedFile(file);
      }
    }
  }, [filePath, files, selectedFile]);

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
      {renderHeader()}
      <div className="px-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <TextField
              fullWidth
              size="small"
              placeholder="Search files, functions, or classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dark:bg-gray-800"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'inherit',
                },
              }}
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FileStatus)}
              className="dark:bg-gray-800 dark:text-white"
              MenuProps={{
                PaperProps: {
                  className: 'dark:bg-gray-800',
                  sx: {
                    '& .MuiMenuItem-root': {
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      },
                    },
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              <MenuItem value="all" className="dark:text-gray-200">All Files</MenuItem>
              <MenuItem value="active" className="dark:text-gray-200">Active Files</MenuItem>
              <MenuItem value="deleted" className="dark:text-gray-200">Deleted Files</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      <div className="flex-1 px-6 mt-4">
        {sortedAndFilteredFiles.length > 0 ? (
          <TableContainer 
            component={Paper} 
            className="bg-white dark:bg-gray-800 shadow-sm"
            sx={{ 
              height: 'calc(100vh - 220px)',
              '& .MuiPaper-root': {
                backgroundColor: 'inherit',
              },
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow className="bg-gray-50 dark:bg-gray-700">
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className="cursor-pointer"
                      sx={{
                        '&.MuiTableCell-head': {
                          backgroundColor: 'inherit',
                          color: 'inherit',
                          borderBottom: '1px solid var(--border-color)',
                        },
                      }}
                      onClick={() => handleSort(column.id as SortColumn)}
                    >
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        {column.label}
                        <SortIcon column={column.id as SortColumn} />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody className="dark:bg-gray-800">
                {sortedAndFilteredFiles
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((file) => (
                    <TableRow
                      key={file.path}
                      onClick={() => handleFileSelect(file)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.path)}
                          <span className="truncate">{file.path}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          (file.status || 'active') === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {file.status || 'active'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {file.language || '-'}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <div className="max-w-lg">
                          <p className="truncate text-sm">
                            {getFileSummary(file)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 max-w-[200px]">
                        <ExpandableCell items={file.functions} />
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 max-w-[200px]">
                        <ExpandableCell items={file.classes} />
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {file.last_updated ? new Date(file.last_updated).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={sortedAndFilteredFiles.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              className="text-gray-900 dark:text-gray-100"
              sx={{
                '.MuiTablePagination-select': {
                  color: 'inherit'
                },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  color: 'inherit'
                }
              }}
            />
          </TableContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] text-gray-400">
            <XCircle className="w-5 h-5 mb-2" />
            <p className="text-sm">No files found</p>
          </div>
        )}
      </div>

      {/* FileViewer modal */}
      {selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={() => {
            setSelectedFile(null);
            // Remove file path from URL when closing
            navigate(`/repository/${repoName}`);
          }}
        />
      )}
    </div>
  );
}