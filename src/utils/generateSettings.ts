import { generateAISummary } from '../services/ai';

export const generateSettings = async (files: string[]) => {
  const prompt = `Analyze the provided codebase files and recommend settings and configurations in the following format:
{
  "settings": {
    "editor": {
      "formatting": ["recommended editor settings"],
      "extensions": ["recommended extensions"]
    },
    "linting": {
      "rules": ["recommended linting rules"],
      "configuration": "eslint/prettier config"
    },
    "build": {
      "optimization": ["build optimization settings"],
      "environment": ["environment variables needed"]
    }
  }
}`;

  const response = await generateAISummary(
    JSON.stringify({ files }),
    'settings-generation',
    prompt
  );

  if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid AI response');
  }

  const text = response.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      settings: {
        general: {
          description: text
        }
      }
    };
  }
};
