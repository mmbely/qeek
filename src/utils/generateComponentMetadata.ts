import { generateAISummary } from '../services/ai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RepositoryFile } from '../types/repository';
import { AIAnalysis } from '../types/ai';

type FileWithAI = RepositoryFile & {
  ai_analysis?: AIAnalysis;
  content?: string;
};

interface ComponentInfo {
  name: string;
  purpose: string;
  dependencies: string[];
  location: string;
}

interface ComponentGroup {
  location: string;
  components: ComponentInfo[];
}

interface ComponentMetadata {
  [groupName: string]: ComponentGroup;
}

export const generateComponentMetadata = async (
  files: FileWithAI[],
  repoPath: string
): Promise<ComponentMetadata> => {
  try {
    if (!repoPath) {
      throw new Error('No repository connected');
    }



    // Fetch repository data
    const repoId = repoPath.replace('/', '_');
    const filesCollection = collection(db, `repositories/${repoId}/files`);
    const filesSnapshot = await getDocs(filesCollection);
    const repoFiles = filesSnapshot.docs.map((doc) => doc.data() as FileWithAI);



    // Process files and build directory structure
    const componentDirs = new Set<string>();
    const componentPatterns = [
      /components?/i,
      /views?/i,
      /pages?/i,
      /screens?/i,
      /layouts?/i,
      /containers?/i,
      /widgets?/i
    ];

    // First, collect all component directories
    for (const file of repoFiles) {
      const dirPath = file.path.split('/').slice(0, -1).join('/');
      if (componentPatterns.some(pattern => pattern.test(dirPath))) {
        componentDirs.add(dirPath);
      }
    }

    const components: ComponentMetadata = {};
    


    // Process each file to group by immediate parent directory
    const processFiles = async () => {
      for (const file of repoFiles) {
        try {
          const filePath = file.path;
          const extension = filePath.split('.').pop()?.toLowerCase();
          if (!['jsx', 'tsx', 'vue', 'svelte'].includes(extension || '')) continue;

          // Get the directory path and group name
          const pathParts = filePath.split('/');
          const fileName = pathParts.pop() || '';
          const dirPath = pathParts.join('/');
          const groupName = pathParts[pathParts.length - 1] || 'root';

          // Only process files that are in or under component directories
          if (!Array.from(componentDirs).some(dir => filePath.startsWith(dir))) continue;

          // Initialize component group if it doesn't exist
          if (!components[groupName]) {
            components[groupName] = {
              location: dirPath,
              components: []
            };
          }

          const name = fileName.replace(/\.[^/.]+$/, '');
          let purpose = 'Unknown';
          let dependencies: string[] = [];
          
          // Use AI analysis data if available
          if (file.ai_analysis) {
            // First try to find the main export component's purpose
            const mainExport = file.ai_analysis.exports?.find(exp => {
              // Match export name with file name (e.g., Button.tsx -> Button)
              const componentName = name.replace(/\.[^/.]+$/, '');
              return exp.name === componentName || exp.name === `default` || exp.name.toLowerCase() === componentName.toLowerCase();
            });

            if (mainExport?.purpose) {
              purpose = cleanSummary(mainExport.purpose);
            } else {
              // Try to find the main class's purpose
              const mainClass = file.ai_analysis.classes?.find(cls => {
                const componentName = name.replace(/\.[^/.]+$/, '');
                return cls.name === componentName || cls.name.toLowerCase() === componentName.toLowerCase();
              });

              if (mainClass?.purpose) {
                purpose = cleanSummary(mainClass.purpose);
              } else if (file.ai_analysis.summary) {
                // Fallback to file summary if no matching export or class found
                purpose = cleanSummary(file.ai_analysis.summary);
              }
            }

            // Get rich dependency information including purposes
            if (file.ai_analysis.imports) {
              dependencies = file.ai_analysis.imports.map(imp => imp.path);

              // Add import purposes as comments in the components.json
              const importPurposes = file.ai_analysis.imports
                .filter(imp => imp.purpose && imp.purpose !== 'Unknown')
                .map(imp => `${imp.path}: ${imp.purpose}`);
              
              if (importPurposes.length > 0) {
                purpose += '\nDependencies:\n- ' + importPurposes.join('\n- ');
              }
            }

            // Add integration points if available
            const integrationPoints = file.ai_analysis.integrationPoints;
            if (integrationPoints && integrationPoints.length > 0) {
              const integrations = integrationPoints
                .map(int => `${int.type} ${int.name}: ${int.purpose}`);
              purpose += '\nIntegrations:\n- ' + integrations.join('\n- ');
            }
        }

          // Only fall back to basic import extraction if no AI analysis available
          if (dependencies.length === 0) {
            dependencies = extractImports(file.content || '');
          }

          // If we still don't have a purpose, use the determinePurpose function
          if (purpose === 'Unknown') {
            purpose = await determinePurpose(file.content || '', filePath);
          }

          // Add component to the group
          components[groupName].components.push({
            name,
            purpose,
            dependencies,
            location: filePath
          });
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
        }
      }
    };

    await processFiles();

    // Sort components within each group by name
    for (const group of Object.values(components)) {
      group.components.sort((a, b) => a.name.localeCompare(b.name));
    }

    return components;
  } catch (error: unknown) {
    console.error('Error generating component metadata:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while generating component metadata');
  }
};

