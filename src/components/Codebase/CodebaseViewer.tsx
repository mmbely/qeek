import { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, FolderIcon, XCircle, Search, FileIcon, FileTextIcon, FileCodeIcon, FileJsonIcon, ImageIcon, FileTypeIcon, PackageIcon, Settings2Icon, DatabaseIcon, LockIcon, Github, Settings, AlertTriangle } from 'lucide-react';
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

interface RepositoryFile {
  path: string;
  content?: string;
  type?: 'file' | 'directory';
  [key: string]: any;
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
            {getFileIcon(file.path)}
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {file.path}
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
          {file.type === 'directory' ? (
            <div className="text-gray-500 dark:text-gray-400">
              This is a directory
            </div>
          ) : (
            <pre className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
              <code className="text-gray-900 dark:text-gray-100">
                {file.content || 'No content available'}
              </code>
            </pre>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex gap-4">
            <span>Size: {file.size || 'Unknown'}</span>
            <span>Last indexed: {formatDate(file.indexed_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type SortColumn = 'path' | 'type' | 'size' | 'indexed_at';
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
          path: doc.id,
          ...doc.data()
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
          return multiplier * a.path.localeCompare(b.path);
        
        case 'type':
          return multiplier * ((a.type || 'file').localeCompare(b.type || 'file'));
        
        case 'size':
          const sizeA = a.size ? parseInt(a.size.toString()) : 0;
          const sizeB = b.size ? parseInt(b.size.toString()) : 0;
          return multiplier * (sizeA - sizeB);
        
        case 'indexed_at':
          const dateA = a.indexed_at ? new Date(a.indexed_at).getTime() : 0;
          const dateB = b.indexed_at ? new Date(b.indexed_at).getTime() : 0;
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
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
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
              {!githubStatus.isConnected ? (
                <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  GitHub connection is not active
                </span>
              ) : (
                <>
                  <span>
                    Last synced: {syncStatus.lastSynced?.toLocaleString() || 'Never'}
                  </span>
                  {syncStatus.status === 'syncing' && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Syncing...
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          
          {renderHeaderActions()}
        </div>

        {!githubStatus.isConnected && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 
                        dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {githubStatus.error || 'GitHub connection is not available'}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                  Showing cached files from last sync: {githubStatus.lastSynced 
                    ? formatDate(githubStatus.lastSynced) 
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}
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
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      <SortIcon column="type" />
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
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                    Preview
                  </TableCell>
                  <TableCell 
                    className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                    onClick={() => handleSort('indexed_at')}
                  >
                    <div className="flex items-center">
                      Indexed At
                      <SortIcon column="indexed_at" />
                    </div>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="dark:bg-gray-800">
                {sortedAndFilteredFiles
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((file) => (
                    <TableRow
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.path)}
                          <span className="truncate">{file.path}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {file.type || 'file'}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                        {file.size || '-'}
                      </TableCell>
                      <TableCell 
                        className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 max-w-md"
                      >
                        <div className="truncate font-mono text-sm">
                          {getContentPreview(file.content)}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 border-b dark:border-gray-600">
                        {formatDate(file.indexed_at)}
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