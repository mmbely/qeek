import { useState } from 'react';
import { generateComponentMetadata } from '../../../utils/generateComponentMetadata';

const ComponentMetadataTool = () => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateMetadata = async () => {
    try {
      setLoading(true);
      setError(null);

      // Logic to generate component metadata
      const metadata = await generateComponentMetadata();
      setMetadata(metadata);
    } catch (error) {
      console.error('Failed to generate metadata:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate metadata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Component Metadata</h2>
      <button onClick={handleGenerateMetadata} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Metadata'}
      </button>
      {metadata && (
        <div>
          <h3>Metadata</h3>
          <pre>{JSON.stringify(metadata, null, 2)}</pre>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default ComponentMetadataTool;