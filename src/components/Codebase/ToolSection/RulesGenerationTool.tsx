import { useState } from 'react';
import { RefreshCw, AlertTriangle, ScrollText } from 'lucide-react';
import { generateRules } from '../../../utils/generateRules';
import { useTheme } from '../../../context/ThemeContext';

interface RulesGenerationToolProps {
  files: string[];
}

const RulesGenerationTool = ({ files }: RulesGenerationToolProps) => {
  const [rules, setRules] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  const handleGenerateRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const rules = await generateRules(files);
      setRules(rules);
    } catch (error) {
      console.error('Failed to generate rules:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate rules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Rules Generation
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate rules for code analysis
          </p>
        </div>
        <ScrollText className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateRules}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Rules...
              </>
            ) : (
              'Generate Rules'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating rules: {error}</span>
              </div>
            </div>
          )}

          {rules && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Rules
                </h3>
              </div>
              <div className="p-4">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(rules, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RulesGenerationTool;