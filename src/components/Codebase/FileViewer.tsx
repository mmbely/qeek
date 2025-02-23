import React, { useState, useEffect } from 'react';
import { XCircle, GitBranch, FileText, Code2, Box, Brain, Info } from 'lucide-react';
import { RepositoryFile } from '../../types/repository';
import { formatFileSize, getFileIcon } from './utils';
import ExpandableCell from './components/ExpandableCell';

interface FileViewerProps {
  file: RepositoryFile;
  onClose: () => void;
}

type TabType = 'info' | 'ai-analysis';

export const FileViewer = ({ file, onClose }: FileViewerProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [fileContent, setFileContent] = useState<string>('');
  
  // Debug logging
  console.log('Raw file prop:', file);

  // Add fetchFileContent function
  const fetchFileContent = async (path: string): Promise<string> => {
    try {
      const response = await fetch(`/api/file-content?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }
      const data = await response.json();
      return data.content || '';
    } catch (error) {
      console.error('Error fetching file content:', error);
      return '';
    }
  };

  // Update the useEffect hook
  useEffect(() => {
    if (file.path) {
      fetchFileContent(file.path).then((content: string) => {
        setFileContent(content || 'No content available');
      });
    }
  }, [file.path]);

  const TabButton = ({ tab, label, icon: Icon }: { tab: TabType; label: string; icon: React.ElementType }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
        activeTab === tab
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  const renderAIAnalysis = () => {
    const functions = file.ai_analysis?.functions || [];
    const classes = file.ai_analysis?.classes || [];
    const imports = file.ai_analysis?.imports || [];
    const exports = file.ai_analysis?.exports || [];

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Summary</h4>
          <p className="text-gray-700 dark:text-gray-300">
            {file.ai_analysis?.summary || 'No summary available'}
          </p>
        </div>

        {/* Functions */}
        {functions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Functions</h4>
            <div className="space-y-3">
              {functions.map((func: { name: string; purpose: string }, index: number) => (
                <div key={index} className="border-l-2 border-blue-500 pl-3">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">{func.name}</h5>
                  {func.purpose && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{func.purpose}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {classes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Classes</h4>
            <div className="space-y-3">
              {classes.map((cls: { name: string; purpose: string }, index: number) => (
                <div key={index} className="border-l-2 border-green-500 pl-3">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</h5>
                  {cls.purpose && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{cls.purpose}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {getFileIcon(file.path)}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {file.path}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last updated: {file.last_updated ? new Date(file.last_updated).toLocaleString() : '-'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <TabButton tab="info" label="File Information" icon={Info} />
            <TabButton tab="ai-analysis" label="AI Analysis" icon={Brain} />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'info' ? (
            // Basic Information Tab
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column - File Info */}
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Type</span>
                      <span className="text-gray-900 dark:text-white">{file.metadata?.type || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Size</span>
                      <span className="text-gray-900 dark:text-white">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Language</span>
                      <span className="text-gray-900 dark:text-white">{file.language || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Git Info */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Git Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">SHA</span>
                      <span className="text-gray-900 dark:text-white font-mono text-sm">
                        {file.metadata?.sha || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Last Commit Message</span>
                      <p className="text-gray-900 dark:text-white mt-1">{file.last_commit_message || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - Code Preview */}
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Code Structure</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Functions</h5>
                      <ExpandableCell content={JSON.stringify(file.ai_analysis?.functions || [])} maxLength={100} />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Classes</h5>
                      <ExpandableCell content={JSON.stringify(file.ai_analysis?.classes || [])} maxLength={100} />
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                {!file.metadata?.type || file.metadata.type !== 'directory' ? (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Content</h4>
                    <pre className="font-mono text-sm text-gray-900 dark:text-gray-100 overflow-auto max-h-[200px]">
                      <code>{fileContent}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Box className="h-4 w-4" />
                      Directory
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">This is a directory</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            renderAIAnalysis()
          )}
        </div>
      </div>
    </div>
  );
};