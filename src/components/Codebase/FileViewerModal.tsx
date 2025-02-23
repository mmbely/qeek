import { Modal, Button } from '@mui/material';
import { X } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github, dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
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
    <Modal open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {file.path}
            </h2>
            <Button onClick={onClose} className="text-gray-500 dark:text-gray-400">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content (Scrollable) */}
          <div className="p-4 overflow-y-auto flex-1">
            {/* File Metadata Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">File Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <span className="font-medium">Path:</span> {file.path}
                </div>
                <div>
                  <span className="font-medium">Language:</span> {file.language}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {file.size} bytes
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {new Date(file.last_updated).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Commit Message:</span> {file.last_commit_message || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">SHA:</span> {file.metadata?.sha || 'N/A'}
                </div>
              </div>
            </div>

            {/* File Summary Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">File Summary</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {file.ai_analysis?.summary || 'No summary available'}
              </p>
            </div>

            {/* Primary Features Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Primary Features</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                {file.ai_analysis?.primary_features?.map((feature: string, index: number) => (
                  <li key={index}>{feature}</li>
                )) || 'No features available'}
              </ul>
            </div>

            {/* Functions Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Functions</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                {file.ai_analysis?.functions?.map((func: { name: string; purpose: string }, index: number) => (
                  <li key={index}>
                    <span className="font-medium">{func.name}:</span> {func.purpose}
                  </li>
                )) || 'No functions available'}
              </ul>
            </div>

            {/* Imports Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Imports</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                {file.ai_analysis?.imports?.map((imp: { path: string; purpose: string }, index: number) => (
                  <li key={index}>
                    <span className="font-medium">{imp.path}:</span> {imp.purpose}
                  </li>
                )) || 'No imports available'}
              </ul>
            </div>

            {/* Integration Points Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Integration Points</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                {file.ai_analysis?.integrationPoints?.map((point: { name: string; purpose: string; type: string }, index: number) => (
                  <li key={index}>
                    <span className="font-medium">{point.name}:</span> {point.purpose}
                  </li>
                )) || 'No integration points available'}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}