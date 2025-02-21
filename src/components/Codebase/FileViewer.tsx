import React, { useState } from 'react';
import { XCircle, GitBranch, FileText, Code2, Box, Brain, Info } from 'lucide-react';
import { RepositoryFile } from '../../types/repository';
import { formatFileSize, getFileIcon } from './utils';
import { ExpandableCell } from './components/ExpandableCell';

interface FileViewerProps {
  file: RepositoryFile;
  onClose: () => void;
}

type TabType = 'info' | 'ai-analysis';

export const FileViewer = ({ file, onClose }: FileViewerProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  // Debug logging
  console.log('Raw file prop:', file);

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
    const functions = file.functions;
    const classes = file.classes;
    const imports = file.imports;
    const exports = file.exports;

    return (
      <div className="space-y-6">
        {/* Summary Section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Summary</h4>
          <p className="text-gray-700 dark:text-gray-300">
            {file.summary || 'No summary available'}
          </p>
        </div>

        {/* Language and Analysis */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Analysis</h4>
          <div className="space-y-4">
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</h5>
              <p className="text-gray-600 dark:text-gray-400">{file.language}</p>
            </div>
            
            {/* Exports */}
            {exports && exports.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exports</h5>
                <div className="flex flex-wrap gap-2">
                  {exports.map((exp, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Imports */}
            {imports && imports.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imports</h5>
                <div className="flex flex-wrap gap-2">
                  {imports.map((imp, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                      {imp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Functions */}
        {functions && functions.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Functions</h4>
            <div className="space-y-3">
              {functions.map((func, index) => (
                <div key={index} className="border-l-2 border-blue-500 pl-3">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">{func.name}</h5>
                  {func.purpose && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{func.purpose}</p>
                  )}
                  {func.params && func.params.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {func.params.map((param, pIndex) => (
                        <span key={pIndex} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                          {param}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {classes && classes.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Classes</h4>
            <div className="space-y-3">
              {classes.map((cls, index) => (
                <div key={index} className="border-l-2 border-green-500 pl-3">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</h5>
                  {cls.purpose && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{cls.purpose}</p>
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
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (file.status || 'active') === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {file.status || 'active'}
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
                      <span className="text-gray-900 dark:text-white font-mono text-sm">{file.sha}</span>
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
                      <ExpandableCell items={file.functions} />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Classes</h5>
                      <ExpandableCell items={file.classes} />
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                {!file.metadata?.type || file.metadata.type !== 'directory' ? (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Content Preview
                    </h4>
                    <pre className="font-mono text-sm text-gray-900 dark:text-gray-100 overflow-auto max-h-[200px]">
                      <code>{file.content || 'No content available'}</code>
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