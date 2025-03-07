import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, Component, Copy, GitPullRequest, Download, Clock } from 'lucide-react';
import { generateComponentMetadata } from '../../../utils/generateComponentMetadata';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RepositoryFile } from '../../../types/repository';
import { getRepositoryFile } from '../../../services/github';
import { Dialog } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { diffJson } from 'diff';
import { Octokit } from '@octokit/rest';
import type { OctokitResponse } from '@octokit/types';

// We'll use our own SimpleTabs implementation since ui/tabs is not available
interface SimpleTabsProps {
  defaultValue: string;
  children: React.ReactNode;
}

interface TabProps {
  value: string;
  label: string;
  children: React.ReactNode;
}

// Simple tab implementation
const SimpleTabs = ({ defaultValue, children, onValueChange }: SimpleTabsProps & { onValueChange?: (value: string) => void }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (onValueChange) {
      onValueChange(value);
    }
  };
  
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return (
              <button
                className={`px-4 py-2 rounded-md ${
                  activeTab === child.props.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
                onClick={() => handleTabChange(child.props.value)}
              >
                {child.props.label}
              </button>
            );
          }
          return null;
        })}
      </div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && activeTab === child.props.value ? child : null
      )}
    </div>
  );
};

const Tab = ({ value, label, children }: TabProps) => {
  return <div>{children}</div>;
};

interface ComponentMetadataToolProps {
  files: RepositoryFile[];
}

const ComponentsJsonTool = ({ files }: ComponentMetadataToolProps) => {
  const [existingComponents, setExistingComponents] = useState<any>(null);
  const [generatedComponents, setGeneratedComponents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('existing');
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [hasDifferences, setHasDifferences] = useState(false);
  const [diffResult, setDiffResult] = useState<any[]>([]);

  // Check for existing components.json file
  useEffect(() => {
    const checkExistingFile = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        setCheckingExisting(false);
        return;
      }

      try {
        console.log("Checking for existing components.json file...");
        
        // Get repository ID for Firestore
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        console.log("Repository ID:", repoId);
        
        // Try direct GitHub raw URL first (most reliable method)
        try {
          console.log("Trying direct GitHub raw URL...");
          const rawUrl = `https://raw.githubusercontent.com/${currentAccount.settings.githubRepository}/main/.cursor/components.json`;
          console.log(`Fetching from URL: ${rawUrl}`);
          
          const response = await fetch(rawUrl);
          if (response.ok) {
            const jsonData = await response.json();
            console.log("Successfully fetched components.json from GitHub raw URL");
            setExistingComponents(jsonData);
            setActiveTab('existing');
            return; // Exit early if successful
          } else {
            console.error("Failed to fetch from GitHub raw URL:", response.statusText);
          }
        } catch (fetchError) {
          console.error("Error fetching from GitHub raw URL:", fetchError);
        }
        
        // If direct fetch fails, try Firestore
        try {
          console.log("Trying direct Firestore query...");
          const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_components.json');
          const docSnapshot = await getDoc(fileRef);
          
          if (docSnapshot.exists()) {
            console.log("Found file in Firestore!");
            const data = docSnapshot.data();
            console.log("File data:", data);
            
            // Try to extract the SHA from metadata
            const sha = data.metadata?.sha;
            if (sha) {
              console.log(`Found SHA: ${sha}, trying to fetch content from GitHub`);
              
              // Use GitHub's blob API to get the content using the SHA
              try {
                const blobUrl = `https://api.github.com/repos/${currentAccount.settings.githubRepository}/git/blobs/${sha}`;
                console.log(`Fetching blob from: ${blobUrl}`);
                
                const response = await fetch(blobUrl);
                if (response.ok) {
                  const blobData = await response.json();
                  if (blobData.content) {
                    // Decode base64 content
                    const decodedContent = atob(blobData.content.replace(/\n/g, ''));
                    try {
                      const parsedContent = JSON.parse(decodedContent);
                      console.log("Successfully parsed content from GitHub blob");
                      setExistingComponents(parsedContent);
                      setActiveTab('existing');
                      return; // Exit early if successful
                    } catch (parseError) {
                      console.error("Error parsing blob content:", parseError);
                    }
                  }
                }
              } catch (blobError) {
                console.error("Error fetching blob:", blobError);
              }
            }
            
            // If we still don't have metadata, use the document data itself
            console.log("Using document data as fallback");
            
            // Check if the document has a 'components' field
            if (data.components) {
              console.log("Found 'components' field in document");
              setExistingComponents(data);
              setActiveTab('existing');
            } else {
              // As a last resort, try to fetch the file content using the path
              try {
                console.log(`Trying to fetch file content using path: ${data.path}`);
                const fileContent = await fetch(`https://raw.githubusercontent.com/${currentAccount.settings.githubRepository}/main/${data.path}`);
                if (fileContent.ok) {
                  const jsonData = await fileContent.json();
                  console.log("Successfully fetched file content");
                  setExistingComponents(jsonData);
                  setActiveTab('existing');
                } else {
                  console.error("Failed to fetch file content:", fileContent.statusText);
                  setError("Could not fetch components.json content");
                }
              } catch (contentError) {
                console.error("Error fetching file content:", contentError);
                setError("Error fetching components.json");
              }
            }
          } else {
            console.log("Document not found in Firestore");
            setError("Components.json file not found");
          }
        } catch (firestoreError) {
          console.error("Error querying Firestore:", firestoreError);
          setError("Error accessing database");
        }
      } catch (error) {
        console.error("Error checking for components.json:", error);
        setError("Unexpected error occurred");
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingFile();
  }, [currentAccount, db]);

  const handleGenerateComponents = async () => {
    setLoading(true);
    setError(null);
    setPushSuccess(false);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      const components = await generateComponentMetadata(
        files,
        currentAccount.settings.githubRepository
      );
      setGeneratedComponents(components);
      setActiveTab('generated');
    } catch (error) {
      console.error('Failed to generate components.json:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to get GitHub token for an account
  const getGithubToken = async (accountId: string): Promise<string | null> => {
    try {
      const tokenDoc = await getDoc(doc(db, 'secure_tokens', accountId));
      return tokenDoc.exists() ? tokenDoc.data()?.githubToken : null;
    } catch (error) {
      console.error('Error retrieving GitHub token:', error);
      return null;
    }
  };

  const handlePushToGitHub = async () => {
    if (!generatedComponents || !currentAccount?.settings?.githubRepository || !currentAccount?.id) {
      setPushError('Missing repository information or account ID');
      return;
    }

    setPushLoading(true);
    setPushError(null);
    setPushSuccess(false);
    
    try {
      const [owner, repo] = currentAccount.settings.githubRepository.split('/');
      const filePath = '.cursor/components.json';
      const content = JSON.stringify(generatedComponents, null, 2);
      const commitMessage = 'Update components.json via Qeek';
      
      // Get GitHub token from secure_tokens collection
      const githubToken = await getGithubToken(currentAccount.id);
      
      if (!githubToken) {
        throw new Error('GitHub token not found. Please reconnect your GitHub account in Settings.');
      }
      
      // Initialize Octokit with the token
      const octokit = new Octokit({ auth: githubToken });
      
      console.log(`Pushing to GitHub: ${owner}/${repo}, path: ${filePath}`);
      
      // First, try to get the file to check if it exists and get its SHA
      let fileSha: string | undefined;
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
        });
        
        // Check if fileData is a file (not a directory) and has a sha
        if (!Array.isArray(fileData) && 'sha' in fileData) {
          fileSha = fileData.sha;
          console.log(`Existing file found with SHA: ${fileSha}`);
        }
      } catch (error) {
        console.log('File does not exist yet, will create it');
      }
      
      // Create or update the file
      try {
        // Use browser's btoa function instead of Buffer for base64 encoding
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        const response = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: commitMessage,
          content: base64Content,
          sha: fileSha, // Include SHA if updating, omit if creating
        });
        
        console.log('GitHub API response:', response);
        
        // Also update in Firestore for immediate local access
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_components.json');
        
        await setDoc(fileRef, {
          path: filePath,
          content: content,
          metadata: {
            sha: response.data.content?.sha || 'unknown',
            lastUpdated: new Date().toISOString()
          }
        });
        
        setPushSuccess(true);
        setExistingComponents(generatedComponents);
        setShowPushDialog(false);
      } catch (apiError: any) {
        console.error('GitHub API error:', apiError);
        throw new Error(apiError.message || 'Failed to push to GitHub');
      }
    } catch (error) {
      console.error('Failed to push to GitHub:', error);
      setPushError(error instanceof Error ? error.message : 'Failed to push to GitHub');
    } finally {
      setPushLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate diff when both components are available and compare tab is active
  useEffect(() => {
    if (existingComponents && generatedComponents && activeTab === 'compare') {
      console.log("Generating diff between existing and generated components.json");
      
      try {
        // Generate diff using properly formatted JSON strings
        const existingStr = JSON.stringify(existingComponents, null, 2);
        const generatedStr = JSON.stringify(generatedComponents, null, 2);
        
        const differences = diffJson(existingStr, generatedStr);
        
        // Check if there are differences
        const hasChanges = differences.some(part => part.added || part.removed);
        setHasDifferences(hasChanges);
        setDiffResult(differences);
        
        console.log("Diff generated:", differences.length, "parts, has changes:", hasChanges);
      } catch (error) {
        console.error("Error generating diff:", error);
        setHasDifferences(false);
      }
    }
  }, [existingComponents, generatedComponents, activeTab]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Components JSON
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate and manage your components.json file
          </p>
        </div>
        
        {/* Action buttons moved to top right */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateComponents}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate components.json
              </>
            )}
          </button>
          
          {generatedComponents && (
            <button
              onClick={() => setShowPushDialog(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                       flex items-center gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              Push to GitHub
            </button>
          )}
          
          {(existingComponents || generatedComponents) && (
            <button
              onClick={() => downloadJson(generatedComponents || existingComponents, 'components.json')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                       rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </button>
          )}
        </div>
      </div>

      {/* GitHub not connected message */}
      {!currentAccount?.settings?.githubRepository && !checkingExisting && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              GitHub Repository Not Connected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your GitHub repository in settings to use this feature.
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {checkingExisting && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Checking for existing metadata...
            </h3>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Push success message */}
      {pushSuccess && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Successfully pushed components.json to GitHub
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Push error message */}
      {pushError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {pushError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {!checkingExisting && !error && currentAccount?.settings?.githubRepository && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          {/* No metadata found state */}
          {!existingComponents && !generatedComponents && (
            <div className="text-center py-8">
              <Component className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Component Metadata Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Generate component metadata to document your UI components.
              </p>
            </div>
          )}

          {/* Metadata content */}
          {(existingComponents || generatedComponents) && (
            <SimpleTabs defaultValue={activeTab} onValueChange={setActiveTab}>
              {existingComponents && (
                <Tab value="existing" label="Existing components.json">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Existing components.json
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(existingComponents, null, 2))}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {JSON.stringify(existingComponents, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Tab>
              )}
              
              {generatedComponents && (
                <Tab value="generated" label="Generated components.json">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Generated components.json
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(generatedComponents, null, 2))}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {JSON.stringify(generatedComponents, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Tab>
              )}
              
              {existingComponents && generatedComponents && (
                <Tab value="compare" label="Compare Changes">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 p-4">
                        Compare Metadata
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        {hasDifferences ? (
                          <span className="text-sm text-red-500 dark:text-red-400 font-medium">
                            Differences found between files
                          </span>
                        ) : (
                          <span className="text-sm text-green-500 dark:text-green-400 font-medium">
                            No differences found between files
                          </span>
                        )}
                      </div>
                      
                      {/* Diff visualization */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
                        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          {hasDifferences ? 'Differences' : 'Content'}
                        </h4>
                        <div className="text-xs overflow-auto max-h-[600px]">
                          <pre className="font-mono whitespace-pre-wrap" style={{ margin: 0 }}>
                            {diffResult.map((part, index) => (
                              <span 
                                key={index} 
                                className={
                                  part.added 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : part.removed 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                      : 'text-gray-800 dark:text-gray-300'
                                }
                              >
                                {part.value}
                              </span>
                            ))}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab>
              )}
            </SimpleTabs>
          )}
        </div>
      )}

      {/* Push to GitHub confirmation dialog */}
      {showPushDialog && (
        <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Push to GitHub
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will update the components.json file in your GitHub repository. Are you sure you want to continue?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPushDialog(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                           rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePushToGitHub}
                  disabled={pushLoading}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {pushLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="h-4 w-4" />
                      Push
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default ComponentsJsonTool;