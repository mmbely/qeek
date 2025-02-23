import React from 'react';
import { formatFileSize, formatDate, getContentPreview } from './formatters';
import FileIcon from '../components/FileIcon';

export { formatFileSize, formatDate, getContentPreview, FileIcon };

export const getFileIcon = (filePath: string) => {
  // Extract file extension from the path
  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
  return <FileIcon language={fileExtension || 'unknown'} className="h-4 w-4 text-gray-400" />;
};