// Helper functions
function extractImports(content: string): string[] {
  const importRegex = /import\s+(?:{[^}]*}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractExports(content: string): string[] {
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|const)\s+(\w+)/g;
  const exports: string[] = [];
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

interface GeminiResponse {
  text: string;
  error?: string;
}



async function determinePurpose(content: string, filePath: string): Promise<string> {
  if (!content) return 'Unknown';
  
  // Try to get purpose from AI analysis
  try {
    const prompt = `Analyze this React component and provide a brief (10-15 words) description of its purpose and functionality:

${content}`;
    
    // Call AI service and handle response
    const aiResponse = await generateAISummary(content, filePath, prompt);
    if (!aiResponse.error && aiResponse.candidates?.[0]?.content.parts[0]?.text) {
      return cleanSummary(aiResponse.candidates[0].content.parts[0].text);
    }
  } catch (error) {
    console.warn('AI analysis failed, falling back to heuristic analysis:', error);
  }

  // Enhanced heuristic analysis if AI fails
  const lowerContent = content.toLowerCase();
  
  // Check for common component patterns
  if (lowerContent.includes('@description') || lowerContent.includes('* description:')) {
    const descMatch = content.match(/@description\s+([^\n]+)/) || content.match(/\* description:\s+([^\n]+)/);
    if (descMatch?.[1]) {
      return cleanSummary(descMatch[1]);
    }
  }

  // Check component props for hints about purpose
  const propsMatch = content.match(/interface\s+\w+Props\s*{([^}]+)}/s);
  if (propsMatch) {
    const props = propsMatch[1].split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .join(', ');
    if (props) {
      return `Component that handles ${props}`;
    }
  }

  // Check for common UI patterns
  if (lowerContent.includes('modal')) return 'Modal dialog component';
  if (lowerContent.includes('button')) return 'Button component with custom styling';
  if (lowerContent.includes('form')) return 'Form handling component';
  if (lowerContent.includes('list')) return 'List display component';
  if (lowerContent.includes('table')) return 'Table display component';
  if (lowerContent.includes('card')) return 'Card layout component';
  if (lowerContent.includes('nav')) return 'Navigation component';
  
  // Default categorization
  if (content.includes('React.Component') || content.includes('extends Component')) {
    return 'Class-based React component';
  } else if (content.includes('function') && content.includes('return') && content.includes('jsx')) {
    return 'Functional React component';
  }
  
  return 'Unknown component type';
}

// Helper function to clean up the summary
function cleanSummary(summary: string): string {
  let cleanedSummary = summary
    .split(/[.!?]/)
    .filter(sentence => sentence.trim().length > 0)[0]
    .trim()
    .replace(/^This component /i, '')
    .replace(/^Component /i, '')
    .replace(/\s+/g, ' ');

  return cleanedSummary.length > 150 
    ? cleanedSummary.substring(0, 147) + '...'
    : cleanedSummary;
}
