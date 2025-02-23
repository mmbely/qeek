import { useNavigate } from 'react-router-dom';
import { Github, Settings } from 'lucide-react';

export default function NotConnectedState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <Github className="h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
          Connect to GitHub
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 max-w-md">
          To view your codebase, you'll need to connect your GitHub account and select a repository.
        </p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button
          onClick={() => navigate('/settings/github')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2b2f44] hover:bg-[#363b52] text-gray-200 rounded-lg transition-colors duration-200"
        >
          <Settings className="h-5 w-5" />
          Configure GitHub Settings
        </button>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="text-center">You'll need to:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Add your GitHub Personal Access Token</li>
            <li>Select a repository to analyze</li>
            <li>Wait for the initial sync to complete</li>
          </ol>
        </div>
      </div>
    </div>
  );
}