import { Timestamp } from 'firebase/firestore';

export const getTimestampMillis = (timestamp: number | Timestamp): number => {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  return timestamp.toMillis();
};

export const timestampToDate = (timestamp: number | Timestamp): Date => {
  return new Date(getTimestampMillis(timestamp));
};

export const formatMessageDate = (timestamp: number | Timestamp): string => {
  const date = timestampToDate(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
  
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  
  // For dates within the last week, show the day name
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  // For older dates, show the full date
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};
