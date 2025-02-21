import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getRepositoryFiles, getFileContent } from '../../services/github';
import { generateAISummary, GeminiResponse } from '../../services/geminiFrontend';
import { typography } from '../../styles/theme';
import { useAccount } from '../../context/AccountContext';
import { doc, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface RepositoryFile {
  path: string;
  type: string;
}

interface CursorMetadata {
  files: {
    [path: string]: {
      description: string;
      features: string[];
      dependencies: string[];
      lastAnalyzed: string;
      functions?: {
        name: string;
        purpose: string;
      }[];
      classes?: {
        name: string;
        purpose: string;
      }[];
      imports?: string[];
      exports?: string[];
      language: string;
      size: number;
    };
  };
  directories: {
    [path: string]: {
      purpose: string;
      patterns: string[];
      files: string[];
      summary?: string;
    };
  };
}

interface CodebaseSummary {
  name: string;
  description: string;
  stack: {
    frontend: {
      mainLanguage: string;
      framework: string;
      styling: string;
      keyLibraries: string[];
    };
    backend: {
      mainLanguage: string;
      services: string[];
      keyFeatures: string[];
    };
  };
  mainFeatures: string[];
  directoryStructure: Record<string, string>;
}

interface ComponentMetadata {
  [key: string]: {
    location: string;
    components: Array<{
      name: string;
      purpose: string;
      dependencies?: string[];
      location?: string;
    }>;
  };
}

// Add new type for rules
interface CursorRules {
  rules: Array<{
    pattern: string;
    context: {
      imports?: boolean;
      functions?: boolean;
      classes?: boolean;
      summary?: boolean;
      dependencies?: boolean;
      apiEndpoints?: boolean;
      stateInteractions?: boolean;
    };
  }>;
  contextProviders: Array<{
    name: string;
    path: string;
  }>;
}

interface CursorSettings {
  analysis: {
    excludePatterns: string[];
    maxFileSize: number;
    ignoreDependencies: string[];
    includeTests: boolean;
    languages: string[];
    frameworks: string[];
  };
  repository: {
    mainBranch: string;
    packageManager: string;
    buildTool: string;
    testFrameworks: string[];
  };
}

// Add interfaces for metadata structure
interface FileMetadata {
  description: string;
  features: string[];
  dependencies: string[];
  lastAnalyzed: string;
  functions?: Array<{
    name: string;
    purpose: string;
    params?: string[];
    returns?: string;
  }>;
  classes?: Array<{
    name: string;
    purpose: string;
  }>;
  imports: string[];
  exports: string[];
  language: string;
  size: number;
}

interface DirectoryMetadata {
  purpose: string;
  patterns: string[];
  files: string[];
  summary?: string;
}

interface NewMetadata {
  files: Record<string, FileMetadata>;
  directories: Record<string, DirectoryMetadata>;
}

interface MetadataState {
  files: Record<string, FileMetadata>;
  directories: Record<string, DirectoryMetadata>;
  codebaseSummary: CodebaseSummary;
  components: ComponentMetadata;
  rules: CursorRules;
  settings: CursorSettings;
}

interface FirebaseFile {
  path: string;
  content?: string;
  language?: string;
  name?: string;
  size?: number;
  imports?: string[];
  exports?: string[];
  functions?: any[];
  classes?: any[];
  summary?: string;
  last_updated?: string;
}

// Add these type definitions at the top
type TabType = 'request' | 'response' | 'formatted' | 'metrics' | 'architecture-prompt' | 'architecture-response';
type CopyStatusType = 'none' | 'request' | 'response' | 'formatted';

// Add this near the top of the file, outside the component
const enhancedPrompt = `
Analyze this codebase metadata and generate a comprehensive codebase summary in JSON format.

METADATA:
Directory Structure:
{{DIRECTORIES}}

File Types: {{FILE_TYPES}}

Dependencies: {{DEPENDENCIES}}

Package Info: {{PACKAGE_JSON}}

Testing Strategy:
- Frameworks: {{TEST_FRAMEWORKS}}
- Test Files: {{TEST_FILES}}

State Management:
- Patterns: {{STATE_PATTERNS}}
- Store Files: {{STORE_FILES}}

API Integrations: {{API_INTEGRATIONS}}

Common Patterns: {{COMMON_PATTERNS}}

Component Organization: {{COMPONENT_ORGANIZATION}}

Generate a CodebaseSummary object with this structure:
{
  "name": "Project name",
  "description": "Comprehensive description of the project's purpose and architecture",
  "stack": {
    "frontend": {
      "mainLanguage": "Primary frontend language",
      "framework": "Main frontend framework",
      "styling": "Primary styling solution",
      "keyLibraries": ["Important frontend libraries"],
      "testingStrategy": "Description of testing approach",
      "stateManagement": "Description of state management approach"
    },
    "backend": {
      "mainLanguage": "Primary backend language",
      "services": ["Key backend services"],
      "keyFeatures": ["Main backend features"],
      "apiArchitecture": "Description of API architecture"
    }
  },
  "patterns": {
    "common": ["List of common patterns used"],
    "architecture": "Description of architectural patterns",
    "componentOrganization": "Description of component organization strategy"
  },
  "mainFeatures": ["Key features of the application"],
  "directoryStructure": {
    "directory": "Purpose and content description"
  },
  "developmentPractices": {
    "testing": "Testing approach description",
    "stateManagement": "State management strategy",
    "componentPatterns": "Common component patterns",
    "dataFlow": "Description of data flow patterns"
  }
}

Focus on:
1. Accurate technology identification
2. Main architectural patterns
3. Key features and capabilities
4. Clear directory structure explanation
5. Development practices and patterns
6. Testing and state management approaches

Return only valid JSON, no additional text.`;

// Add new prompt template
const architecturePrompt = `
Analyze this codebase metadata and generate a comprehensive ARCHITECTURE.md document.

METADATA:
Directory Structure:
{{DIRECTORIES}}

Tech Stack:
- Frontend: {{FRONTEND_TECH}}
- Backend: {{BACKEND_TECH}}
- Database: {{DATABASE_TECH}}
- APIs: {{API_TECH}}

Dependencies: {{DEPENDENCIES}}

Component Structure:
{{COMPONENT_STRUCTURE}}

State Management:
{{STATE_MANAGEMENT}}

Data Flow:
{{DATA_FLOW}}

Security:
{{SECURITY}}

Generate an ARCHITECTURE.md document that includes:

1. System Overview
   - Purpose
   - Key Features
   - Technical Stack
   - System Requirements
   - Performance Targets

2. Architecture Design
   - High-level Architecture
   - Component Structure
   - Data Flow
   - State Management
   - API Design
   - Database Schema
   - Caching Strategy

3. Security
   - Authentication Flow
   - Authorization Levels
   - Data Protection
   - API Security
   - Environment Security
   - Security Best Practices

4. Development Practices
   - Code Organization
   - Testing Strategy
     * Unit Testing
     * Integration Testing
     * E2E Testing
     * Test Coverage Goals
   - Deployment Process
     * Development Workflow
     * Staging Environment
     * Production Deployment
     * Rollback Procedures
   - CI/CD Pipeline
   - Code Review Process
   - Documentation Standards

5. Performance
   - Performance Metrics
     * Target Response Times
     * Load Handling
     * Concurrent Users
   - Optimization Strategies
     * Frontend Optimization
     * Backend Optimization
     * Database Query Optimization
   - Caching Implementation
     * Browser Caching
     * API Caching
     * Database Caching
   - Monitoring
     * Key Metrics
     * Alert Thresholds
     * Logging Strategy

6. Error Handling
   - Error Categories
   - Error Response Format
   - Recovery Procedures
   - Logging Standards
   - Monitoring and Alerts
   - User Error Messages

7. State Management
   - Context Structure
   - State Update Patterns
   - Data Persistence
   - Real-time Updates
   - Offline Support
   - State Synchronization

8. API Documentation
   - RESTful Endpoints
   - Request/Response Formats
   - Authentication Headers
   - Rate Limiting
   - Error Responses
   - API Versioning
   - Webhook Integration

9. External Dependencies
   - Third-party Services
   - Key Libraries
   - Integration Points
   - Fallback Strategies
   - Version Management
   - License Compliance

10. Development Environment
    - Setup Instructions
    - Required Tools
    - Environment Variables
    - Local Development
    - Testing Environment
    - Debugging Tools

11. Maintenance
    - Backup Strategy
    - Update Procedures
    - Health Checks
    - Performance Monitoring
    - Security Audits
    - Technical Debt Management

12. Future Considerations
    - Scalability Plans
    - Feature Roadmap
    - Technology Updates
    - Architecture Evolution
    - Performance Improvements
    - Security Enhancements

Format the response in Markdown, focusing on:
1. Clear structure and headings
2. Technical accuracy
3. Implementation details
4. Code examples where relevant
5. Configuration snippets
6. Diagrams (using mermaid syntax)
7. Best practices
8. Common pitfalls
9. Troubleshooting guides
10. Future considerations

Include practical examples and specific implementation details where possible.
`;

export default function CursorExtractionTool() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('formatted');
  const [lastRequest, setLastRequest] = useState<string>('');
  const [prompt, setPrompt] = useState<string>(
    `You are a code analysis expert. Generate Cursor AI configuration for this file. Return a JSON object with this structure:

{
  "settings": {
    "fileDescription": "Detailed description of the file's purpose",
    "technologies": ["technologies used in this file"],
    "dependencies": ["direct dependencies"],
    "contextRules": {
      "imports": true,
      "functions": true,
      "classes": true,
      "description": "How this file should be understood"
    }
  },
  "analysis": {
    "primaryFeatures": ["key features"],
    "stateManagement": ["state management approaches"],
    "dataFlow": ["data flow patterns"],
    "integrationPoints": ["integration points"],
    "commonModifications": ["typical modifications needed"]
  },
  "metadata": {
    "path": "{{FILEPATH}}",
    "language": "file language",
    "lastAnalyzed": "timestamp",
    "complexity": {
      "cognitive": "estimated cognitive complexity",
      "cyclomatic": "estimated cyclomatic complexity"
    }
  }
}

FILE PATH: {{FILEPATH}}

CODE CONTENT:
\`\`\`typescript
{{CONTENT}}
\`\`\`

Important guidelines:
1. Focus on development-relevant details
2. Include all direct dependencies
3. Identify key integration points
4. Note common modification patterns
5. Assess code complexity
6. Consider context requirements

Return only the JSON object, no additional text or explanation.`
  );
  const [response, setResponse] = useState<GeminiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentAccount } = useAccount();
  const [copyStatus, setCopyStatus] = useState<CopyStatusType>('none');
  const [metadata, setMetadata] = useState<MetadataState>({
    files: {},
    directories: {},
    codebaseSummary: {
      name: '',
      description: '',
      stack: {
        frontend: { mainLanguage: '', framework: '', styling: '', keyLibraries: [] },
        backend: { mainLanguage: '', services: [], keyFeatures: [] }
      },
      mainFeatures: [],
      directoryStructure: {}
    },
    components: {},
    rules: { rules: [], contextProviders: [] },
    settings: {
      analysis: {
        excludePatterns: [],
        maxFileSize: 0,
        ignoreDependencies: [],
        includeTests: false,
        languages: [],
        frameworks: []
      },
      repository: {
        mainBranch: '',
        packageManager: '',
        buildTool: '',
        testFrameworks: []
      }
    }
  });
  const [error, setError] = useState<string | null>(null);

  // Add new state for tracking the prompt and response
  const [summaryPrompt, setSummaryPrompt] = useState<string>(`Analyze this codebase metadata and generate a comprehensive codebase summary in JSON format.

METADATA:
Directory Structure:
{{DIRECTORIES}}

File Types: {{FILE_TYPES}}

Dependencies: {{DEPENDENCIES}}

Package Info: {{PACKAGE_JSON}}

Generate a CodebaseSummary object with this structure:
{
  "name": "Project name",
  "description": "Comprehensive description of the project's purpose and architecture",
  "stack": {
    "frontend": {
      "mainLanguage": "Primary frontend language",
      "framework": "Main frontend framework",
      "styling": "Primary styling solution",
      "keyLibraries": ["Important frontend libraries"]
    },
    "backend": {
      "mainLanguage": "Primary backend language",
      "services": ["Key backend services"],
      "keyFeatures": ["Main backend features"]
    }
  },
  "mainFeatures": ["Key features of the application"],
  "directoryStructure": {
    "directory": "Purpose and content description"
  }
}

Focus on:
1. Accurate technology identification
2. Main architectural patterns
3. Key features and capabilities
4. Clear directory structure explanation

Return only valid JSON, no additional text.`);

  const [summaryResponse, setSummaryResponse] = useState<{
    prompt: string;
    response: string;
  } | null>(null);

  // Add state for architecture response
  const [architectureResponse, setArchitectureResponse] = useState<{
    prompt: string;
    response: string;
  } | null>(null);

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    return files.filter(file => 
      file.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const repoFiles = await getRepositoryFiles('mmbely/qeek');
        const filePaths = (repoFiles as RepositoryFile[]).map(f => f.path);
        setFiles(filePaths);
      } catch (error) {
        console.error('Error loading files:', error);
        setFiles([]);
      }
    };
    loadFiles();
  }, []);

  const handleTest = async () => {
    try {
      setLoading(true);
      
      if (!currentAccount?.id) {
        throw new Error('No account selected');
      }

      const fileContent = await getFileContent('mmbely/qeek', selectedFile, currentAccount.id);
      
      const fullPrompt = prompt
        .replace('{{FILEPATH}}', selectedFile)
        .replace('{{CONTENT}}', fileContent);
      
      setLastRequest(fullPrompt);
      
      const result = await generateAISummary(fileContent, selectedFile, fullPrompt);
      setResponse(result);
    } catch (error) {
      console.error('Error in handleTest:', error);
      setResponse({ 
        error: error instanceof Error ? error.message : 'Failed to process request'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, type: typeof copyStatus) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus('none'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Helper function to format the Gemini response
  const getFormattedResponse = () => {
    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return 'No response content available';
    }
    return response.candidates[0].content.parts[0].text;
  };

  const generateCodebaseSummary = async (metadata: NewMetadata): Promise<CodebaseSummary> => {
    // First collect basic metadata for AI context
    const metadataForAI = {
      directories: Object.keys(metadata.directories),
      fileTypes: new Set<string>(),
      dependencies: new Set<string>(),
      mainFiles: [] as string[],
      packageJson: null as any
    };

    // Collect important metadata
    Object.entries(metadata.files).forEach(([path, file]) => {
      // Track file types
      const ext = path.split('.').pop();
      if (ext) metadataForAI.fileTypes.add(ext);

      // Collect dependencies
      file.dependencies.forEach(dep => metadataForAI.dependencies.add(dep));

      // Track important files
      if (path.endsWith('package.json') || 
          path.endsWith('tsconfig.json') ||
          path.endsWith('README.md')) {
        metadataForAI.mainFiles.push(path);
      }

      // Parse package.json if found
      if (path.endsWith('package.json')) {
        try {
          metadataForAI.packageJson = JSON.parse(file.description);
        } catch (e) {
          console.warn('Failed to parse package.json');
        }
      }
    });

    const prompt = `Analyze this codebase metadata and generate a comprehensive codebase summary in JSON format.

METADATA:
Directory Structure:
${metadataForAI.directories.join('\n')}

File Types: ${Array.from(metadataForAI.fileTypes).join(', ')}

Dependencies: ${Array.from(metadataForAI.dependencies).join(', ')}

Package Info: ${JSON.stringify(metadataForAI.packageJson, null, 2)}

Generate a CodebaseSummary object with this structure:
{
  "name": "Project name",
  "description": "Comprehensive description of the project's purpose and architecture",
  "stack": {
    "frontend": {
      "mainLanguage": "Primary frontend language",
      "framework": "Main frontend framework",
      "styling": "Primary styling solution",
      "keyLibraries": ["Important frontend libraries"]
    },
    "backend": {
      "mainLanguage": "Primary backend language",
      "services": ["Key backend services"],
      "keyFeatures": ["Main backend features"]
    }
  },
  "mainFeatures": ["Key features of the application"],
  "directoryStructure": {
    "directory": "Purpose and content description"
  }
}

Focus on:
1. Accurate technology identification
2. Main architectural patterns
3. Key features and capabilities
4. Clear directory structure explanation

Return only valid JSON, no additional text.`;

    try {
      const aiResponse = await generateAISummary(
        JSON.stringify(metadataForAI),
        'codebase-summary',
        prompt
      );

      if (!aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid AI response');
      }

      const aiSummary = JSON.parse(aiResponse.candidates[0].content.parts[0].text);
      return aiSummary;

    } catch (error) {
      console.error('AI summary generation failed:', error);
      // Fallback to basic summary
      return {
        name: metadataForAI.packageJson?.name || 'Unknown Project',
        description: 'Failed to generate AI description',
        stack: {
          frontend: {
            mainLanguage: '',
            framework: '',
            styling: '',
            keyLibraries: Array.from(metadataForAI.dependencies)
          },
          backend: {
            mainLanguage: '',
            services: [],
            keyFeatures: []
          }
        },
        mainFeatures: [],
        directoryStructure: Object.fromEntries(
          metadataForAI.directories
            .filter(dir => !dir.includes('/'))
            .map(dir => [dir, 'Directory purpose not available'])
        )
      };
    }
  };

  const analyzeArchitecture = (directories: Record<string, DirectoryMetadata>): string[] => {
    const patterns = [];
    const paths = Object.keys(directories);

    if (paths.some(p => p.includes('components'))) patterns.push('Component-Based');
    if (paths.some(p => p.includes('pages'))) patterns.push('Page-Based Routing');
    if (paths.some(p => p.includes('services'))) patterns.push('Service Layer');
    if (paths.some(p => p.includes('hooks'))) patterns.push('Custom Hooks');
    if (paths.some(p => p.includes('context'))) patterns.push('Context API');
    if (paths.some(p => p.includes('redux'))) patterns.push('Redux State Management');
    if (paths.some(p => p.includes('api'))) patterns.push('API Layer');
    if (paths.some(p => p.includes('utils'))) patterns.push('Utility Functions');
    if (paths.some(p => p.includes('types'))) patterns.push('TypeScript');
    if (paths.some(p => p.includes('tests'))) patterns.push('Unit Testing');

    return patterns;
  };

  const generateDetailedDirectoryStructure = (directories: Record<string, DirectoryMetadata>): Record<string, string> => {
    return Object.entries(directories)
      .filter(([path]) => !path.includes('/')) // Only root directories
      .reduce((acc, [path, dir]) => ({
        ...acc,
        [path]: `${dir.purpose} (${dir.files.length} files, ${dir.patterns.join(', ')})`
      }), {});
  };

  const generateDescription = (
    technologies: any,
    features: any,
    architecturePatterns: string[]
  ): string => {
    const frontend = Array.from(technologies.frameworks).join(', ');
    const backend = Array.from(technologies.services).join(', ');
    const databases = Array.from(technologies.databases).join(', ');
    const mainFeatures = Array.from(features.main).slice(0, 3).join(', ');
    const architecture = architecturePatterns.slice(0, 3).join(', ');

    return `A ${frontend} application ${backend ? `with ${backend} backend` : ''} ${databases ? `using ${databases}` : ''}. ` +
      `Key features include ${mainFeatures}. ` +
      `The codebase follows ${architecture} architectural patterns.`;
  };

  // Helper functions
  const extractProjectName = (metadata: NewMetadata): string => {
    // Try to find package.json
    const packageJson = Object.entries(metadata.files)
      .find(([path]) => path.endsWith('package.json'));
    
    if (packageJson) {
      try {
        const content = JSON.parse(packageJson[1].description);
        return content.name || 'Unknown Project';
      } catch {
        // If parsing fails, try to extract from directory structure
        return extractNameFromDirectory(metadata);
      }
    }
    
    return extractNameFromDirectory(metadata);
  };

  const extractNameFromDirectory = (metadata: NewMetadata): string => {
    // Get the root directory name
    const rootDirs = Object.keys(metadata.directories)
      .filter(path => !path.includes('/'))
      .filter(dir => !['src', 'dist', 'build', 'public'].includes(dir));
    
    return rootDirs[0] || 'Unknown Project';
  };

  const findMainLanguage = (languages: Set<string>, type: 'frontend' | 'backend'): string => {
    const langs = Array.from(languages);
    if (type === 'frontend') {
      return langs.find(l => ['TypeScript', 'JavaScript'].includes(l)) || langs[0] || '';
    }
    return langs.find(l => ['Python', 'Node.js', 'Java', 'Go'].includes(l)) || langs[0] || '';
  };

  const generateComponentMetadata = async (metadata: NewMetadata): Promise<ComponentMetadata> => {
    const components: ComponentMetadata = {};
    
    // Find potential component directories by analyzing patterns
    const componentDirs = new Set<string>();
    const componentPatterns = [
      /components?/i,                    // Matches 'component' or 'components'
      /views?/i,                         // Matches 'view' or 'views'
      /pages?/i,                         // Matches 'page' or 'pages'
      /screens?/i,                       // Matches 'screen' or 'screens'
      /layouts?/i,                       // Matches 'layout' or 'layouts'
      /containers?/i,                    // Matches 'container' or 'containers'
      /widgets?/i                        // Matches 'widget' or 'widgets'
    ];

    // Analyze directory structure
    Object.keys(metadata.directories).forEach(dirPath => {
      // Check if directory matches any component pattern
      if (componentPatterns.some(pattern => pattern.test(dirPath))) {
        // Get the parent directory as the component group
        const parts = dirPath.split('/');
        const groupName = parts[parts.length - 2] || parts[parts.length - 1];
        componentDirs.add(dirPath);
        
        if (!components[groupName]) {
          components[groupName] = {
            location: dirPath,
            components: []
          };
        }
      }
    });

    // Process each component directory
    componentDirs.forEach(dirPath => {
      const dir = metadata.directories[dirPath];
      const groupName = dirPath.split('/').slice(-2)[0];

      // Process each file in the directory
      dir.files.forEach(filePath => {
        const file = metadata.files[filePath];
        if (!file) return;

        // Only process component files (typically .jsx, .tsx, .vue, etc.)
        const extension = filePath.split('.').pop()?.toLowerCase();
        if (!['jsx', 'tsx', 'vue', 'svelte'].includes(extension || '')) return;

        // Extract component name from file path
        const name = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';

        // Analyze file content to determine purpose and dependencies
        const purpose = determinePurpose(file);
        const dependencies = extractDependencies(file);

        // Add component to the group
        components[groupName].components.push({
          name,
          purpose,
          dependencies,
          location: filePath
        });
      });
    });

    return components;
  };

  // Helper function to determine component purpose
  const determinePurpose = (file: FileMetadata): string => {
    // Start with file description if available
    if (file.description) {
      return file.description.split('.')[0];
    }

    // Analyze features to determine purpose
    const purposeHints = [];
    
    if (file.features.includes('external dependencies')) {
      purposeHints.push('integration');
    }
    
    if (file.imports.some(imp => imp.includes('redux') || imp.includes('context'))) {
      purposeHints.push('state management');
    }
    
    if (file.imports.some(imp => imp.includes('router'))) {
      purposeHints.push('routing');
    }
    
    if (file.imports.some(imp => imp.includes('form'))) {
      purposeHints.push('form handling');
    }

    return purposeHints.length > 0
      ? `Component for ${purposeHints.join(' and ')}`
      : 'UI component';
  };

  // Helper function to extract relevant dependencies
  const extractDependencies = (file: FileMetadata): string[] => {
    return file.imports
      .filter(imp => 
        // Filter out relative imports and common utilities
        !imp.startsWith('.') && 
        !imp.startsWith('@types') &&
        !['react', 'react-dom'].includes(imp)
      )
      .map(imp => imp.split('/')[0]); // Get main package name
  };

  const generateRules = (metadata: NewMetadata): CursorRules => {
    const rules: CursorRules['rules'] = [];
    const filePatterns = new Set<string>();
    const fileTypes = new Set<string>();

    // Analyze directory structure to determine patterns
    Object.keys(metadata.directories).forEach(dirPath => {
      const dir = metadata.directories[dirPath];
      
      // Extract file patterns from directory
      dir.files.forEach(filePath => {
        const extension = filePath.split('.').pop() || '';
        fileTypes.add(extension);
        
        // Get the base directory pattern
        const baseDir = filePath.split('/')[0];
        if (baseDir) {
          filePatterns.add(`${baseDir}/**/*`);
        }
      });
    });

    // Generate rules based on discovered patterns
    filePatterns.forEach(pattern => {
      const rule: CursorRules['rules'][0] = {
        pattern,
        context: {
          imports: true,
          functions: true,
          classes: true,
          summary: true
        }
      };

      // Add specific context based on pattern
      if (pattern.startsWith('src/components/')) {
        rule.context.stateInteractions = true;
      }
      
      if (pattern.startsWith('src/services/')) {
        rule.context.dependencies = true;
        rule.context.apiEndpoints = true;
      }

      if (pattern.startsWith('backend/')) {
        rule.context.dependencies = true;
        rule.context.apiEndpoints = true;
      }

      rules.push(rule);
    });

    // Add specific rules for file types
    fileTypes.forEach(extension => {
      if (['ts', 'tsx'].includes(extension)) {
        rules.push({
          pattern: `**/*.${extension}`,
          context: {
            imports: true,
            functions: true,
            classes: true,
            summary: true
          }
        });
      }

      if (extension === 'test.ts' || extension === 'test.tsx') {
        rules.push({
          pattern: `**/*.test.{ts,tsx}`,
          context: {
            functions: true,
            summary: true
          }
        });
      }
    });

    // Sort rules by specificity (more specific patterns first)
    rules.sort((a, b) => {
      const aSpecificity = a.pattern.split('/').length;
      const bSpecificity = b.pattern.split('/').length;
      return bSpecificity - aSpecificity;
    });

    return {
      rules: rules.filter((rule, index, self) => 
        // Remove duplicate patterns
        index === self.findIndex(r => r.pattern === rule.pattern)
      ),
      contextProviders: [
        {
          name: "repository-metadata",
          path: ".cursor/metadata/"
        }
      ]
    };
  };

  const generateSettings = (metadata: NewMetadata): CursorSettings => {
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    const testFrameworks = new Set<string>();
    const dependencies = new Set<string>();
    
    // Analyze files to determine settings
    Object.values(metadata.files).forEach((file: FileMetadata) => {
      if (file.language) {
        languages.add(file.language);
      }
      
      // Add all dependencies to the set
      file.dependencies.forEach(dep => {
        dependencies.add(dep);
        
        // Detect frameworks
        if (dep.includes('react') || dep.includes('vue') || dep.includes('angular')) {
          frameworks.add(dep);
        }
        
        // Detect test frameworks
        if (dep.includes('jest') || dep.includes('mocha') || dep.includes('cypress')) {
          testFrameworks.add(dep);
        }
      });
    });

    // Check for package manager and build tool from directory structure
    const hasYarnLock = Object.keys(metadata.directories).some(dir => 
      dir.includes('yarn.lock'));
    const hasViteConfig = Object.keys(metadata.directories).some(dir => 
      dir.includes('vite.config.'));

    return {
      analysis: {
        excludePatterns: [
          'node_modules/**',
          'build/**',
          'dist/**',
          '.git/**',
          '**/test/**',
          '**/*.test.*',
          '**/*.spec.*'
        ],
        maxFileSize: 1000000, // 1MB
        ignoreDependencies: Array.from(dependencies)
          .filter(dep => dep.startsWith('@types/') || dep.includes('-loader')),
        includeTests: Object.keys(metadata.files).some(path => path.includes('.test.')),
        languages: Array.from(languages),
        frameworks: Array.from(frameworks)
      },
      repository: {
        mainBranch: 'main',
        packageManager: hasYarnLock ? 'yarn' : 'npm',
        buildTool: hasViteConfig ? 'vite' : 'webpack',
        testFrameworks: Array.from(testFrameworks)
      }
    };
  };

  const generateMetadata = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentAccount?.id || !currentAccount?.settings?.githubRepository) {
        throw new Error('No account or repository selected');
      }

      const repoPath = currentAccount.settings.githubRepository.replace('/', '_');
      const repoRef = doc(db, 'repositories', repoPath);
      const repoDoc = await getDoc(repoRef);

      if (!repoDoc.exists()) {
        throw new Error('Repository not found');
      }

      // Fetch all files from the repository
      const filesCollectionRef = collection(repoRef, 'files');
      const filesSnapshot = await getDocs(filesCollectionRef);

      const newMetadata: NewMetadata = {
        files: {},
        directories: {}
      };

      // Process files
      filesSnapshot.docs.forEach(doc => {
        const file = doc.data() as FirebaseFile;
        
        // Add file metadata
        newMetadata.files[file.path] = {
          description: file.summary || `${file.name} file`,
          features: extractFeatures(file),
          dependencies: file.imports || [],
          lastAnalyzed: file.last_updated || new Date().toISOString(),
          functions: file.functions,
          classes: file.classes,
          imports: file.imports || [],
          exports: file.exports || [],
          language: file.language || '',
          size: file.size || 0
        };

        // Process directory structure
        const dirPath = file.path.split('/').slice(0, -1).join('/');
        if (dirPath) {
          if (!newMetadata.directories[dirPath]) {
            newMetadata.directories[dirPath] = {
              purpose: `Contains ${file.language} files`,
              patterns: [`*.${file.path.split('.').pop()}`],
              files: []
            };
          }
          newMetadata.directories[dirPath].files.push(file.path);
        }
      });

      // Generate directory summaries
      Object.keys(newMetadata.directories).forEach(dirPath => {
        const dir = newMetadata.directories[dirPath];
        dir.summary = generateDirectorySummary(dir, newMetadata.files);
      });

      // Generate all metadata files
      const codebaseSummary = await generateCodebaseSummary(newMetadata);
      const componentMetadata = await generateComponentMetadata(newMetadata);
      const rules = generateRules(newMetadata);
      const settings = generateSettings(newMetadata);

      setMetadata({
        files: newMetadata.files,
        directories: newMetadata.directories,
        codebaseSummary,
        components: componentMetadata,
        rules,
        settings
      });

    } catch (error) {
      console.error('Error generating metadata:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate metadata');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract features from a file
  const extractFeatures = (file: FirebaseFile): string[] => {
    const features: string[] = [];
    
    // Use optional chaining and nullish coalescing to safely check array lengths
    if ((file.imports ?? []).length > 0) {
      features.push('external dependencies');
    }
    
    if ((file.functions ?? []).length > 0) {
      features.push('function definitions');
    }
    
    if ((file.classes ?? []).length > 0) {
      features.push('class definitions');
    }
    
    if ((file.exports ?? []).length > 0) {
      features.push('exports');
    }
    
    return features;
  };

  // Helper function to generate directory summary
  const generateDirectorySummary = (dir: DirectoryMetadata, files: Record<string, FileMetadata>): string => {
    const fileCount = dir.files.length;
    const fileTypes = new Set(dir.files.map(path => path.split('.').pop()));
    const features = new Set<string>();
    
    dir.files.forEach(path => {
      const file = files[path];
      if (file?.features) {
        file.features.forEach(feature => features.add(feature));
      }
    });

    return `Directory containing ${fileCount} ${Array.from(fileTypes).join('/')} files with ${Array.from(features).join(', ')}.`;
  };

  // Add handler for generating summary
  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the app name from profile
      let appName = 'Unnamed Project';
      if (currentAccount?.id) {
        const profileRef = doc(db, 'profiles', currentAccount.id);
        const profileDoc = await getDoc(profileRef);
        if (profileDoc.exists()) {
          // Try to get company name first
          appName = profileDoc.data().company || appName;
        }
        
        // If no company name, try to get from GitHub repository name
        if (appName === 'Unnamed Project' && currentAccount?.settings?.githubRepository) {
          appName = currentAccount.settings.githubRepository.split('/')[1] || appName;
        }
      }

      // Debug log
      console.log('Using app name:', appName);

      // Debug point 1: Check if we have the required context
      console.log('Current account:', currentAccount);
      if (!currentAccount?.id || !currentAccount?.settings?.githubRepository) {
        throw new Error('No account or repository selected');
      }

      const repoPath = currentAccount.settings.githubRepository.replace('/', '_');
      const repoRef = doc(db, 'repositories', repoPath);
      
      // Debug point 2: Check if we can access the repository
      const repoDoc = await getDoc(repoRef);
      console.log('Repository document:', repoDoc.exists());
      
      if (!repoDoc.exists()) {
        throw new Error('Repository not found');
      }

      // Debug point 3: Check files collection
      const filesCollectionRef = collection(repoRef, 'files');
      const filesSnapshot = await getDocs(filesCollectionRef);
      console.log('Files found:', filesSnapshot.size);

      // Initialize metadata
      const metadataForAI = {
        appName,
        directories: new Set<string>(),
        fileTypes: new Set<string>(),
        dependencies: new Set<string>(),
        packageJson: null as any,
        testingStrategy: {
          frameworks: new Set<string>(),
          testFiles: new Set<string>(),
          testDirectories: new Set<string>()
        },
        stateManagement: {
          patterns: new Set<string>(),
          stores: new Set<string>()
        },
        apiIntegrations: new Set<string>(),
        commonPatterns: new Set<string>(),
        componentStructure: {
          atomic: false,
          featureBased: false,
          routeBased: false
        }
      };

      // Process files to collect metadata
      filesSnapshot.docs.forEach(doc => {
        try {
          const file = doc.data() as FirebaseFile;
          console.log('Processing file:', file.path); // Debug log

          // Add directory path
          const dirPath = file.path.split('/').slice(0, -1).join('/');
          if (dirPath) {
            metadataForAI.directories.add(dirPath);
          }

          // Add file type
          const ext = file.path.split('.').pop();
          if (ext) {
            metadataForAI.fileTypes.add(ext);
            console.log('Added file type:', ext); // Debug log
          }

          // Add dependencies from imports
          if (file.imports && Array.isArray(file.imports)) {
            file.imports.forEach(imp => {
              // Filter out relative imports and internal modules
              if (!imp.startsWith('.') && !imp.startsWith('@types')) {
                metadataForAI.dependencies.add(imp);
                console.log('Added dependency:', imp); // Debug log
              }
            });
          }

          // Parse package.json
          if (file.path.endsWith('package.json')) {
            try {
              console.log('Found package.json:', file); // Debug log
              const packageContent = JSON.parse(file.content || '{}');
              metadataForAI.packageJson = {
                name: packageContent.name,
                version: packageContent.version,
                dependencies: packageContent.dependencies || {},
                devDependencies: packageContent.devDependencies || {},
                scripts: packageContent.scripts || {}
              };
              console.log('Parsed package.json:', metadataForAI.packageJson); // Debug log
            } catch (e) {
              console.warn('Failed to parse package.json:', e);
            }
          }

          // Testing files
          if (file.path.includes('test') || file.path.includes('spec')) {
            metadataForAI.testingStrategy.testFiles.add(file.path);
            if (file.imports) {
              file.imports.forEach(imp => {
                if (imp.includes('jest') || imp.includes('testing-library') || 
                    imp.includes('cypress') || imp.includes('vitest')) {
                  metadataForAI.testingStrategy.frameworks.add(imp);
                }
              });
            }
          }

          // State management
          if (file.imports) {
            file.imports.forEach(imp => {
              if (imp.includes('redux') || imp.includes('zustand') || 
                  imp.includes('recoil') || imp.includes('jotai')) {
                metadataForAI.stateManagement.patterns.add(imp);
              }
            });
          }

          // API integrations
          if (file.content && (
              file.content.includes('fetch(') || 
              file.content.includes('axios.') || 
              file.path.includes('api/') ||
              file.path.includes('services/')
          )) {
            metadataForAI.apiIntegrations.add(file.path);
          }

        } catch (e) {
          console.error('Error processing file:', doc.id, e);
        }
      });

      // Debug point 4: Log collected metadata
      console.log('Final metadata:', {
        directories: Array.from(metadataForAI.directories),
        fileTypes: Array.from(metadataForAI.fileTypes),
        dependencies: Array.from(metadataForAI.dependencies),
        testFrameworks: Array.from(metadataForAI.testingStrategy.frameworks),
        testFiles: Array.from(metadataForAI.testingStrategy.testFiles),
        statePatterns: Array.from(metadataForAI.stateManagement.patterns),
        apiIntegrations: Array.from(metadataForAI.apiIntegrations)
      });

      // Generate the prompt with the collected metadata
      const fullPrompt = enhancedPrompt
        .replace('"Project name"', JSON.stringify(appName))
        .replace('{{DIRECTORIES}}', Array.from(metadataForAI.directories).join('\n'))
        .replace('{{FILE_TYPES}}', Array.from(metadataForAI.fileTypes).join(', '))
        .replace('{{DEPENDENCIES}}', Array.from(metadataForAI.dependencies).join(', '))
        .replace('{{PACKAGE_JSON}}', metadataForAI.packageJson 
          ? JSON.stringify(metadataForAI.packageJson, null, 2)
          : 'Package.json not found')
        .replace('{{TEST_FRAMEWORKS}}', Array.from(metadataForAI.testingStrategy.frameworks).join(', '))
        .replace('{{TEST_FILES}}', Array.from(metadataForAI.testingStrategy.testFiles).length.toString())
        .replace('{{STATE_PATTERNS}}', Array.from(metadataForAI.stateManagement.patterns).join(', '))
        .replace('{{STORE_FILES}}', Array.from(metadataForAI.stateManagement.stores).length.toString())
        .replace('{{API_INTEGRATIONS}}', Array.from(metadataForAI.apiIntegrations).length.toString())
        .replace('{{COMMON_PATTERNS}}', Array.from(metadataForAI.commonPatterns).join(', '))
        .replace('{{COMPONENT_ORGANIZATION}}', 
          Object.entries(metadataForAI.componentStructure)
            .filter(([_, value]) => value)
            .map(([key]) => key)
            .join(', ') || 'standard'
        );

      // Debug point 6: Check the generated prompt
      console.log('Generated prompt:', fullPrompt);

      // Debug point 7: Call AI service
      console.log('Calling AI service...');
      const aiResponse = await generateAISummary(
        JSON.stringify(metadataForAI),
        'codebase-summary',
        fullPrompt
      );
      console.log('AI response received:', !!aiResponse);

      if (!aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid AI response structure');
      }

      // Set the response
      setSummaryResponse({
        prompt: fullPrompt,
        response: aiResponse.candidates[0].content.parts[0].text
      });

    } catch (error) {
      console.error('Failed to generate summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function
  const cleanJsonResponse = (response: string): string => {
    // Remove markdown code block if present
    const jsonContent = response.replace(/```json\n|\n```/g, '');
    return jsonContent.trim();
  };

  // Add generate architecture function
  const handleGenerateArchitecture = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the app name from profile
      let appName = 'Unnamed Project';
      if (currentAccount?.id) {
        const profileRef = doc(db, 'profiles', currentAccount.id);
        const profileDoc = await getDoc(profileRef);
        if (profileDoc.exists()) {
          appName = profileDoc.data().company || appName;
        }
        
        if (appName === 'Unnamed Project' && currentAccount?.settings?.githubRepository) {
          appName = currentAccount.settings.githubRepository.split('/')[1] || appName;
        }
      }

      if (!currentAccount?.id || !currentAccount?.settings?.githubRepository) {
        throw new Error('No account or repository selected');
      }

      const repoPath = currentAccount.settings.githubRepository.replace('/', '_');
      const repoRef = doc(db, 'repositories', repoPath);
      const repoDoc = await getDoc(repoRef);

      if (!repoDoc.exists()) {
        throw new Error('Repository not found');
      }

      // Fetch files
      const filesCollectionRef = collection(repoRef, 'files');
      const filesSnapshot = await getDocs(filesCollectionRef);

      // Initialize metadata
      const metadataForAI = {
        appName,
        directories: new Set<string>(),
        fileTypes: new Set<string>(),
        dependencies: new Set<string>(),
        packageJson: null as any,
        testingStrategy: {
          frameworks: new Set<string>(),
          testFiles: new Set<string>(),
          testDirectories: new Set<string>()
        },
        stateManagement: {
          patterns: new Set<string>(),
          stores: new Set<string>()
        },
        apiIntegrations: new Set<string>(),
        commonPatterns: new Set<string>(),
        componentStructure: {
          atomic: false,
          featureBased: false,
          routeBased: false
        }
      };

      // Process files
      filesSnapshot.docs.forEach(doc => {
        try {
          const file = doc.data() as FirebaseFile;
          
          // Add directory path
          const dirPath = file.path.split('/').slice(0, -1).join('/');
          if (dirPath) {
            metadataForAI.directories.add(dirPath);
          }

          // Add file type
          const ext = file.path.split('.').pop();
          if (ext) {
            metadataForAI.fileTypes.add(ext);
          }

          // Add dependencies
          if (file.imports && Array.isArray(file.imports)) {
            file.imports.forEach(imp => {
              if (!imp.startsWith('.') && !imp.startsWith('@types')) {
                metadataForAI.dependencies.add(imp);
              }
            });
          }

          // Parse package.json
          if (file.path.endsWith('package.json')) {
            try {
              const packageContent = JSON.parse(file.content || '{}');
              metadataForAI.packageJson = {
                name: packageContent.name,
                version: packageContent.version,
                dependencies: packageContent.dependencies || {},
                devDependencies: packageContent.devDependencies || {},
                scripts: packageContent.scripts || {}
              };
            } catch (e) {
              console.warn('Failed to parse package.json:', e);
            }
          }

          // Testing files
          if (file.path.includes('test') || file.path.includes('spec')) {
            metadataForAI.testingStrategy.testFiles.add(file.path);
            if (file.imports) {
              file.imports.forEach(imp => {
                if (imp.includes('jest') || imp.includes('testing-library') || 
                    imp.includes('cypress') || imp.includes('vitest')) {
                  metadataForAI.testingStrategy.frameworks.add(imp);
                }
              });
            }
          }

          // State management
          if (file.imports) {
            file.imports.forEach(imp => {
              if (imp.includes('redux') || imp.includes('zustand') || 
                  imp.includes('recoil') || imp.includes('jotai')) {
                metadataForAI.stateManagement.patterns.add(imp);
              }
            });
          }

          // API integrations
          if (file.content && (
              file.content.includes('fetch(') || 
              file.content.includes('axios.') || 
              file.path.includes('api/') ||
              file.path.includes('services/')
          )) {
            metadataForAI.apiIntegrations.add(file.path);
          }

        } catch (e) {
          console.error('Error processing file:', doc.id, e);
        }
      });

      // Prepare tech stack data
      const techStack = {
        frontend: Array.from(metadataForAI.dependencies)
          .filter(dep => dep.includes('react') || dep.includes('@mui') || dep.includes('@radix'))
          .join(', '),
        backend: Array.from(metadataForAI.dependencies)
          .filter(dep => dep.includes('express') || dep.includes('firebase-functions'))
          .join(', '),
        database: 'Firebase Firestore',
        apis: Array.from(metadataForAI.apiIntegrations).join(', ') || 'REST APIs via Firebase Functions'
      };

      // Prepare component structure
      const componentStructure = Array.from(metadataForAI.directories)
        .filter(dir => dir.includes('components'))
        .map(dir => `- ${dir}`)
        .join('\n');

      // Prepare state management
      const stateManagement = Array.from(metadataForAI.stateManagement.patterns).length > 0
        ? Array.from(metadataForAI.stateManagement.patterns).join(', ')
        : 'React Context API for state management';

      // Prepare data flow
      const dataFlow = `
- Client-side React application
- Firebase Authentication
- Firestore Database
- Firebase Functions for backend processing
- GitHub API integration
`;

      // Prepare security info from firestore.rules
      const security = `
- Firebase Authentication for user management
- Firestore Security Rules for data access control
- Role-based access control (RBAC)
- Secure token management
`;

      // Replace placeholders in the prompt
      const fullArchitecturePrompt = architecturePrompt
        .replace('{{DIRECTORIES}}', Array.from(metadataForAI.directories).join('\n'))
        .replace('{{FRONTEND_TECH}}', techStack.frontend)
        .replace('{{BACKEND_TECH}}', techStack.backend)
        .replace('{{DATABASE_TECH}}', techStack.database)
        .replace('{{API_TECH}}', techStack.apis)
        .replace('{{DEPENDENCIES}}', Array.from(metadataForAI.dependencies).join(', '))
        .replace('{{COMPONENT_STRUCTURE}}', componentStructure)
        .replace('{{STATE_MANAGEMENT}}', stateManagement)
        .replace('{{DATA_FLOW}}', dataFlow)
        .replace('{{SECURITY}}', security);

      // Let's add a debug log to see the actual prompt
      console.log('Final architecture prompt:', fullArchitecturePrompt);

      // Generate the architecture document
      const aiResponse = await generateAISummary(
        JSON.stringify(metadataForAI),
        'architecture-doc',
        fullArchitecturePrompt  // Use the processed prompt
      );

      if (!aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid AI response');
      }

      setArchitectureResponse({
        prompt: architecturePrompt,
        response: aiResponse.candidates[0].content.parts[0].text
      });

    } catch (error) {
      console.error('Failed to generate architecture doc:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate architecture doc');
    } finally {
      setLoading(false);
    }
  };

  const analyzeCodebase = (files: FirebaseFile[]) => {
    const metadata = {
      // Basic file structure
      directories: new Set<string>(),
      fileTypes: new Set<string>(),
      
      // Dependencies from package.json and imports
      dependencies: new Set<string>(),
      
      // File patterns
      testFiles: new Set<string>(),
      configFiles: new Set<string>(),
      sourceFiles: new Set<string>(),
      
      // Code patterns (without assumptions about frameworks)
      imports: new Set<string>(),
      exports: new Set<string>(),
      apiPatterns: new Set<string>(),
      
      // Configuration
      envVars: new Set<string>(),
      scripts: new Set<string>()
    };

    files.forEach(file => {
      // Add directory path
      const dirPath = file.path.split('/').slice(0, -1).join('/');
      if (dirPath) {
        metadata.directories.add(dirPath);
      }

      // Add file type
      const ext = file.path.split('.').pop();
      if (ext) {
        metadata.fileTypes.add(ext);
      }

      // Categorize files
      if (file.path.includes('test') || file.path.includes('spec')) {
        metadata.testFiles.add(file.path);
      } else if (file.path.includes('config') || file.path.endsWith('.config.js')) {
        metadata.configFiles.add(file.path);
      } else if (file.path.includes('src/')) {
        metadata.sourceFiles.add(file.path);
      }

      // Parse package.json
      if (file.path.endsWith('package.json')) {
        try {
          const packageJson = JSON.parse(file.content || '{}');
          if (packageJson.dependencies) {
            Object.keys(packageJson.dependencies).forEach(dep => 
              metadata.dependencies.add(dep));
          }
          if (packageJson.scripts) {
            Object.keys(packageJson.scripts).forEach(script => 
              metadata.scripts.add(script));
          }
        } catch (e) {
          console.warn('Failed to parse package.json');
        }
      }

      // Parse imports and exports
      if (file.imports && Array.isArray(file.imports)) {
        file.imports.forEach(imp => metadata.imports.add(imp));
      }

      // Look for API patterns without framework assumptions
      if (file.content) {
        // Look for HTTP method patterns
        const httpMethods = file.content.match(/(get|post|put|delete|patch)\s*\(['"]/gi);
        if (httpMethods) {
          httpMethods.forEach(method => metadata.apiPatterns.add(method));
        }

        // Look for environment variables
        const envVars = file.content.match(/process\.env\.[A-Z_]+/g);
        if (envVars) {
          envVars.forEach(env => metadata.envVars.add(env));
        }
      }
    });

    return metadata;
  };

  return (
    <div className="p-6">
      <h1 className={typography.h1}>Cursor Configuration Generator</h1>
      
      <div className="flex gap-6 mt-6">
        {/* Left Panel - Form (33%) */}
        <div className="w-1/3 space-y-4">
          {/* Prompt textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Codebase Summary Prompt
            </label>
            <textarea
              value={summaryPrompt}
              onChange={(e) => setSummaryPrompt(e.target.value)}
              className="w-full h-[400px] p-3 rounded-lg
                bg-white dark:bg-gray-800 
                border border-gray-300 dark:border-gray-600
                text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            className={`w-full p-2 rounded-lg transition-colors
              ${loading
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            {loading ? 'Processing...' : 'Generate Summary'}
          </button>

          {/* Add architecture button */}
          <button
            onClick={handleGenerateArchitecture}
            disabled={loading}
            className={`w-full p-2 rounded-lg transition-colors
              ${loading
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
          >
            Generate ARCHITECTURE.md
          </button>
        </div>

        {/* Right Panel - Results (66%) */}
        <div className="w-2/3">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setActiveTab('request')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'request'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Summary Prompt
            </button>
            <button
              onClick={() => setActiveTab('response')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'response'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Summary Response
            </button>
            <button
              onClick={() => setActiveTab('architecture-prompt')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'architecture-prompt'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Architecture Prompt
            </button>
            <button
              onClick={() => setActiveTab('architecture-response')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'architecture-response'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Architecture Response
            </button>
          </div>

          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="relative">
              {activeTab === 'request' && summaryResponse && (
                <>
                  <button
                    onClick={() => handleCopy(summaryResponse.prompt, 'request')}
                    className="absolute top-2 right-2 p-2 rounded-lg 
                      bg-gray-800 dark:bg-gray-700 
                      text-gray-200 dark:text-gray-300
                      hover:bg-gray-700 dark:hover:bg-gray-600
                      transition-colors"
                    title="Copy to clipboard"
                  >
                    {copyStatus === 'request' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <pre className="p-4 overflow-auto bg-[#1e2132] text-gray-200 min-h-[200px] max-h-[800px]">
                    {summaryResponse.prompt}
                  </pre>
                </>
              )}

              {activeTab === 'response' && summaryResponse && (
                <>
                  <button
                    onClick={() => handleCopy(summaryResponse.response, 'response')}
                    className="absolute top-2 right-2 p-2 rounded-lg 
                      bg-gray-800 dark:bg-gray-700 
                      text-gray-200 dark:text-gray-300
                      hover:bg-gray-700 dark:hover:bg-gray-600
                      transition-colors"
                    title="Copy to clipboard"
                  >
                    {copyStatus === 'response' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <pre className="p-4 overflow-auto bg-[#1e2132] text-gray-200 min-h-[200px] max-h-[800px]">
                    {JSON.stringify(
                      JSON.parse(cleanJsonResponse(summaryResponse.response)), 
                      null, 
                      2
                    )}
                  </pre>
                </>
              )}

              {activeTab === 'architecture-prompt' && architectureResponse && (
                <pre className="p-4 overflow-auto bg-[#1e2132] text-gray-200 min-h-[200px] max-h-[800px]">
                  {architectureResponse.prompt}
                </pre>
              )}
              
              {activeTab === 'architecture-response' && architectureResponse && (
                <pre className="p-4 overflow-auto bg-[#1e2132] text-gray-200 min-h-[200px] max-h-[800px]">
                  {architectureResponse.response}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Add loading indicator */}
      {loading && (
        <div className="mt-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          Generating summary... Please wait.
        </div>
      )}
    </div>
  );
}