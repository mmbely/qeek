import { useState } from 'react';
import { RefreshCw, AlertTriangle, FileCode, Copy } from 'lucide-react';
import { generateAISummary } from '../../../services/ai';
import { getRepositoryFiles, getRepositoryFile } from '../../../services/github';
import { analyzeCodebase } from '../../../utils/analyzeCodebase';
import { summaryPrompt } from '../../../constants/prompts';
import { useTheme } from '../../../context/ThemeContext';
import { RepositoryFile } from '../../../types/repository';
import { Timestamp } from 'firebase/firestore';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodebaseSummaryToolProps {
  files: RepositoryFile[];
}

const CodebaseSummaryTool = ({ files }: CodebaseSummaryToolProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('formatted');

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
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

      // Filter out files with empty ai_analysis
      const validFiles = repoFiles.filter((file): file is RepositoryFile & { ai_analysis: object } => {
        return !!file.ai_analysis && Object.keys(file.ai_analysis).length > 0;
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

      const summaryText = aiResponse.candidates[0].content.parts[0].text;
      setSummary(summaryText);
    } catch (error) {
      console.error('Failed to generate summary:', error);
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Codebase Summary
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate a comprehensive summary of your codebase
          </p>
        </div>
        <FileCode className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Summary...
              </>
            ) : (
              'Generate Summary'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating summary: {error}</span>
              </div>
            </div>
          )}

          {(summary || prompt) && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Summary
                </h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2 p-2">
                    <button
                      className={`px-4 py-2 rounded-md ${
                        activeTab === 'prompt'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('prompt')}
                    >
                      AI Prompt
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        activeTab === 'raw'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('raw')}
                    >
                      Raw Response
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        activeTab === 'formatted'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('formatted')}
                    >
                      Formatted
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {activeTab === 'prompt' && prompt && (
                    <div>
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
                  )}
                  
                  {activeTab === 'raw' && summary && (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <button
                          onClick={() => copyToClipboard(summary)}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {summary}
                      </pre>
                    </div>
                  )}
                  
                  {activeTab === 'formatted' && summary && (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <button
                          onClick={() => copyToClipboard(summary)}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px]">
                        <ReactMarkdown
                          className="w-full break-words"
                          components={{
                            code({ className, children }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return match ? (
                                <SyntaxHighlighter
                                  style={isDarkMode ? materialDark : materialLight}
                                  language={match[1]}
                                  customStyle={{
                                    margin: 0,
                                    padding: '1rem',
                                    background: isDarkMode ? 'rgba(17, 24, 39, 0.5)' : '#f3f4f6',
                                    borderRadius: '0.375rem',
                                  }}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodebaseSummaryTool;