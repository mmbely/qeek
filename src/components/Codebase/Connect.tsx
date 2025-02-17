import React, { useState, useEffect, useMemo } from 'react';
import { Github, ChevronDown, Loader2, Settings, Search } from "lucide-react";
import { theme, commonStyles } from '../../styles/theme';
import { 
  validateToken, 
  storeGithubToken,
  fetchUserRepositories,
  getToken,
  type GitHubRepo
} from '../../services/github';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { syncRepository } from '../../services/api';
import { useCodebase } from '../../context/CodebaseContext';
import { useNavigate } from 'react-router-dom';

// Define the status type as a const array
const SYNC_STATUSES = ['idle', 'syncing', 'completed', 'failed'] as const;
type SyncStatusType = typeof SYNC_STATUSES[number];

// Add interface for the Python script response
interface SyncResponse {
  message: string;
  data: {
    status: string;
    repository: {
      name: string;
      full_name: string;
      description: string | null;
      default_branch: string;
    };
  };
}

interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  lastSynced?: Date;
  fileCount?: number;
  filesProcessed?: number;
  error?: string;
  repositoryDetails?: {
    name: string;
    description: string | null;
    default_branch: string;
  };
}

export default function Connect() {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });
  const { setSelectedRepository } = useCodebase();
  const navigate = useNavigate();

  useEffect(() => {
    const checkConnection = async () => {
      if (!currentAccount?.id) return;
      
      try {
        const savedToken = await getToken(currentAccount.id);
        if (savedToken) {
          const isValid = await validateToken(savedToken);
          if (isValid) {
            setIsConnected(true);
            const repos = await fetchUserRepositories(currentAccount.id);
            setRepositories(repos);
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err);
        setError('Failed to check GitHub connection');
      }
    };

    checkConnection();
  }, [currentAccount]);

  // Filter repositories based on search query
  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo => 
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [repositories, searchQuery]);

  // Listen to sync status updates
  useEffect(() => {
    if (selectedRepo && user?.uid) {
      const repoId = selectedRepo.full_name.replace('/', '_');
      const unsubscribe = onSnapshot(
        doc(db, 'repositories', repoId),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setSyncStatus({
              status: data.metadata.sync_status,
              lastSynced: data.metadata.last_synced?.toDate(),
              fileCount: data.metadata.file_count,
              filesProcessed: data.metadata.files_processed,
              error: data.metadata.error
            });
          }
        }
      );

      return () => unsubscribe();
    }
  }, [selectedRepo, user]);

  const handleRetrieveRepository = async () => {
    if (!selectedRepo || !user?.uid) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log('Starting repository sync...', {
        repo: selectedRepo.full_name,
        userId: user.uid
      });

      // Update UI to show syncing state
      setSyncStatus({ status: 'syncing' });

      const response = await fetch('http://localhost:3001/api/repository/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryName: selectedRepo.full_name,
          userId: user.uid
        }),
      });

      console.log('Response received:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start repository sync');
      }

      const data: SyncResponse = await response.json();
      console.log('Sync response:', data);

      if (data.data.status === 'success') {
        setSyncStatus({
          status: 'completed',
          lastSynced: new Date(),
          repositoryDetails: data.data.repository
        });
      } else {
        throw new Error('Repository sync failed');
      }

    } catch (err) {
      console.error('Error starting repository sync:', err);
      setError('Failed to start repository sync. Please try again.');
      setSyncStatus({ 
        status: 'failed', 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepositorySelect = (repoName: string) => {
    setSelectedRepository(repoName);
    navigate(`/codebase/files/${repoName}`);
  };

  const renderSyncStatus = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Syncing repository...</span>
              {syncStatus.filesProcessed && (
                <span className="text-sm">({syncStatus.filesProcessed} files processed)</span>
              )}
            </div>
            {/* Add restart button if sync takes too long */}
            <button
              onClick={handleRetrieveRepository}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline mt-2"
            >
              Restart Sync
            </button>
          </div>
        );
      case 'completed':
        return (
          <div className="space-y-2">
            <div className="text-green-500 dark:text-green-400">
              <p className="flex items-center gap-2 mb-2">
                <span className="text-lg">✓</span>
                Sync completed
              </p>
              {syncStatus.repositoryDetails && (
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Repository Details
                  </h4>
                  <dl className="space-y-1">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Full Name</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">
                        {syncStatus.repositoryDetails.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Default Branch</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">
                        {syncStatus.repositoryDetails.default_branch}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Last Synced</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">
                        {syncStatus.lastSynced?.toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        );
      case 'failed':
        return (
          <div className="text-red-500">
            <p className="flex items-center gap-2">
              <span>❌</span>
              Sync failed
            </p>
            {syncStatus.error && (
              <p className="text-sm mt-1">{syncStatus.error}</p>
            )}
            <button 
              onClick={handleRetrieveRepository}
              className="text-sm underline mt-2"
            >
              Try again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Helper function to check status
  const isStatus = (status: SyncStatusType, checkStatus: SyncStatusType): boolean => {
    return status === checkStatus;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 min-h-screen bg-white dark:bg-[#262b3d]">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 min-h-screen bg-white dark:bg-[#262b3d]">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-200">
        Connect to GitHub Repository
      </h1>
      
      <div className="bg-white dark:bg-[#1e2132] border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6 max-w-2xl">
        {!isConnected ? (
          <div className="text-center p-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please connect your GitHub account in Settings first
            </p>
            <a
              href="/settings/github"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2b2f44] hover:bg-[#363b52] text-gray-200 rounded-lg transition-colors duration-200"
            >
              <Settings className="h-5 w-5" />
              Go to Settings
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Repository
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <span>{selectedRepo ? selectedRepo.full_name : 'Choose a repository'}</span>
                  <ChevronDown className="h-5 w-5" />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search repositories..."
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                   bg-gray-50 dark:bg-gray-800 
                                   text-gray-900 dark:text-gray-100
                                   placeholder-gray-500 dark:placeholder-gray-400
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* Repository list */}
                    <div className="max-h-60 overflow-auto">
                      {filteredRepositories.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No repositories found
                        </div>
                      ) : (
                        filteredRepositories.map((repo) => (
                          <button
                            key={repo.id}
                            onClick={() => {
                              setSelectedRepo(repo);
                              setIsDropdownOpen(false);
                              setSearchQuery(''); // Clear search when selecting
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                          >
                            <div className="font-medium">{repo.full_name}</div>
                            {repo.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {repo.description}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Show count when filtering */}
                    {searchQuery && (
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
                        Found {filteredRepositories.length} repositories
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedRepo && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Selected Repository Details
                  </h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-gray-900 dark:text-gray-200">{selectedRepo.full_name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Default Branch</dt>
                      <dd className="text-gray-900 dark:text-gray-200">{selectedRepo.default_branch}</dd>
                    </div>
                    {selectedRepo.description && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Description</dt>
                        <dd className="text-gray-900 dark:text-gray-200">{selectedRepo.description}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {syncStatus.status === 'idle' ? (
                  <button
                    onClick={handleRetrieveRepository}
                    disabled={isLoading}
                    className={`
                      w-full flex items-center justify-center gap-2 px-4 py-2
                      bg-[#2b2f44] hover:bg-[#363b52] disabled:opacity-50
                      text-gray-200
                      rounded-lg transition-colors duration-200
                    `}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Github className="h-5 w-5" />
                    )}
                    {isLoading ? 'Starting Sync...' : 'Retrieve Repository'}
                  </button>
                ) : (
                  <div className="mt-4">
                    {renderSyncStatus()}
                  </div>
                )}

                {error && (
                  <div className="mt-2 text-red-500 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
