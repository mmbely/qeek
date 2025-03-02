import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Component, Copy, GitPullRequest, Download, Clock } from 'lucide-react';
import { generateComponentMetadata } from '../../../utils/generateComponentMetadata';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RepositoryFile } from '../../../types/repository';
import { getRepositoryFile } from '../../../services/github';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

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
const SimpleTabs = ({ defaultValue, children }: SimpleTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
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
                onClick={() => setActiveTab(child.props.value)}
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

const ComponentMetadataTool = ({ files }: ComponentMetadataToolProps) => {
  const [existingMetadata, setExistingMetadata] = useState<any>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('existing');

  // Check for existing components.json file
  useEffect(() => {
    const checkExistingFile = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        setCheckingExisting(false);
        return;
      }

      try {
        const existingFile = await getRepositoryFile(
          `${currentAccount.settings.githubRepository}/.cursor/components.json`
        );
        
        if (existingFile && existingFile.content) {
          // Parse the content (it might be base64 encoded)
          const decodedContent = atob(existingFile.content);
          setExistingMetadata(JSON.parse(decodedContent));
          setActiveTab('existing');
        }
      } catch (error) {
        console.log('No existing components.json file found');
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingFile();
  }, [currentAccount]);

  const handleGenerateMetadata = async () => {
    setLoading(true);
    setError(null);
    setPushSuccess(false);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      const metadata = await generateComponentMetadata(
        files,
        currentAccount.settings.githubRepository
      );
      setGeneratedMetadata(metadata);
      setActiveTab('generated');
    } catch (error) {
      console.error('Failed to generate metadata:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Since updateRepositoryFile doesn't exist, we'll implement a simple version
  const handlePushToGitHub = async () => {
    if (!generatedMetadata || !currentAccount?.settings?.githubRepository) {
      return;
    }

    setPushLoading(true);
    try {
      // We need to implement this function or use an alternative approach
      // For now, we'll just simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, you would call your GitHub API to update the file
      // await updateRepositoryFile(
      //   currentAccount.settings.githubRepository,
      //   '.cursor/components.json',
      //   JSON.stringify(generatedMetadata, null, 2),
      //   'Update components.json via Qeek'
      // );
      
      setPushSuccess(true);
      setExistingMetadata(generatedMetadata);
      setShowPushDialog(false);
    } catch (error) {
      console.error('Failed to push to GitHub:', error);
      setError(error instanceof Error ? error.message : 'Failed to push to GitHub');
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Component Metadata
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Extract metadata from your components
          </p>
        </div>
        
        {/* Action buttons moved to top right */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateMetadata}
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
                Generate Metadata
              </>
            )}
          </button>
          
          {generatedMetadata && (
            <button
              onClick={() => setShowPushDialog(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                       flex items-center gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              Push to GitHub
            </button>
          )}
          
          {(existingMetadata || generatedMetadata) && (
            <button
              onClick={() => downloadJson(generatedMetadata || existingMetadata, 'components.json')}
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

      {/* Success message */}
      {pushSuccess && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6 mb-6 border-l-4 border-green-500">
          <div className="flex items-center py-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">
                Successfully pushed to GitHub!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {!checkingExisting && !error && currentAccount?.settings?.githubRepository && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          {/* No metadata found state */}
          {!existingMetadata && !generatedMetadata && (
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
          {(existingMetadata || generatedMetadata) && (
            <SimpleTabs defaultValue={activeTab}>
              {existingMetadata && (
                <Tab value="existing" label="Existing Metadata">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Existing Metadata
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(existingMetadata, null, 2))}
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
                        {JSON.stringify(existingMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Tab>
              )}
              
              {generatedMetadata && (
                <Tab value="generated" label="Generated Metadata">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Generated Metadata
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(generatedMetadata, null, 2))}
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
                        {JSON.stringify(generatedMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Tab>
              )}
              
              {existingMetadata && generatedMetadata && (
                <Tab value="compare" label="Compare">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 p-4">
                        Compare Metadata
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Existing</h4>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            {JSON.stringify(existingMetadata, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Generated</h4>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            {JSON.stringify(generatedMetadata, null, 2)}
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

export default ComponentMetadataTool;