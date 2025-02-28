import { generateAISummary } from '../services/ai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RepositoryFile } from '../types/repository';

export const generateComponentMetadata = async (files: string[], githubRepository: string) => {
  try {
    if (!githubRepository) {
      throw new Error('No repository connected');
    }

    // Fetch repository data
    const repoId = githubRepository.replace('/', '_');
    const filesCollection = collection(db, `repositories/${repoId}/files`);
    const filesSnapshot = await getDocs(filesCollection);
    const repoFiles = filesSnapshot.docs.map((doc) => doc.data() as RepositoryFile);

    console.log('Fetched repository files:', repoFiles);

    // Filter out files with empty ai_analysis
    const validFiles = repoFiles.filter((file): file is RepositoryFile & { ai_analysis: object } => {
      return !!file.ai_analysis && Object.keys(file.ai_analysis).length > 0;
    });

    console.log('Valid files with ai_analysis:', validFiles);

    if (validFiles.length === 0) {
      throw new Error('No valid files with AI analysis found');
    }

    const prompt = `Analyze the following codebase files and extract component metadata in the following format:
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
}

Here are the files to analyze:
${validFiles.map(file => `\n\nFile: ${file.path}\n${JSON.stringify(file.ai_analysis, null, 2)}`).join('\n\n')}`;

    const response = await generateAISummary(
      JSON.stringify({ files: validFiles }),
      'component-metadata',
      prompt
    );

    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response');
    }

    const text = response.candidates[0].content.parts[0].text;
    
    try {
      // Remove Markdown code block markers
      const cleanText = text.replace(/```json\n|\n```/g, '');
      return JSON.parse(cleanText);
    } catch (e) {
      console.error('Failed to parse metadata:', text);
      throw new Error(`Failed to parse metadata: ${text}`);
    }
  } catch (error) {
    console.error('Error generating component metadata:', error);
    throw error;
  }
};
