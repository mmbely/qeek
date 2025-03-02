import { generateAISummary } from '../services/ai';
import { RepositoryFile } from '../types/repository';

export const generateSettings = async (files: RepositoryFile[]) => {
  // Map files to their paths when needed
  const filePaths = files.map(file => file.path);
  
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
    JSON.stringify({ files: filePaths }),
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
