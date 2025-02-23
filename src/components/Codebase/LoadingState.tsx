import { Loader2 } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  );
}