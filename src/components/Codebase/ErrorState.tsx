import { XCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
      <XCircle className="w-12 h-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
          {error}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          There was an error loading your repository.
        </p>
        <button
          onClick={onRetry}
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Retry
        </button>
      </div>
    </div>
  );
}