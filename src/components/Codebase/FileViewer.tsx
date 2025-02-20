import React from 'react';
import { XCircle, GitBranch, FileText, Code2, Box } from 'lucide-react';
import { RepositoryFile } from '../../types/repository';
import { formatFileSize, getFileIcon } from './utils';
import { ExpandableCell } from './components/ExpandableCell';

interface FileViewerProps {
  file: RepositoryFile;
  onClose: () => void;
}

export const FileViewer = ({ file, onClose }: FileViewerProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Information</h4>
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

            {/* Right column */}
            <div className="space-y-6">
              {/* Code Analysis */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Code Analysis
                </h4>
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
        </div>
      </div>
    </div>
  );
};