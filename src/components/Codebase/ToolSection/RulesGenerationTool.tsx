import { useState } from 'react';
import { generateRules } from '../../../utils/generateRules';

const RulesGenerationTool = () => {
  const [rules, setRules] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateRules = async () => {
    try {
      setLoading(true);
      setError(null);

      // Logic to generate rules
      const rules = await generateRules();
      setRules(rules);
    } catch (error) {
      console.error('Failed to generate rules:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate rules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Rules Generation</h2>
      <button onClick={handleGenerateRules} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Rules'}
      </button>
      {rules && (
        <div>
          <h3>Rules</h3>
          <pre>{JSON.stringify(rules, null, 2)}</pre>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default RulesGenerationTool;