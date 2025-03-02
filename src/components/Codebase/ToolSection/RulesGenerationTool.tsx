import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, BookOpen, Copy } from 'lucide-react';
import { generateRules } from '../../../utils/generateRules';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RepositoryFile } from '../../../types/repository';

interface RulesGenerationToolProps {
  files: RepositoryFile[];
}

const RulesGenerationTool = ({ files }: RulesGenerationToolProps) => {
  const [rules, setRules] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('formatted');

  const handleGenerateRules = async () => {
    try {
      setLoading(true);
      setError(null);
      setRawResponse(null);
      setPrompt(null);
      setData(null);
      setRules(null);

      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      const repoId = currentAccount.settings.githubRepository.replace('/', '_');
      
      const result = await generateRules(repoId);
      
      // Store everything
      setPrompt(result.prompt);
      setData(result.data);
      setRawResponse(result.rawResponse);
      
      if (result.parsedRules) {
        setRules(result.parsedRules);
      }
      
    } catch (error) {
      console.error('Failed to generate rules:', error);
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
            Coding Rules
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate coding rules and best practices for your project
          </p>
        </div>
        <BookOpen className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateRules}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Rules...
              </>
            ) : (
              'Generate Rules'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating rules: {error}</span>
              </div>
            </div>
          )}

          {prompt && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  AI Prompt
                </h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4">
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
                  <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[300px] font-mono">
                    {prompt}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {data && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Files Data
                </h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      onClick={() => copyToClipboard(data)}
                      className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                               dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                               text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 overflow-auto max-h-[300px]">
                    <SyntaxHighlighter
                      language="json"
                      style={isDarkMode ? materialDark : materialLight}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: isDarkMode ? 'rgba(17, 24, 39, 0.5)' : '#f3f4f6',
                        borderRadius: '0.375rem',
                      }}
                    >
                      {data}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(rawResponse || rules) && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Rules
                </h3>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2 p-2">
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
                  {activeTab === 'raw' && rawResponse && (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <button
                          onClick={() => copyToClipboard(rawResponse)}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {rawResponse}
                      </pre>
                    </div>
                  )}
                  {activeTab === 'formatted' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px]">
                      {rules ? (
                        <div className="space-y-6">
                          {rules.rules.map((rule: any, index: number) => (
                            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                  {rule.category}
                                </span>
                              </div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                {rule.rule}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {rule.rationale}
                              </p>
                              {rule.examples && (
                                <div className="space-y-3">
                                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Examples:
                                  </h5>
                                  <div className="space-y-2">
                                    {rule.examples.good && (
                                      <div>
                                        <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                                          Good:
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-100 dark:border-green-900">
                                          <pre className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">
                                            {rule.examples.good}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                    {rule.examples.bad && (
                                      <div>
                                        <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                                          Bad:
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-900">
                                          <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                                            {rule.examples.bad}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : rawResponse ? (
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
                          {rawResponse}
                        </ReactMarkdown>
                      ) : (
                        <p>No formatted content available</p>
                      )}
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

export default RulesGenerationTool;