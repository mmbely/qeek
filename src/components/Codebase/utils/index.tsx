import React from 'react';
import { formatFileSize, formatDate, getContentPreview } from './formatters';
import { FileIcon } from '../components/FileIcon';

export { formatFileSize, formatDate, getContentPreview, FileIcon };

export const getFileIcon = (filePath: string) => {
  return <FileIcon filePath={filePath} className="h-4 w-4 text-gray-400" />;
};
