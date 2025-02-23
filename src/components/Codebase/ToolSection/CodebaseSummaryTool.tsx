import { useState } from 'react';
import { generateAISummary } from '../../../services/ai';
import { getRepositoryFile } from '../../../services/github';
import { analyzeCodebase } from '../../../utils/analyzeCodebase';
import { summaryPrompt } from '../../../constants/prompts';

interface CodebaseSummaryToolProps {
  files: string[];
}

const CodebaseSummaryTool = ({ files }: CodebaseSummaryToolProps) => {
  const [summaryResponse, setSummaryResponse] = useState<{ prompt: string; response: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setError(null);

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

      setSummaryResponse({
        prompt: summaryPrompt,
        response: aiResponse.candidates[0].content.parts[0].text
      });
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Codebase Summary</h2>
      <button onClick={handleGenerateSummary} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Summary'}
      </button>
      {summaryResponse && (
        <div>
          <h3>Summary</h3>
          <p>{summaryResponse.response}</p>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default CodebaseSummaryTool;