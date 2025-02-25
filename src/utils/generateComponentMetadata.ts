import { generateAISummary } from '../services/ai';

export const generateComponentMetadata = async (files: string[]) => {
  const prompt = `Analyze the provided codebase files and extract component metadata in the following format:
{
  "components": [
    {
      "name": "component name",
      "type": "class or functional component",
      "props": ["list of props with types"],
      "state": ["list of state variables"],
      "hooks": ["list of React hooks used"],
      "dependencies": ["external and internal dependencies"],
      "description": "brief component description"
    }
  ]
}`;

  const response = await generateAISummary(
    JSON.stringify({ files }),
    'component-metadata',
    prompt
  );

  if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid AI response');
  }

  const text = response.candidates[0].content.parts[0].text;
  
  try {
    // Try to parse as JSON first
    return JSON.parse(text);
  } catch (e) {
    // If parsing fails, return as formatted text
    return {
      components: [{
        name: "Response",
        type: "text",
        description: text
      }]
    };
  }
};
