export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (timestamp: any) => {
  if (!timestamp) return '-';
  // Handle both Firestore Timestamps and regular dates/numbers
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

export const getContentPreview = (content: string | undefined) => {
  if (!content) return '-';
  return content.slice(0, 100) + (content.length > 100 ? '...' : '');
};
