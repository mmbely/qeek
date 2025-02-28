import { useState } from 'react';
import { RefreshCw, AlertTriangle, Component } from 'lucide-react';
import { generateComponentMetadata } from '../../../utils/generateComponentMetadata';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';

interface ComponentMetadataToolProps {
  files: string[];
}

const ComponentMetadataTool = ({ files }: ComponentMetadataToolProps) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();

  const handleGenerateMetadata = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      const metadata = await generateComponentMetadata(
        files,
        currentAccount.settings.githubRepository
      );
      setMetadata(metadata);
    } catch (error) {
      console.error('Failed to generate metadata:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Component Metadata
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Extract metadata from your components
          </p>
        </div>
        <Component className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateMetadata}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Metadata...
              </>
            ) : (
              'Generate Metadata'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating metadata: {error}</span>
              </div>
            </div>
          )}

          {metadata && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Metadata
                </h3>
              </div>
              <div className="p-4">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px]">
                  {typeof metadata === 'string' ? 
                    // Try to parse the string as JSON
                    JSON.stringify(JSON.parse(metadata.replace(/```json\n|\n```/g, '')), null, 2) :
                    // If it's already an object, just stringify it
                    JSON.stringify(metadata, null, 2)
                  }
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentMetadataTool;