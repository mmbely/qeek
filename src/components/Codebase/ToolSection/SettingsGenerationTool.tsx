import { useState } from 'react';
import { RefreshCw, AlertTriangle, Settings, GitPullRequest, Copy, Download } from 'lucide-react';
import { generateSettings } from '../../../utils/generateSettings';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';
import { RepositoryFile } from '../../../types/repository';
import { Dialog } from '../../ui/dialog';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Octokit } from '@octokit/rest';
import { theme } from '../../../styles/theme';
import { Notification } from '../../ui/notification';

interface SettingsGenerationToolProps {
  files: RepositoryFile[];
}

const SettingsGenerationTool = ({ files }: SettingsGenerationToolProps) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();

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
    if (!settings || !currentAccount?.settings?.githubRepository || !currentAccount?.id) {
      setPushError('Missing repository information or account ID');
      return;
    }

    setPushLoading(true);
    setPushError(null);
    setPushSuccess(false);
    
    try {
      const [owner, repo] = currentAccount.settings.githubRepository.split('/');
      const filePath = '.cursor/settings.json';
      const content = JSON.stringify(settings, null, 2);
      const commitMessage = 'Update settings.json via Qeek';
      
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
        
        if (!Array.isArray(fileData) && 'sha' in fileData) {
          fileSha = fileData.sha;
          console.log(`Existing file found with SHA: ${fileSha}`);
        }
      } catch (error) {
        console.log('File does not exist yet, will create it');
      }
      
      // Create or update the file
      try {
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        const response = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: commitMessage,
          content: base64Content,
          sha: fileSha,
        });
        
        console.log('GitHub API response:', response);
        
        // Also update in Firestore for immediate local access
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_settings.json');
        
        await setDoc(fileRef, {
          path: filePath,
          content: content,
          metadata: {
            sha: response.data.content?.sha || 'unknown',
            lastUpdated: new Date().toISOString()
          }
        });
        
        setPushSuccess(true);
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

  const handleGenerateSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await generateSettings(files);
      setSettings(settings);
    } catch (error) {
      console.error('Failed to generate settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Settings Generation
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure settings for your codebase
          </p>
        </div>
        <Settings className="h-8 w-8 text-gray-400" />
      </div>

      {/* Push notifications */}
      {pushSuccess && (
        <Notification
          type="success"
          message="Successfully pushed settings.json to GitHub"
        />
      )}
      {pushError && (
        <Notification
          type="error"
          message={pushError}
        />
      )}

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateSettings}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Settings...
              </>
            ) : (
              'Generate Settings'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating settings: {error}</span>
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
                    Successfully pushed settings.json to GitHub
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

          {settings && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Settings
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(settings, null, 2))}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                             dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                             text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadJson(settings, 'settings.json')}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                             dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                             text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={() => setShowPushDialog(true)}
                    className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 
                             rounded-md flex items-center gap-2 text-white transition-colors"
                  >
                    <GitPullRequest className="h-4 w-4" />
                    Push to GitHub
                  </button>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
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
                    This will update the settings.json file in your GitHub repository. Are you sure you want to continue?
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
      </div>
    </div>
  );
};

export default SettingsGenerationTool;