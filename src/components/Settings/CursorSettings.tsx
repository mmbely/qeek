import React, { useState, useEffect } from 'react';
import { Code2, RefreshCw, AlertTriangle } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generateAISummary, GeminiResponse } from '../../services/geminiFrontend';

interface CursorConfig {
  lastUpdated: string;
  status: 'idle' | 'generating' | 'error';
  error?: string;
}

export default function CursorSettings() {
  const [config, setConfig] = useState<CursorConfig>({
    lastUpdated: '',
    status: 'idle'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<any>(null);

  const generateCursorConfig = async () => {
    setIsGenerating(true);
    setConfig(prev => ({ ...prev, status: 'generating' }));
    
    try {
      // 1. Fetch repository data from Firebase
      const reposRef = collection(db, 'repositories');
      const reposSnapshot = await getDocs(reposRef);
      
      const repoData = reposSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 2. Generate project-wide analysis using Gemini
      const cursorPrompt = `You are a code analysis expert. Analyze this repository data and generate a comprehensive Cursor AI configuration. Use the AI-generated summaries and metadata to create detailed configuration.

Return a JSON object with this structure:

{
  "settings": {
    "projectDescription": "Detailed description of the project's purpose and main features",
    "mainTechnologies": [
      "All main technologies, frameworks, and libraries used"
    ],
    "codebaseStructure": {
      "src/": "Source code directory",
      "components/": "React components directory",
      "services/": "Backend services and API integrations",
      "context/": "React context providers",
      "utils/": "Utility functions and helpers"
    }
  },
  "rules": {
    "patterns": [
      {
        "pattern": "src/components/**/*.tsx",
        "context": {
          "imports": true,
          "functions": true,
          "classes": true,
          "description": "React component files"
        }
      },
      {
        "pattern": "src/services/**/*.ts",
        "context": {
          "imports": true,
          "functions": true,
          "classes": true,
          "description": "Service layer files"
        }
      },
      {
        "pattern": "src/context/**/*.tsx",
        "context": {
          "imports": true,
          "functions": true,
          "classes": true,
          "description": "React context providers"
        }
      }
    ]
  },
  "metadata": {
    "lastGenerated": "current timestamp",
    "generatedBy": "Gemini AI",
    "repositoryStats": {
      "totalFiles": "total number of files",
      "activeFiles": "number of active files",
      "languages": ["list of programming languages used"],
      "frameworks": ["list of frameworks used"],
      "dependencies": ["list of main dependencies"]
    }
  }
}

Analyze this repository data and create a detailed configuration:
${JSON.stringify(repoData, null, 2)}

Focus on:
1. Accurate project description based on the codebase
2. All technologies and frameworks found in the code
3. Detailed directory structure with purposes
4. Specific file patterns for different types of files
5. Comprehensive metadata about the repository

Return only the JSON object, no markdown formatting or additional text.`;

      const analysis = await generateAISummary(
        JSON.stringify(repoData),
        'cursor-config',
        cursorPrompt
      );

      if (analysis.error) {
        throw new Error(analysis.error);
      }

      let configText = analysis.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!configText) {
        throw new Error('No configuration generated');
      }

      // Clean up the response text
      configText = configText.trim();
      if (configText.startsWith('```json')) {
        configText = configText.replace('```json', '');
      }
      if (configText.startsWith('```')) {
        configText = configText.replace('```', '');
      }
      if (configText.endsWith('```')) {
        configText = configText.replace(/```$/, '');
      }
      configText = configText.trim();

      // Parse and validate the generated config
      const cursorConfig = JSON.parse(configText);

      // TODO: Save the configuration to Firebase or generate .cursor files
      console.log('Generated Cursor Config:', cursorConfig);

      setGeneratedConfig(cursorConfig);

      setConfig({
        lastUpdated: new Date().toISOString(),
        status: 'idle'
      });
    } catch (error) {
      console.error('Error details:', error);
      setConfig({
        lastUpdated: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Cursor Integration
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure Cursor AI settings for enhanced code understanding
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Configuration Generator
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate Cursor AI configuration based on your codebase analysis
          </p>
        </div>
        
        <div className="p-4">
          <button
            onClick={generateCursorConfig}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Configuration...
              </>
            ) : (
              'Generate Cursor Configuration'
            )}
          </button>

          {config.status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error generating configuration: {config.error}</span>
              </div>
            </div>
          )}

          {config.lastUpdated && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date(config.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Status Section */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Current Configuration
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configuration status and details will appear here after generation.
          </p>
        </div>
      </div>

      {generatedConfig && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Generated Configuration
            </h3>
          </div>
          <div className="p-4">
            <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto">
              {JSON.stringify(generatedConfig, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}