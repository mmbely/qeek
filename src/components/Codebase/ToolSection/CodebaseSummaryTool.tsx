import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, FileText, Copy, Download, GitPullRequest } from 'lucide-react';
import { generateAISummary } from '../../../services/ai';
import { analyzeCodebase } from '../../../utils/analyzeCodebase';
import { useTheme } from '../../../context/ThemeContext';
import { RepositoryFile } from '../../../types/repository';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAccount } from '../../../context/AccountContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Octokit } from '@octokit/rest';
import { diffJson } from 'diff';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { getToken } from '../../../services/github';
import { Button } from '../../ui/button';

// Simple tab implementation
interface SimpleTabsProps {
  defaultValue: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

interface TabProps {
  value: string;
  label: string;
  children: React.ReactNode;
}

const SimpleTabs = ({ defaultValue, children, onValueChange }: SimpleTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (onValueChange) {
      onValueChange(value);
    }
  };
  
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return (
              <button
                className={`px-4 py-2 rounded-md ${
                  activeTab === child.props.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
                onClick={() => handleTabChange(child.props.value)}
              >
                {child.props.label}
              </button>
            );
          }
          return null;
        })}
      </div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && activeTab === child.props.value ? child : null
      )}
    </div>
  );
};

const Tab = ({ value, label, children }: TabProps) => {
  return <div>{children}</div>;
};

// Types for the codebase summary
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

interface NewMetadata {
  directories: Record<string, any>;
  files: Record<string, {
    description: string;
    dependencies: string[];
  }>;
}

interface CodebaseSummaryToolProps {
  files: RepositoryFile[];
}

const CodebaseSummaryTool: React.FC<CodebaseSummaryToolProps> = ({ files }) => {
  const { currentAccount } = useAccount();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingSummary, setExistingSummary] = useState<CodebaseSummary | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<CodebaseSummary | null>(null);
  const [activeTab, setActiveTab] = useState('existing');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [hasDifferences, setHasDifferences] = useState(false);
  const [diffResult, setDiffResult] = useState<any[]>([]);

  // Check for existing codebase-summary.json file
  useEffect(() => {
    const checkExistingFile = async () => {
      setCheckingExisting(true);
      
      try {
        if (!currentAccount?.settings?.githubRepository) {
          throw new Error('No repository connected');
        }

        // Check Firestore for existing file
        try {
          const repoId = currentAccount.settings.githubRepository.replace('/', '_');
          const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_codebase-summary.json');
          const fileDoc = await getDoc(fileRef);
          
          if (fileDoc.exists() && fileDoc.data()?.content) {
            console.log("Found existing codebase-summary.json in Firestore");
            const content = fileDoc.data().content;
            try {
              const parsedContent = JSON.parse(content);
              setExistingSummary(parsedContent);
              setActiveTab('existing');
              return;
            } catch (parseError) {
              console.error("Error parsing existing JSON:", parseError);
            }
          }
        } catch (firestoreError) {
          console.error("Error checking Firestore:", firestoreError);
        }
        
        console.log("No existing codebase-summary.json file found");
        setActiveTab('generated');
      } catch (error) {
        console.error("Error checking for codebase-summary.json:", error);
        setError("Unexpected error occurred");
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingFile();
  }, [currentAccount, db]);

  const handleGenerateCodebaseSummary = async () => {
    setLoading(true);
    setError(null);
    setGeneratedSummary(null);
    setPrompt(null);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      // Fetch repository data
      const repoId = currentAccount.settings.githubRepository.replace('/', '_');
      const repoRef = doc(db, 'repositories', repoId);
      const repoDoc = await getDoc(repoRef);

      if (!repoDoc.exists()) {
        throw new Error('Repository not found');
      }

      // Fetch files from the 'files' subcollection
      const filesCollection = collection(db, `repositories/${repoId}/files`);
      const filesSnapshot = await getDocs(filesCollection);
      const repoFiles = filesSnapshot.docs.map((doc) => doc.data() as RepositoryFile);

      console.log('Fetched repository files:', repoFiles.length);

      // Filter out files with empty ai_analysis and deleted files
      const validFiles = repoFiles.filter((file) => {
        return (
          !!file.ai_analysis && 
          Object.keys(file.ai_analysis).length > 0 &&
          file.status !== "deleted"
        );
      });

      console.log('Valid files with ai_analysis:', validFiles.length);

      if (validFiles.length === 0) {
        throw new Error('No valid files with AI analysis found');
      }

      // Build metadata from the available information in the files
      const metadataForAI = {
        repositoryName: currentAccount.settings.githubRepository,
        fileCount: validFiles.length,
        directories: new Set<string>(),
        fileTypes: new Set<string>(),
        languages: new Set<string>(),
        filesByType: {} as Record<string, string[]>,
        filesByLanguage: {} as Record<string, string[]>,
        importantFiles: {} as Record<string, any>,
        allImports: new Set<string>(),
        allExports: new Set<string>(),
        allClasses: new Set<string>(),
        allFunctions: new Set<string>(),
        primaryFeatures: new Set<string>(),
        languageGroups: {} as Record<string, string[]>, // Group files by language category
      };

      // Define language categories
      const languageCategories = {
        frontend: ['javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'vue', 'svelte'],
        backend: ['python', 'java', 'ruby', 'php', 'go', 'rust', 'c#', 'c++'],
        data: ['sql', 'r', 'julia'],
        config: ['json', 'yaml', 'toml', 'ini'],
        docs: ['md', 'txt', 'rst', 'adoc']
      };

      // Map file extensions to language categories
      const extensionToCategory: Record<string, string> = {
        js: 'frontend',
        ts: 'frontend',
        jsx: 'frontend',
        tsx: 'frontend',
        html: 'frontend',
        css: 'frontend',
        scss: 'frontend',
        vue: 'frontend',
        svelte: 'frontend',
        py: 'backend',
        java: 'backend',
        rb: 'backend',
        php: 'backend',
        go: 'backend',
        rs: 'backend',
        cs: 'backend',
        cpp: 'backend',
        c: 'backend',
        sql: 'data',
        r: 'data',
        jl: 'data',
        json: 'config',
        yaml: 'config',
        yml: 'config',
        toml: 'config',
        ini: 'config',
        md: 'docs',
        txt: 'docs',
        rst: 'docs',
        adoc: 'docs'
      };

      // Initialize language groups
      Object.keys(languageCategories).forEach(category => {
        metadataForAI.languageGroups[category] = [];
      });

      // Process files to extract metadata
      validFiles.forEach(file => {
        // Skip deleted files explicitly
        if (file.status === "deleted") {
          return;
        }
        
        // Track file types
        const ext = file.path.split('.').pop()?.toLowerCase();
        if (ext) {
          metadataForAI.fileTypes.add(ext);
          
          // Group files by type
          if (!metadataForAI.filesByType[ext]) {
            metadataForAI.filesByType[ext] = [];
          }
          metadataForAI.filesByType[ext].push(file.path);
          
          // Group by language category
          const category = extensionToCategory[ext] || 'other';
          if (!metadataForAI.languageGroups[category]) {
            metadataForAI.languageGroups[category] = [];
          }
          metadataForAI.languageGroups[category].push(file.path);
        }

        // Track languages
        if (file.language) {
          const language = file.language.toLowerCase();
          metadataForAI.languages.add(language);
          
          // Group files by language
          if (!metadataForAI.filesByLanguage[language]) {
            metadataForAI.filesByLanguage[language] = [];
          }
          metadataForAI.filesByLanguage[language].push(file.path);
        }

        // Track directories
        const dirPath = file.path.split('/').slice(0, -1).join('/');
        if (dirPath) {
          let currentPath = '';
          dirPath.split('/').forEach(segment => {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;
            metadataForAI.directories.add(currentPath);
          });
        }

        // Track important files
        if (file.path.endsWith('package.json') || 
            file.path.endsWith('tsconfig.json') ||
            file.path.endsWith('README.md') ||
            file.path.endsWith('requirements.txt') ||
            file.path.endsWith('Gemfile') ||
            file.path.endsWith('pom.xml') ||
            file.path.endsWith('build.gradle') ||
            file.path.endsWith('Cargo.toml') ||
            file.path.includes('firebase') ||
            file.path.includes('config') ||
            file.path.includes('App.') ||
            file.path.includes('index.') ||
            file.path.includes('main.')) {
          metadataForAI.importantFiles[file.path] = {
            summary: file.ai_analysis?.summary,
            size: file.size,
            language: file.language
          };
        }

        // Collect imports, exports, classes, functions from AI analysis
        if (file.ai_analysis?.imports) {
          file.ai_analysis.imports.forEach(imp => {
            metadataForAI.allImports.add(imp.path);
          });
        }

        if (file.ai_analysis?.exports) {
          file.ai_analysis.exports.forEach(exp => {
            metadataForAI.allExports.add(exp.name);
          });
        }

        if (file.ai_analysis?.classes) {
          file.ai_analysis.classes.forEach(cls => {
            metadataForAI.allClasses.add(cls.name);
          });
        }

        if (file.ai_analysis?.functions) {
          file.ai_analysis.functions.forEach(func => {
            metadataForAI.allFunctions.add(func.name);
          });
        }

        // Collect primary features
        if (file.ai_analysis?.primary_features) {
          file.ai_analysis.primary_features.forEach(feature => {
            metadataForAI.primaryFeatures.add(feature);
          });
        }
      });

      // Determine primary languages for frontend and backend
      const frontendLanguages = Array.from(metadataForAI.languages)
        .filter(lang => ['javascript', 'typescript', 'jsx', 'tsx'].includes(lang));
      
      const backendLanguages = Array.from(metadataForAI.languages)
        .filter(lang => ['python', 'java', 'ruby', 'php', 'go', 'rust', 'c#', 'c++'].includes(lang));

      // Create a prompt with the available metadata
      const prompt = `Analyze this codebase metadata and generate a comprehensive codebase summary in JSON format.

REPOSITORY: ${metadataForAI.repositoryName}

METADATA:
Project has ${metadataForAI.fileCount} files across ${metadataForAI.directories.size} directories.

Languages used:
${Array.from(metadataForAI.languages).join(', ')}

File types:
${Array.from(metadataForAI.fileTypes).join(', ')}

Language distribution:
${Object.entries(metadataForAI.languageGroups)
  .filter(([_, files]) => files.length > 0)
  .map(([category, files]) => `- ${category}: ${files.length} files`)
  .join('\n')}

Frontend files (${metadataForAI.languageGroups.frontend?.length || 0}):
${(metadataForAI.languageGroups.frontend || []).slice(0, 5).join('\n')}
${(metadataForAI.languageGroups.frontend?.length || 0) > 5 ? `...and ${metadataForAI.languageGroups.frontend.length - 5} more` : ''}

Backend files (${metadataForAI.languageGroups.backend?.length || 0}):
${(metadataForAI.languageGroups.backend || []).slice(0, 5).join('\n')}
${(metadataForAI.languageGroups.backend?.length || 0) > 5 ? `...and ${metadataForAI.languageGroups.backend.length - 5} more` : ''}

Top-level directories:
${Array.from(metadataForAI.directories)
  .filter(dir => !dir.includes('/'))
  .join('\n')}

Key imports (libraries/dependencies):
${Array.from(metadataForAI.allImports)
  .filter(imp => !imp.startsWith('.') && !imp.startsWith('/'))
  .slice(0, 30)
  .join(', ')}

Important files:
${Object.entries(metadataForAI.importantFiles)
  .map(([path, info]) => `- ${path}: ${(info as any).summary?.substring(0, 150) || 'No summary available'}`)
  .join('\n')}

Primary features identified:
${Array.from(metadataForAI.primaryFeatures).length > 0 
  ? Array.from(metadataForAI.primaryFeatures).map(f => `- ${f}`).join('\n')
  : 'No primary features identified'}

Based on this metadata, generate a detailed CodebaseSummary object with this structure:
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
      "mainLanguage": "Primary backend language(s)",
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
1. Accurate technology identification (React, Node.js, Firebase, etc.)
2. Main architectural patterns (client-server, microservices, etc.)
3. Key features and capabilities of the application
4. Clear directory structure explanation
5. Identify all backend languages if multiple are present

Return only valid JSON, no additional text.`;

      setPrompt(prompt);

      try {
        const aiResponse = await generateAISummary(
          JSON.stringify({
            repositoryName: metadataForAI.repositoryName,
            fileCount: metadataForAI.fileCount,
            directories: Array.from(metadataForAI.directories),
            fileTypes: Array.from(metadataForAI.fileTypes),
            languages: Array.from(metadataForAI.languages),
            filesByType: metadataForAI.filesByType,
            filesByLanguage: metadataForAI.filesByLanguage,
            importantFiles: metadataForAI.importantFiles,
            allImports: Array.from(metadataForAI.allImports),
            allExports: Array.from(metadataForAI.allExports),
            allClasses: Array.from(metadataForAI.allClasses),
            allFunctions: Array.from(metadataForAI.allFunctions),
            primaryFeatures: Array.from(metadataForAI.primaryFeatures),
            languageGroups: metadataForAI.languageGroups,
            frontendLanguages,
            backendLanguages
          }),
          'codebase-summary',
          prompt
        );

        if (!aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid AI response');
        }

        const aiSummary = JSON.parse(aiResponse.candidates[0].content.parts[0].text);
        setGeneratedSummary(aiSummary);

        // Compare with existing summary if available
        if (existingSummary) {
          const diff = diffJson(existingSummary, aiSummary);
          setHasDifferences(diff.some(part => part.added || part.removed));
          setDiffResult(diff);
        }

      } catch (error) {
        console.error('AI summary generation failed:', error);
        
        // Improved fallback summary with language detection
        const hasFrontend = metadataForAI.languageGroups.frontend?.length > 0;
        const hasBackend = metadataForAI.languageGroups.backend?.length > 0;
        
        // Determine main languages
        let frontendLanguage = 'JavaScript';
        if (metadataForAI.languages.has('typescript')) {
          frontendLanguage = 'TypeScript';
        }
        
        let backendLanguages = [];
        if (metadataForAI.languages.has('python')) backendLanguages.push('Python');
        if (metadataForAI.languages.has('java')) backendLanguages.push('Java');
        if (metadataForAI.languages.has('ruby')) backendLanguages.push('Ruby');
        if (metadataForAI.languages.has('php')) backendLanguages.push('PHP');
        if (metadataForAI.languages.has('go')) backendLanguages.push('Go');
        
        // Default to Node.js if we have JS/TS files but no specific backend language
        if (backendLanguages.length === 0 && (metadataForAI.languages.has('javascript') || metadataForAI.languages.has('typescript'))) {
          backendLanguages.push('Node.js');
        }
        
        const backendLanguage = backendLanguages.length > 0 
          ? backendLanguages.join(' and ') 
          : 'Node.js';
        
        // Determine framework
        let framework = 'React';
        if (Array.from(metadataForAI.allImports).some(imp => imp.includes('vue'))) {
          framework = 'Vue.js';
        } else if (Array.from(metadataForAI.allImports).some(imp => imp.includes('angular'))) {
          framework = 'Angular';
        } else if (Array.from(metadataForAI.allImports).some(imp => imp.includes('svelte'))) {
          framework = 'Svelte';
        }
        
        // Determine styling
        let styling = 'CSS';
        if (Array.from(metadataForAI.allImports).some(imp => imp.includes('tailwind'))) {
          styling = 'Tailwind CSS';
        } else if (Array.from(metadataForAI.allImports).some(imp => imp.includes('styled-components'))) {
          styling = 'styled-components';
        } else if (Array.from(metadataForAI.allImports).some(imp => imp.includes('emotion'))) {
          styling = 'Emotion';
        } else if (metadataForAI.fileTypes.has('scss')) {
          styling = 'SCSS';
        }
        
        const fallbackSummary = {
          name: metadataForAI.repositoryName?.split('/')[1] || 'Qeek',
          description: 'AI-driven project management tool for developers using AI code editors like Cursor.',
          stack: {
            frontend: {
              mainLanguage: frontendLanguage,
              framework: framework,
              styling: styling,
              keyLibraries: Array.from(metadataForAI.allImports)
                .filter(imp => !imp.startsWith('.') && !imp.includes('/'))
                .filter(imp => {
                  // Filter out backend-specific libraries
                  const backendLibs = ['firebase_admin', 'asyncio', 'flask', 'django', 'express', 'fastapi', 'spring'];
                  return !backendLibs.some(lib => imp.includes(lib));
                })
                .slice(0, 10)
            },
            backend: {
              mainLanguage: backendLanguage,
              services: [
                'Firebase',
                ...(metadataForAI.languages.has('python') ? ['Python Services'] : []),
                ...(Array.from(metadataForAI.allImports).some(imp => imp.includes('express')) ? ['Express'] : [])
              ],
              keyFeatures: [
                'Authentication', 
                'Database', 
                'Storage',
                ...(hasBackend ? ['API Endpoints', 'Data Processing'] : [])
              ]
            }
          },
          mainFeatures: Array.from(metadataForAI.primaryFeatures).length > 0 
            ? Array.from(metadataForAI.primaryFeatures).slice(0, 5)
            : [
                'AI-powered code analysis',
                'Project management',
                'GitHub integration',
                'Team collaboration'
              ],
          directoryStructure: Object.fromEntries(
            Array.from(metadataForAI.directories)
              .filter(dir => !dir.includes('/'))
              .map(dir => {
                if (dir === 'backend') return [dir, 'Contains backend services and API endpoints'];
                if (dir === 'functions') return [dir, 'Contains serverless functions'];
                if (dir === 'src') return [dir, 'Contains frontend application code'];
                if (dir === 'public') return [dir, 'Contains public assets and static files'];
                if (dir === 'scripts') return [dir, 'Contains utility scripts'];
                if (dir === 'tests' || dir === 'test') return [dir, 'Contains test files'];
                if (dir === 'docs') return [dir, 'Contains documentation'];
                return [dir, `Contains ${dir} related code and resources`];
              })
          )
        };
        
        setGeneratedSummary(fallbackSummary);
        
        // Compare with existing summary if available
        if (existingSummary) {
          const diff = diffJson(existingSummary, fallbackSummary);
          setHasDifferences(diff.some(part => part.added || part.removed));
          setDiffResult(diff);
        }
      }
    } catch (error) {
      console.error('Error generating codebase summary:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  };

  const downloadJson = (content: any, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(content, null, 2)], {type: 'application/json'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePushToGitHub = async () => {
    if (!currentAccount) {
      setPushError("No account found");
      return;
    }

    setPushLoading(true);
    setPushError(null);
    setPushSuccess(false);
    
    try {
      if (!generatedSummary) {
        throw new Error('No generated summary to push');
      }
      
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }
      
      // Get GitHub token using the account id (not uid)
      const githubToken = await getToken(currentAccount.id);
      
      if (!githubToken) {
        throw new Error('GitHub token not found. Please reconnect your GitHub account in Settings.');
      }
      
      // Initialize Octokit with the token
      const octokit = new Octokit({ auth: githubToken });
      
      const [owner, repo] = currentAccount.settings.githubRepository.split('/');
      const filePath = '.cursor/codebase-summary.json';
      const content = JSON.stringify(generatedSummary, null, 2);
      const commitMessage = 'Update codebase-summary.json via Qeek';
      
      console.log(`Pushing to GitHub: ${owner}/${repo}, path: ${filePath}`);
      
      // First, try to get the file to check if it exists and get its SHA
      let fileSha: string | undefined;
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
        });
        
        // Check if fileData is a file (not a directory) and has a sha
        if (!Array.isArray(fileData) && 'sha' in fileData) {
          fileSha = fileData.sha;
          console.log(`Existing file found with SHA: ${fileSha}`);
        }
      } catch (error) {
        console.log('File does not exist yet, will create it');
      }
      
      // Create or update the file
      try {
        // Use browser's btoa function for base64 encoding
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        const response = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: commitMessage,
          content: base64Content,
          sha: fileSha, // Include SHA if updating, omit if creating
        });
        
        console.log('GitHub API response:', response);
        
        // Also update in Firestore for immediate local access
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_codebase-summary.json');
        
        await setDoc(fileRef, {
          path: filePath,
          content: content,
          metadata: {
            sha: response.data.content?.sha || 'unknown',
            lastUpdated: new Date().toISOString()
          }
        });
        
        setPushSuccess(true);
        setExistingSummary(generatedSummary);
        setShowPushDialog(false);
      } catch (apiError: any) {
        console.error('GitHub API error:', apiError);
        throw new Error(apiError.message || 'Failed to push to GitHub');
      }
    } catch (error) {
      console.error('Failed to push to GitHub:', error);
      setPushError(error instanceof Error ? error.message : 'Failed to push to GitHub');
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Codebase Summary JSON
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate and manage your codebase-summary.json file
          </p>
        </div>
        
        {/* Action buttons moved to top right */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateCodebaseSummary}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Summary
              </>
            )}
          </button>
          
          {generatedSummary && (
            <button
              onClick={() => setShowPushDialog(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                       flex items-center gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              Push to GitHub
            </button>
          )}
          
          {(existingSummary || generatedSummary) && (
            <button
              onClick={() => downloadJson(generatedSummary || existingSummary, 'codebase-summary.json')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                       rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </button>
          )}
        </div>
      </div>

      {/* Push success message */}
      {pushSuccess && (
        <div className="mb-6 bg-[#f0fdf4] dark:bg-[#052e16]/30 rounded-lg p-4 border border-[#bbf7d0] dark:border-[#052e16]">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[#15803d] dark:text-[#4ade80]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-[#15803d] dark:text-[#4ade80]">
                Successfully pushed codebase-summary.json to GitHub
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Push error message */}
      {pushError && (
        <div className="mb-6 bg-[#fef2f2] dark:bg-[#450a0a]/30 rounded-lg p-4 border border-[#fecaca] dark:border-[#450a0a]">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[#dc2626] dark:text-[#f87171]" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-[#dc2626] dark:text-[#f87171]">
                {pushError}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {checkingExisting ? (
        <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-gray-400 animate-spin mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Checking for existing codebase-summary.json file...</span>
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Generating codebase-summary.json
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This may take a minute or two...
                </p>
              </div>
            </div>
          )}
          
          {(existingSummary || generatedSummary) && !loading && (
            <SimpleTabs defaultValue={activeTab} onValueChange={setActiveTab}>
              {existingSummary && (
                <Tab value="existing" label="Existing Summary">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Existing codebase-summary.json
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(existingSummary, null, 2))}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                          <button
                            onClick={() => downloadJson(existingSummary, 'codebase-summary.json')}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 overflow-auto max-h-[600px]">
                      <SyntaxHighlighter
                        // @ts-ignore - Known issue with type definitions
                        style={isDarkMode ? materialDark : materialLight}
                        language="json"
                        className="text-sm rounded-md"
                      >
                        {JSON.stringify(existingSummary, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </Tab>
              )}
              
              {generatedSummary && (
                <Tab value="generated" label="Generated Summary">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Generated codebase-summary.json
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(generatedSummary, null, 2))}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                          <button
                            onClick={() => downloadJson(generatedSummary, 'codebase-summary.json')}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                     text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 overflow-auto max-h-[600px]">
                      <SyntaxHighlighter
                        // @ts-ignore - Known issue with type definitions
                        style={isDarkMode ? materialDark : materialLight}
                        language="json"
                        className="text-sm rounded-md"
                      >
                        {JSON.stringify(generatedSummary, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </Tab>
              )}
              
              {existingSummary && generatedSummary && (
                <Tab value="compare" label="Compare Changes">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 p-4">
                        Compare Changes
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        {hasDifferences ? (
                          <span className="text-sm text-red-500 dark:text-red-400 font-medium">
                            Differences found between files
                          </span>
                        ) : (
                          <span className="text-sm text-green-500 dark:text-green-400 font-medium">
                            No differences found between files
                          </span>
                        )}
                      </div>
                      
                      {/* Diff visualization */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
                        <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          {hasDifferences ? 'Differences' : 'Content'}
                        </h4>
                        <div className="text-xs overflow-auto max-h-[600px]">
                          <pre className="font-mono whitespace-pre-wrap" style={{ margin: 0 }}>
                            {diffResult.map((part, index) => (
                              <span 
                                key={index} 
                                className={
                                  part.added 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : part.removed 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                      : 'text-gray-800 dark:text-gray-300'
                                }
                              >
                                {part.value}
                              </span>
                            ))}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab>
              )}
              
              {prompt && (
                <Tab value="prompt" label="AI Prompt">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-end mb-2">
                      <button
                        onClick={() => copyToClipboard(prompt)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                 dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                      {prompt}
                    </pre>
                  </div>
                </Tab>
              )}
            </SimpleTabs>
          )}
        </>
      )}

      {/* Push to GitHub confirmation dialog */}
      {showPushDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e2132] rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Push to GitHub
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This will create or update the <code className="bg-gray-100 dark:bg-[#1e2132] px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">.cursor/codebase-summary.json</code> file in your repository.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPushDialog(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                           rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePushToGitHub}
                disabled={pushLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {pushLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="h-4 w-4" />
                    Push
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodebaseSummaryTool;
                    