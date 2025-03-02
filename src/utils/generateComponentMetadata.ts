import { generateAISummary } from '../services/ai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RepositoryFile } from '../types/repository';

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

interface FileMetadata {
  content: string;
  imports?: string[];
  exports?: string[];
  // Add other relevant metadata fields
}

interface DirectoryMetadata {
  files: string[];
  // Add other relevant directory metadata fields
}

interface NewMetadata {
  files: { [path: string]: FileMetadata };
  directories: { [path: string]: DirectoryMetadata };
}

export const generateComponentMetadata = async (
  files: RepositoryFile[],
  repoPath: string
) => {
  try {
    if (!repoPath) {
      throw new Error('No repository connected');
    }

    // Map files to their paths when needed
    const filePaths = files.map(file => file.path);

    // Fetch repository data
    const repoId = repoPath.replace('/', '_');
    const filesCollection = collection(db, `repositories/${repoId}/files`);
    const filesSnapshot = await getDocs(filesCollection);
    const repoFiles = filesSnapshot.docs.map((doc) => doc.data() as RepositoryFile);

    // Convert to NewMetadata format
    const metadata: NewMetadata = {
      files: {},
      directories: {}
    };

    // Process files and build directory structure
    repoFiles.forEach(file => {
      metadata.files[file.path] = {
        content: file.content || '',
        imports: extractImports(file.content || ''),
        exports: extractExports(file.content || '')
      };

      // Build directory structure
      const dirPath = file.path.split('/').slice(0, -1).join('/');
      if (!metadata.directories[dirPath]) {
        metadata.directories[dirPath] = { files: [] };
      }
      metadata.directories[dirPath].files.push(file.path);
    });

    const components: ComponentMetadata = {};
    
    // Find potential component directories
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
    Object.keys(metadata.directories).forEach(dirPath => {
      if (componentPatterns.some(pattern => pattern.test(dirPath))) {
        componentDirs.add(dirPath);
      }
    });

    // Process each file to group by immediate parent directory
    Object.entries(metadata.files).forEach(([filePath, file]) => {
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (!['jsx', 'tsx', 'vue', 'svelte'].includes(extension || '')) return;

      // Get the directory path and group name
      const pathParts = filePath.split('/');
      const fileName = pathParts.pop() || '';
      const dirPath = pathParts.join('/');
      const groupName = pathParts[pathParts.length - 1] || 'root';

      // Only process files that are in or under component directories
      if (Array.from(componentDirs).some(dir => filePath.startsWith(dir))) {
        if (!components[groupName]) {
          components[groupName] = {
            location: dirPath,
            components: []
          };
        }

        const name = fileName.replace(/\.[^/.]+$/, '');
        
        // Find the corresponding repository file
        const repoFile = repoFiles.find(rf => rf.path === filePath);
        let purpose = 'Unknown';
        let dependencies: string[] = [];
        
        if (repoFile?.ai_analysis) {
          // Extract purpose from summary
          if (repoFile.ai_analysis.summary) {
            purpose = cleanSummary(repoFile.ai_analysis.summary);
          }
          
          // Extract dependencies from imports
          if (repoFile.ai_analysis.imports) {
            dependencies = repoFile.ai_analysis.imports.map(imp => imp.path);
          }
        }

        if (purpose === 'Unknown') {
          // Fallback to basic purpose detection
          purpose = determinePurpose(file);
        }

        if (dependencies.length === 0) {
          // Fallback to extracted imports
          dependencies = file.imports || [];
        }

        components[groupName].components.push({
          name,
          purpose,
          dependencies,
          location: filePath
        });
      }
    });

    // Sort components within each group by name
    Object.values(components).forEach(group => {
      group.components.sort((a, b) => a.name.localeCompare(b.name));
    });

    return components;
  } catch (error: unknown) {
    console.error('Error generating component metadata:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while generating metadata');
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

function determinePurpose(file: FileMetadata): string {
  // Simple heuristic based on file content
  const content = file.content.toLowerCase();
  if (content.includes('react.component') || content.includes('extends component')) {
    return 'Class Component';
  } else if (content.includes('function') && content.includes('return') && content.includes('jsx')) {
    return 'Functional Component';
  }
  return 'Unknown';
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
