import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, Component, Copy } from 'lucide-react';
import { generateComponentMetadata } from '../../../utils/generateComponentMetadata';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RepositoryFile } from '../../../types/repository';

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
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('raw');

  const handleGenerateMetadata = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      const metadata = await generateComponentMetadata(
        files,
        currentAccount.settings.githubRepository
      );
      setMetadata(metadata);
    } catch (error) {
      console.error('Failed to generate metadata:', error);
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
            Component Metadata
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Extract metadata from your components
          </p>
        </div>
        <Component className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateMetadata}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Metadata...
              </>
            ) : (
              'Generate Metadata'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating metadata: {error}</span>
              </div>
            </div>
          )}

          {metadata && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Metadata
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
                  {activeTab === 'raw' ? (
                    <div>
                      <div className="flex items-center justify-end mb-2">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(metadata, null, 2))}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {JSON.stringify(metadata, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
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
                            {`\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\``}
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

export default ComponentMetadataTool;