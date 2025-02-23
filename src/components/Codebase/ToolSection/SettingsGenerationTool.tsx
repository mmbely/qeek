import { useState } from 'react';
import { generateSettings } from '../../../utils/generateSettings';

const SettingsGenerationTool = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Logic to generate settings
      const settings = await generateSettings();
      setSettings(settings);
    } catch (error) {
      console.error('Failed to generate settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Settings Generation</h2>
      <button onClick={handleGenerateSettings} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Settings'}
      </button>
      {settings && (
        <div>
          <h3>Settings</h3>
          <pre>{JSON.stringify(settings, null, 2)}</pre>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default SettingsGenerationTool;