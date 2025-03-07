import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import { RepositoryFile } from '../../types/repository';

interface FileViewerModalProps {
  file: RepositoryFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FileViewerModal({ file, isOpen, onClose }: FileViewerModalProps) {
  const { isDarkMode } = useTheme();

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90%] min-w-[800px] max-h-[90vh] p-0 flex flex-col">
        {/* Fixed Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
              File Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {file.path}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* File Metadata Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                File Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Path: </span>
                    <span className="text-gray-900 dark:text-gray-200">{file.path}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Language: </span>
                    <span className="text-gray-900 dark:text-gray-200">{file.language}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Size: </span>
                    <span className="text-gray-900 dark:text-gray-200">{file.size} bytes</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Updated: </span>
                    <span className="text-gray-900 dark:text-gray-200">
                      {new Date(file.last_updated).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Commit: </span>
                    <span className="text-gray-900 dark:text-gray-200">
                      {file.last_commit_message || 'N/A'}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">SHA: </span>
                    <span className="text-gray-900 dark:text-gray-200">
                      {file.metadata?.sha || 'N/A'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* File Summary Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                File Summary
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {file.ai_analysis?.summary || 'No summary available'}
              </p>
            </div>

            {/* Primary Features Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                Primary Features
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {file.ai_analysis?.primary_features?.map((feature: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </li>
                )) || <li className="text-sm text-gray-500">No features available</li>}
              </ul>
            </div>

            {/* Functions Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                Functions
              </h3>
              <ul className="space-y-2">
                {file.ai_analysis?.functions?.map((func: { name: string; purpose: string }, index: number) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-200">{func.name}: </span>
                    <span className="text-gray-700 dark:text-gray-300">{func.purpose}</span>
                  </li>
                )) || <li className="text-sm text-gray-500">No functions available</li>}
              </ul>
            </div>

            {/* Imports Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                Imports
              </h3>
              <ul className="space-y-2">
                {file.ai_analysis?.imports?.map((imp: { path: string; purpose: string }, index: number) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-200">{imp.path}: </span>
                    <span className="text-gray-700 dark:text-gray-300">{imp.purpose}</span>
                  </li>
                )) || <li className="text-sm text-gray-500">No imports available</li>}
              </ul>
            </div>

            {/* Integration Points Section */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                Integration Points
              </h3>
              <ul className="space-y-2">
                {file.ai_analysis?.integrationPoints?.map((point: { name: string; purpose: string; type: string }, index: number) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-200">{point.name}: </span>
                    <span className="text-gray-700 dark:text-gray-300">{point.purpose}</span>
                  </li>
                )) || <li className="text-sm text-gray-500">No integration points available</li>}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}