import React, { useState, useEffect, useMemo } from 'react';
import { Github, CheckCircle, XCircle, Loader2, ChevronDown, Search } from "lucide-react";
import { githubService } from '../../services/github';
import { useAuth } from '../../context/AuthContext';
import { useCodebase } from '../../context/CodebaseContext';
import type { GitHubRepo } from '../../services/github';
import { useAccount } from '../../context/AccountContext';

export default function GitHubSettings() {
  const { user } = useAuth();
  const { selectedRepository, setSelectedRepository } = useCodebase();
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentAccount, updateAccountSettings } = useAccount();
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // Filter repositories based on search query
  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo => 
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [repositories, searchQuery]);

  useEffect(() => {
    const loadGitHubStatus = async () => {
      if (user?.uid) {
        try {
          const savedToken = await githubService.getToken(user.uid);
          if (savedToken) {
            setIsConnected(true);
            // Fetch repositories after confirming connection
            const repos = await githubService.fetchUserRepositories(user.uid);
            setRepositories(repos);
            
            // Get selected repository
            const savedRepo = await githubService.getSelectedRepository(user.uid);
            if (savedRepo) {
              const repo = repos.find(r => r.full_name === savedRepo);
              if (repo) {
                setSelectedRepo(repo);
                setSelectedRepository(repo.full_name);
              }
            }
          }
        } catch (err) {
          console.error('Error loading GitHub status:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadGitHubStatus();
  }, [user, setSelectedRepository]);

  const handleConnect = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      setError(null);

      const isValid = await githubService.validateToken(token);
      
      if (isValid) {
        await githubService.setToken(user.uid, token);
        setIsConnected(true);
        // Fetch repositories after successful connection
        const repos = await githubService.fetchUserRepositories(user.uid);
        setRepositories(repos);
        setToken(''); // Clear input
      } else {
        setError('Invalid GitHub token. Please check and try again.');
      }
    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      await githubService.clearToken(user.uid);
      setIsConnected(false);
      setRepositories([]);
      setSelectedRepository(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError('Failed to disconnect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepositorySelect = async (repo: GitHubRepo) => {
    if (!user?.uid || !currentAccount) return;

    try {
      setSelectedRepo(repo);
      setSelectedRepository(repo.full_name);
      
      // Update account settings with the selected repository
      await updateAccountSettings({
        githubRepository: repo.full_name
      });
      
      // Show success message
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
      
      setIsDropdownOpen(false);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to select repository:', err);
      setError('Failed to select repository. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            GitHub Integration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect your GitHub account to enable repository access
          </p>
        </div>
        <Github className="h-8 w-8 text-gray-400" />
      </div>

      {error && (
        <div className="mb-4 p-4 text-red-500 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
          <XCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-500 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span>Connected to GitHub</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-600 text-sm font-medium"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>To connect your GitHub repository:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)</li>
              <li>Generate a new token with 'repo' scope</li>
              <li>Copy the token and paste it below</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              GitHub Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         dark:bg-gray-700 dark:text-gray-100"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isLoading || !token}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2
              bg-[#2b2f44] hover:bg-[#363b52] disabled:opacity-50
              text-gray-200
              rounded-lg transition-colors duration-200
            `}
          >
            <Github className="h-5 w-5" />
            {isLoading ? 'Connecting...' : 'Connect GitHub Repository'}
          </button>
        </div>
      )}

      {/* Repository Selection UI */}
      {isConnected && repositories.length > 0 && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">
              Select Repository
            </h3>
            {showSavedMessage && (
              <div className="flex items-center text-green-500 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Repository saved
              </div>
            )}
          </div>
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
                        onClick={() => handleRepositorySelect(repo)}
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
      )}
    </div>
  );
}
