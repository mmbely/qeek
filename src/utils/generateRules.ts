import { RepositoryFile } from '../types/repository';
import { generateAISummary } from '../services/ai';
import { getRepositoryFile } from '../services/github';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const generateRules = async (repoId: string) => {
  try {
    // 1. Get files collection from Firestore
    const filesCollectionRef = collection(db, 'repositories', repoId, 'files');
    const filesSnapshot = await getDocs(filesCollectionRef);
    
    // 2. Get important files that define project structure
    const importantFiles = filesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() as RepositoryFile }))
      .filter(file => {
        // Filter for configuration and important files
        const path = file.path.replace(/_/g, '/'); // Convert stored path back to normal format
        const isConfigFile = path.match(/package\.json|tsconfig\.json|\.eslintrc|\.prettierrc|jest\.config/);
        const isComponentFile = path.startsWith('src/components') && path.endsWith('.tsx');
        const isTestFile = path.includes('.test.') || path.includes('.spec.');
        return isConfigFile || isComponentFile || isTestFile;
      })
      .slice(0, 5); // Limit to 5 files for performance

    // 3. Get file contents from GitHub
    const filesWithContent = await Promise.all(
      importantFiles.map(async (file) => {
        try {
          // Use the normal path format (with slashes) for GitHub API
          const path = file.path.replace(/_/g, '/');
          const content = await getRepositoryFile(path);
          return {
            ...file,
            content
          };
        } catch (error) {
          console.warn(`Failed to fetch content for ${file.path}:`, error);
          return file;
        }
      })
    );

    // 4. Extract metadata about the codebase
    const fileTypes = Array.from(
      new Set(importantFiles.map(f => f.path.split('.').pop()).filter(Boolean))
    );
    const directories = Array.from(
      new Set(importantFiles.map(f => f.path.split('/')[0]).filter(Boolean))
    );

    // 5. Generate AI prompt
    const prompt = `Analyze these files and generate coding rules that reflect the existing patterns and best practices.
Focus on:
- TypeScript/React patterns
- File organization
- Naming conventions
- Code style
- Testing approaches
- Project-specific patterns

Return a JSON object with rules in this format:
{
  "rules": [
    {
      "category": "Style/Architecture/Testing/etc",
      "rule": "The specific rule",
      "rationale": "Why this rule exists",
      "examples": {
        "good": "Example following the rule",
        "bad": "Example violating the rule"
      }
    }
  ]
}`;

    // 6. Prepare the data to send to the AI
    const aiData = JSON.stringify({
      files: filesWithContent,
      metadata: {
        fileTypes,
        directories,
      }
    });

    // 7. Generate rules using AI
    const response = await generateAISummary(
      aiData,
      'rules-generation',
      prompt
    );

    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response');
    }

    const rawResponse = response.candidates[0].content.parts[0].text;
    let parsedRules = null;
    
    try {
      // Extract JSON content between markdown code blocks
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        // Clean the extracted JSON text
        const jsonContent = jsonMatch[1].trim();
        
        // Parse the cleaned JSON
        parsedRules = JSON.parse(jsonContent);
      }
    } catch (parseError) {
      console.error('Failed to parse rules:', parseError);
      // We don't throw here - we'll return the raw response anyway
    }

    // Return the prompt, data, raw response, and parsed rules
    return {
      prompt,
      data: aiData,
      rawResponse,
      parsedRules
    };

  } catch (error) {
    console.error('Error generating rules:', error);
    throw error;
  }
};

