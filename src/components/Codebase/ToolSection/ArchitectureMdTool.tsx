import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, FileText, Copy, Download, GitPullRequest } from 'lucide-react';
import { generateAISummary } from '../../../services/ai';
import { analyzeCodebase } from '../../../utils/analyzeCodebase';
import { summaryPrompt } from '../../../constants/prompts';
import { useTheme } from '../../../context/ThemeContext';
import { RepositoryFile } from '../../../types/repository';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Octokit } from '@octokit/rest';
import { diffLines } from 'diff';
import { Dialog } from '../../ui/dialog';
// import type { CodeProps } from 'react-markdown/lib/ast-to-react';

interface ArchitectureMdToolProps {
  files: RepositoryFile[];
}

// Simple tab implementation (copied from ComponentsJsonTool)
interface SimpleTabsProps {
  defaultValue: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

interface TabProps {
  value: string;
  label: string;
  children: React.ReactNode;
}

// Simple tab implementation
const SimpleTabs = ({ defaultValue, children, onValueChange }: SimpleTabsProps) => {
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

const ArchitectureMdTool = ({ files }: ArchitectureMdToolProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingArchitecture, setExistingArchitecture] = useState<string | null>(null);
  const [generatedArchitecture, setGeneratedArchitecture] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('existing');
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [hasDifferences, setHasDifferences] = useState(false);
  const [diffResult, setDiffResult] = useState<any[]>([]);

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

  // Check for existing architecture.md file
  useEffect(() => {
    const checkExistingFile = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        setCheckingExisting(false);
        return;
      }

      try {
        console.log("Checking for existing architecture.md file...");
        
        // Get repository ID for Firestore
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        console.log("Repository ID:", repoId);
        
        // Try direct GitHub raw URL first (most reliable method)
        try {
          console.log("Trying direct GitHub raw URL...");
          const rawUrl = `https://raw.githubusercontent.com/${currentAccount.settings.githubRepository}/main/.cursor/architecture.md`;
          console.log(`Fetching from URL: ${rawUrl}`);
          
          const response = await fetch(rawUrl);
          if (response.ok) {
            const mdContent = await response.text();
            console.log("Successfully fetched architecture.md from GitHub raw URL");
            setExistingArchitecture(mdContent);
            setActiveTab('existing');
            return; // Exit early if successful
          } else {
            console.error("Failed to fetch from GitHub raw URL:", response.statusText);
          }
        } catch (fetchError) {
          console.error("Error fetching from GitHub raw URL:", fetchError);
        }
        
        // Try Firestore as fallback
        try {
          console.log("Trying Firestore...");
          const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_architecture.md');
          const fileDoc = await getDoc(fileRef);
          
          if (fileDoc.exists() && fileDoc.data().content) {
            console.log("Found architecture.md in Firestore");
            setExistingArchitecture(fileDoc.data().content);
            setActiveTab('existing');
            return; // Exit if found
          } else {
            console.log("No architecture.md found in Firestore");
          }
        } catch (firestoreError) {
          console.error("Error checking Firestore:", firestoreError);
        }
        
        console.log("No existing architecture.md file found");
        setActiveTab('generated');
      } catch (error) {
        console.error("Error checking for architecture.md:", error);
        setError("Unexpected error occurred");
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingFile();
  }, [currentAccount, db]);

  const handleGenerateArchitecture = async () => {
    setLoading(true);
    setError(null);
    setGeneratedArchitecture(null);
    setPrompt(null);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      // Fetch repository data
      const repoId = currentAccount.settings.githubRepository.replace('/', '_');
      const repoRef = doc(db, 'repositories', repoId);
      const repoDoc = await getDoc(repoRef);

      if (!repoDoc.exists()) {
        throw new Error('Repository not found');
      }

      // Fetch files from the 'files' subcollection
      const filesCollection = collection(db, `repositories/${repoId}/files`);
      const filesSnapshot = await getDocs(filesCollection);
      const repoFiles = filesSnapshot.docs.map((doc) => doc.data() as RepositoryFile);

      console.log('Fetched repository files:', repoFiles);

      // Filter out files with empty ai_analysis and deleted files
      const validFiles = repoFiles.filter((file): file is RepositoryFile & { ai_analysis: object } => {
        return (
          !!file.ai_analysis && 
          Object.keys(file.ai_analysis).length > 0 &&
          file.status !== "deleted"  // Exclude deleted files
        );
      });

      console.log('Valid files with ai_analysis:', validFiles);

      if (validFiles.length === 0) {
        throw new Error('No valid files with AI analysis found');
      }

      const metadata = analyzeCodebase(validFiles);
      console.log('Generated metadata:', metadata);

      const fullPrompt = summaryPrompt
        .replace('{{DIRECTORIES}}', Array.from(metadata.directories).join('\n'))
        .replace('{{FILE_TYPES}}', Array.from(metadata.fileTypes).join(', '))
        .replace('{{DEPENDENCIES}}', Array.from(metadata.dependencies).join(', '))
        .replace('{{TEST_FILES}}', Array.from(metadata.testFiles).join('\n'))
        .replace('{{CONFIG_FILES}}', Array.from(metadata.configFiles).join('\n'))
        .replace('{{SOURCE_FILES}}', Array.from(metadata.sourceFiles).join('\n'))
        .replace('{{IMPORTS}}', Array.from(metadata.imports).join(', '))
        .replace('{{EXPORTS}}', Array.from(metadata.exports).join(', '))
        .replace('{{API_PATTERNS}}', Array.from(metadata.apiPatterns).join(', '))
        .replace('{{ENV_VARS}}', Array.from(metadata.envVars).join(', '))
        .replace('{{SCRIPTS}}', Array.from(metadata.scripts).join(', '));

      console.log('Full prompt:', fullPrompt);
      
      // Save the prompt
      setPrompt(fullPrompt);

      const aiData = JSON.stringify({
        files: validFiles.map(file => ({
          path: file.path,
          language: file.language,
          size: file.size,
          ai_analysis: file.ai_analysis
        })),
        metadata
      });

      const aiResponse = await generateAISummary(
        aiData,
        'codebase-summary',
        fullPrompt
      );

      if (!aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid AI response');
      }

      const architectureText = aiResponse.candidates[0].content.parts[0].text;
      setGeneratedArchitecture(architectureText);
      setActiveTab('generated');
    } catch (error) {
      console.error('Failed to generate architecture.md:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
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

  const downloadMarkdown = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePushToGitHub = async () => {
    if (!generatedArchitecture || !currentAccount?.settings?.githubRepository || !currentAccount?.id) {
      setPushError('Missing architecture content or account information');
      return;
    }

    setPushLoading(true);
    setPushError(null);
    setPushSuccess(false);
    
    try {
      const [owner, repo] = currentAccount.settings.githubRepository.split('/');
      const filePath = '.cursor/architecture.md';
      const content = generatedArchitecture;
      const commitMessage = 'Update architecture.md via Qeek';
      
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
        // Use browser's btoa function for base64 encoding
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
        const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_architecture.md');
        
        await setDoc(fileRef, {
          path: filePath,
          content: content,
          metadata: {
            sha: response.data.content?.sha || 'unknown',
            lastUpdated: new Date().toISOString()
          }
        });
        
        setPushSuccess(true);
        setExistingArchitecture(generatedArchitecture);
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

  // Generate diff when both architectures are available and compare tab is active
  useEffect(() => {
    if (existingArchitecture && generatedArchitecture && activeTab === 'compare') {
      console.log("Generating diff between existing and generated architecture.md");
      
      try {
        const differences = diffLines(existingArchitecture, generatedArchitecture);
        
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
  }, [existingArchitecture, generatedArchitecture, activeTab]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Architecture MD
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate and manage your architecture.md file
          </p>
        </div>
        
        {/* Action buttons moved to top right */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateArchitecture}
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
                Generate architecture.md
              </>
            )}
          </button>
          
          {generatedArchitecture && (
            <button
              onClick={() => setShowPushDialog(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                       flex items-center gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              Push to GitHub
            </button>
          )}
          
          {(existingArchitecture || generatedArchitecture) && (
            <button
              onClick={() => downloadMarkdown(generatedArchitecture || existingArchitecture || '', 'architecture.md')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                       rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download MD
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {checkingExisting ? (
        <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-gray-400 animate-spin mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Checking for existing architecture.md file...</span>
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Generating architecture.md
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This may take a minute or two...
                </p>
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
                    Successfully pushed architecture.md to GitHub
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

          {(existingArchitecture || generatedArchitecture) && !loading && (
            <SimpleTabs defaultValue={activeTab} onValueChange={setActiveTab}>
              {existingArchitecture && (
                <Tab value="existing" label="Existing architecture.md">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Existing architecture.md
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(existingArchitecture)}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                          <button
                            onClick={() => downloadMarkdown(existingArchitecture, 'architecture.md')}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 overflow-auto max-h-[600px]">
                      <div className="prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-200">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return match ? (
                                <SyntaxHighlighter
                                  // @ts-ignore - Known issue with type definitions
                                  style={isDarkMode ? materialDark : materialLight}
                                  language={match[1]}
                                  PreTag="div"
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            h1: ({ children }) => <h1 className="text-gray-900 dark:text-gray-100">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-gray-900 dark:text-gray-100">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-gray-900 dark:text-gray-100">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-gray-900 dark:text-gray-100">{children}</h4>,
                            h5: ({ children }) => <h5 className="text-gray-900 dark:text-gray-100">{children}</h5>,
                            h6: ({ children }) => <h6 className="text-gray-900 dark:text-gray-100">{children}</h6>,
                            p: ({ children }) => <p className="text-gray-800 dark:text-gray-200">{children}</p>,
                            ul: ({ children }) => <ul className="text-gray-800 dark:text-gray-200">{children}</ul>,
                            ol: ({ children }) => <ol className="text-gray-800 dark:text-gray-200">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
                            a: ({ href, children }) => (
                              <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {existingArchitecture}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </Tab>
              )}
              
              {generatedArchitecture && (
                <Tab value="generated" label="Generated architecture.md">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Generated architecture.md
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(generatedArchitecture)}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                          <button
                            onClick={() => downloadMarkdown(generatedArchitecture, 'architecture.md')}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 overflow-auto max-h-[600px]">
                      <div className="prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-200">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return match ? (
                                <SyntaxHighlighter
                                  // @ts-ignore - Known issue with type definitions
                                  style={isDarkMode ? materialDark : materialLight}
                                  language={match[1]}
                                  PreTag="div"
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            h1: ({ children }) => <h1 className="text-gray-900 dark:text-gray-100">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-gray-900 dark:text-gray-100">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-gray-900 dark:text-gray-100">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-gray-900 dark:text-gray-100">{children}</h4>,
                            h5: ({ children }) => <h5 className="text-gray-900 dark:text-gray-100">{children}</h5>,
                            h6: ({ children }) => <h6 className="text-gray-900 dark:text-gray-100">{children}</h6>,
                            p: ({ children }) => <p className="text-gray-800 dark:text-gray-200">{children}</p>,
                            ul: ({ children }) => <ul className="text-gray-800 dark:text-gray-200">{children}</ul>,
                            ol: ({ children }) => <ol className="text-gray-800 dark:text-gray-200">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
                            a: ({ href, children }) => (
                              <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {generatedArchitecture}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </Tab>
              )}
              
              {existingArchitecture && generatedArchitecture && (
                <Tab value="compare" label="Compare Changes">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 p-4">
                        Compare Changes
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
              
              {prompt && (
                <Tab value="prompt" label="AI Prompt">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => copyToClipboard(prompt)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                 dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                      {prompt}
                    </pre>
                  </div>
                </Tab>
              )}
            </SimpleTabs>
          )}
          
          {!existingArchitecture && !generatedArchitecture && !loading && !error && (
            <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No architecture.md file found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Generate a new architecture.md file to document your codebase structure.
                </p>
                <button
                  onClick={handleGenerateArchitecture}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                           disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate architecture.md
                </button>
              </div>
            </div>
          )}


        </>
      )}

      {/* Push to GitHub Dialog */}
      {showPushDialog && (
        <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Push to GitHub
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will {existingArchitecture ? 'update' : 'create'} the architecture.md file in your GitHub repository. Are you sure you want to continue?
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

export default ArchitectureMdTool;