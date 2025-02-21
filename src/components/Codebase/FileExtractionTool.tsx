import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getRepositoryFiles, getFileContent } from '../../services/github';
import { generateAISummary, GeminiResponse } from '../../services/geminiFrontend';
import { typography, commonStyles } from '../../styles/theme';
import { useAccount } from '../../context/AccountContext';

interface RepositoryFile {
  path: string;
  type: string;
}

interface Metrics {
  modelVersion?: string;
  finishReason?: string;
  avgLogprobs?: number;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    promptTokensDetails: Array<{
      modality: string;
      tokenCount: number;
    }>;
    candidatesTokensDetails: Array<{
      modality: string;
      tokenCount: number;
    }>;
  };
}

export default function FileExtractionTool() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'formatted' | 'metrics'>('formatted');
  const [lastRequest, setLastRequest] = useState<string>('');
  const [prompt, setPrompt] = useState<string>(
    `You are a code analysis expert. Analyze the provided code file and return a JSON object that follows this exact structure:

{
  "summary": "Development-focused summary under 4000 chars",
  "searchMetadata": {
    "primaryFeatures": ["list of main features"],
    "dataTypes": ["key data structures"],
    "stateManagement": ["state management approaches"],
    "commonModifications": ["typical changes needed"],
    "dependencies": {
      "external": ["external dependencies"],
      "internal": ["internal dependencies"]
    }
  },
  "functions": [
    {
      "name": "function name",
      "purpose": "brief description of function's purpose",
      "params": ["param1", "param2"],
      "returns": "return type and description",
      "dependencies": ["list of functions/services this depends on"]
    }
  ],
  "classes": [
    {
      "name": "class name",
      "purpose": "brief description of class's purpose",
      "methods": ["method1", "method2"],
      "properties": ["prop1", "prop2"],
      "dependencies": ["list of dependencies"]
    }
  ],
  "imports": [
    {
      "path": "import path",
      "items": ["imported items"],
      "purpose": "why these imports are needed"
    }
  ],
  "integrationPoints": [
    {
      "type": "API | Service | Component | Store",
      "name": "integration point name",
      "purpose": "why/how this integration is used"
    }
  ]
}

FILE PATH: {{FILEPATH}}

CODE CONTENT:
\`\`\`typescript
{{CONTENT}}
\`\`\`

Important guidelines:
1. Keep the summary focused on implementation details and under 4000 characters
2. Include all functions, including hooks in React components
3. For React components, include props in the class/function parameters
4. List all direct dependencies and integration points
5. Ensure the response is valid JSON that matches the structure exactly
6. Be specific and concise, focusing on details relevant for development
7. Include error handling and state management details in function/class descriptions
8. For empty arrays, still include the property with []
9. Do not include the embedding fields in the response

Return only the JSON object, no additional text or explanation.

Summary should focus on:
1. Core functionality and responsibilities
2. Key data flows and state management
3. Integration points and dependencies
4. Common modification scenarios
5. Critical implementation details

Keep it under 4000 chars and development-focused.`
  );
  const [response, setResponse] = useState<GeminiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentAccount } = useAccount();
  const [copyStatus, setCopyStatus] = useState<'none' | 'request' | 'response' | 'formatted'>('none');
  
  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    return files.filter(file => 
      file.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  useEffect(() => {
    // Load repository files
    const loadFiles = async () => {
      try {
        const repoFiles = await getRepositoryFiles('mmbely/qeek'); // hardcode for now
        // Type assertion to handle the mapping
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
      console.log('File content retrieved:', {
        length: fileContent.length,
        preview: fileContent.slice(0, 100) + '...'
      });
      
      // Replace placeholders in the prompt
      const fullPrompt = prompt
        .replace('{{FILEPATH}}', selectedFile)
        .replace('{{CONTENT}}', fileContent);
      
      // Store the full prompt for display
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

  // Copy helper function
  const handleCopy = async (text: string, type: 'request' | 'response' | 'formatted') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus('none'), 2000); // Reset after 2 seconds
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

  // Helper function to get metrics
  const getMetrics = (): Metrics | null => {
    if (!response) return null;

    return {
      modelVersion: response.modelVersion,
      finishReason: response.candidates?.[0]?.finishReason,
      avgLogprobs: response.candidates?.[0]?.avgLogprobs,
      usageMetadata: response.usageMetadata,
    };
  };

  // Format metrics for display
  const formatMetrics = (metrics: Metrics | null) => {
    if (!metrics) return 'No metrics available';

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-2">Model Information</h3>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p><span className="font-medium">Model Version:</span> {metrics.modelVersion}</p>
              <p><span className="font-medium">Finish Reason:</span> {metrics.finishReason}</p>
              <p><span className="font-medium">Average Log Probabilities:</span> {metrics.avgLogprobs?.toFixed(4)}</p>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-2">Token Usage</h3>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p><span className="font-medium">Prompt Tokens:</span> {metrics.usageMetadata?.promptTokenCount}</p>
              <p><span className="font-medium">Response Tokens:</span> {metrics.usageMetadata?.candidatesTokenCount}</p>
              <p><span className="font-medium">Total Tokens:</span> {metrics.usageMetadata?.totalTokenCount}</p>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-2">Token Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Prompt Tokens</h4>
                {metrics.usageMetadata?.promptTokensDetails?.map((detail: any, index: number) => (
                  <p key={`prompt-${index}`}>
                    {detail.modality}: {detail.tokenCount}
                  </p>
                ))}
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Response Tokens</h4>
                {metrics.usageMetadata?.candidatesTokensDetails?.map((detail: any, index: number) => (
                  <p key={`response-${index}`}>
                    {detail.modality}: {detail.tokenCount}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className={typography.h1}>Gemini API Test Tool</h1>
      
      <div className="flex gap-6 mt-6">
        {/* Left Panel - Form (33%) */}
        <div className="w-1/3 space-y-4">
          <div className="relative">
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select File
              </label>
            </div>
            
            {/* File selection dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between p-2 border rounded-lg
                  bg-white dark:bg-gray-800 
                  border-gray-300 dark:border-gray-600
                  text-gray-900 dark:text-gray-100"
              >
                <span className="truncate">{selectedFile || 'Choose a file'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 
                  bg-white dark:bg-gray-700 
                  border border-gray-200 dark:border-gray-600 
                  rounded-lg shadow-lg">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files..."
                        className="w-full pl-9 pr-4 py-2 text-sm 
                          border border-gray-300 dark:border-gray-600 rounded-md 
                          bg-gray-50 dark:bg-gray-800 
                          text-gray-900 dark:text-gray-100
                          placeholder-gray-500 dark:placeholder-gray-400
                          focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* File list */}
                  <div className="max-h-60 overflow-auto">
                    {filteredFiles.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No files found
                      </div>
                    ) : (
                      filteredFiles.map((file) => (
                        <button
                          key={file}
                          onClick={() => {
                            setSelectedFile(file);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-2 
                            hover:bg-gray-100 dark:hover:bg-gray-600 
                            text-gray-900 dark:text-gray-100"
                        >
                          {file}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Show count when filtering */}
                  {searchQuery && (
                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
                      Found {filteredFiles.length} files
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Prompt textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-[400px] p-3 rounded-lg
                bg-white dark:bg-gray-800 
                border border-gray-300 dark:border-gray-600
                text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={!selectedFile || loading}
            className={`w-full p-2 rounded-lg transition-colors
              ${!selectedFile || loading
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            {loading ? 'Processing...' : 'Test Gemini API'}
          </button>
        </div>

        {/* Right Panel - Results (66%) */}
        {(response || lastRequest) && (
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
                Request
              </button>
              <button
                onClick={() => setActiveTab('response')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'response'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Raw Response
              </button>
              <button
                onClick={() => setActiveTab('formatted')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'formatted'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Formatted Response
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'metrics'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Metrics
              </button>
            </div>

            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="relative">
                {activeTab === 'request' && (
                  <>
                    <button
                      onClick={() => handleCopy(lastRequest, 'request')}
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
                      {lastRequest}
                    </pre>
                  </>
                )}
                
                {activeTab === 'response' && (
                  <>
                    <button
                      onClick={() => handleCopy(JSON.stringify(response, null, 2), 'response')}
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
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </>
                )}

                {activeTab === 'formatted' && (
                  <>
                    <button
                      onClick={() => handleCopy(getFormattedResponse(), 'formatted')}
                      className="absolute top-2 right-2 p-2 rounded-lg 
                        bg-gray-800 dark:bg-gray-700 
                        text-gray-200 dark:text-gray-300
                        hover:bg-gray-700 dark:hover:bg-gray-600
                        transition-colors"
                      title="Copy to clipboard"
                    >
                      {copyStatus === 'formatted' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <div className="p-4 overflow-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[200px] max-h-[800px] prose dark:prose-invert max-w-none">
                      <ReactMarkdown>{getFormattedResponse()}</ReactMarkdown>
                    </div>
                  </>
                )}

                {activeTab === 'metrics' && (
                  <div className="p-4 overflow-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[200px] max-h-[800px]">
                    {formatMetrics(getMetrics())}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}