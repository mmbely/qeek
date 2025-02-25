import { useState } from 'react';
import { RefreshCw, AlertTriangle, FileCode } from 'lucide-react';
import { generateAISummary } from '../../../services/ai';
import { getRepositoryFiles, getRepositoryFile } from '../../../services/github';
import { analyzeCodebase } from '../../../utils/analyzeCodebase';
import { summaryPrompt } from '../../../constants/prompts';
import { useTheme } from '../../../context/ThemeContext';

interface CodebaseSummaryToolProps {
  files: string[];
}

const CodebaseSummaryTool = ({ files }: CodebaseSummaryToolProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch files and generate summary
      const repoFiles = await Promise.all(
        files.map(async (filePath: string) => {
          return await getRepositoryFile(filePath);
        })
      );

      const metadata = analyzeCodebase(repoFiles);
      const fullPrompt = summaryPrompt
        .replace('{{DIRECTORIES}}', Array.from(metadata.directories).join('\n'))
        .replace('{{FILE_TYPES}}', Array.from(metadata.fileTypes).join(', '))
        .replace('{{DEPENDENCIES}}', Array.from(metadata.dependencies).join(', '))
        .replace('{{TEST_FILES}}', Array.from(metadata.testFiles).join('\n'))
        .replace('{{CONFIG_FILES}}', Array.from(metadata.configFiles).join('\n'))
        .replace('{{SOURCE_FILES}}', Array.from(metadata.sourceFiles).join('\n'))
        .replace('{{IMPORTS}}', Array.from(metadata.imports).join(', '))
        .replace('{{EXPORTS}}', Array.from(metadata.exports).join(', '))
        .replace('{{API_PATTERNS}}', Array.from(metadata.apiPatterns).join(', '))
        .replace('{{ENV_VARS}}', Array.from(metadata.envVars).join(', '))
        .replace('{{SCRIPTS}}', Array.from(metadata.scripts).join(', '));

      const aiResponse = await generateAISummary(
        JSON.stringify(metadata),
        'codebase-summary',
        fullPrompt
      );

      if (!aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid AI response');
      }

      setSummary(aiResponse.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error('Failed to generate summary:', error);
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
            Codebase Summary
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate a comprehensive summary of your codebase
          </p>
        </div>
        <FileCode className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm">
        <div className="p-6">
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Summary...
              </>
            ) : (
              'Generate Summary'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating summary: {error}</span>
              </div>
            </div>
          )}

          {summary && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generated Summary
                </h3>
              </div>
              <div className="p-4">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto">
                  {summary}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodebaseSummaryTool;