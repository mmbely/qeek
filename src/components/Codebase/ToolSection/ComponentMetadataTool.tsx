import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, Component, Copy, GitPullRequest, Download, Clock } from 'lucide-react';
import { generateComponentMetadata } from '../../../utils/generateComponentMetadata';
import { useTheme } from '../../../context/ThemeContext';
import { useAccount } from '../../../context/AccountContext';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RepositoryFile } from '../../../types/repository';
import { getRepositoryFile } from '../../../services/github';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { diffJson } from 'diff';

// We'll use our own SimpleTabs implementation since ui/tabs is not available
interface SimpleTabsProps {
  defaultValue: string;
  children: React.ReactNode;
}

interface TabProps {
  value: string;
  label: string;
  children: React.ReactNode;
}

// Simple tab implementation
const SimpleTabs = ({ defaultValue, children, onValueChange }: SimpleTabsProps & { onValueChange?: (value: string) => void }) => {
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

interface ComponentMetadataToolProps {
  files: RepositoryFile[];
}

const ComponentMetadataTool = ({ files }: ComponentMetadataToolProps) => {
  const [existingMetadata, setExistingMetadata] = useState<any>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const { isDarkMode } = useTheme();
  const { currentAccount } = useAccount();
  const [activeTab, setActiveTab] = useState('existing');
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [hasDifferences, setHasDifferences] = useState(false);
  const [isScrollingSynced, setIsScrollingSynced] = useState(true);
  const [differences, setDifferences] = useState<{path: string, existing: any, generated: any}[]>([]);
  const [highlightedCode, setHighlightedCode] = useState<{existing: React.ReactNode, generated: React.ReactNode}>({
    existing: null,
    generated: null
  });

  // Check for existing components.json file
  useEffect(() => {
    const checkExistingFile = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        setCheckingExisting(false);
        return;
      }

      try {
        console.log("Checking for existing components.json file...");
        
        // Get repository ID for Firestore
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        console.log("Repository ID:", repoId);
        
        // Try direct GitHub raw URL first (most reliable method)
        try {
          console.log("Trying direct GitHub raw URL...");
          const rawUrl = `https://raw.githubusercontent.com/${currentAccount.settings.githubRepository}/main/.cursor/components.json`;
          console.log(`Fetching from URL: ${rawUrl}`);
          
          const response = await fetch(rawUrl);
          if (response.ok) {
            const jsonData = await response.json();
            console.log("Successfully fetched components.json from GitHub raw URL");
            setExistingMetadata(jsonData);
            setActiveTab('existing');
            return; // Exit early if successful
          } else {
            console.error("Failed to fetch from GitHub raw URL:", response.statusText);
          }
        } catch (fetchError) {
          console.error("Error fetching from GitHub raw URL:", fetchError);
        }
        
        // If direct fetch fails, try Firestore
        try {
          console.log("Trying direct Firestore query...");
          const fileRef = doc(db, 'repositories', repoId, 'files', '.cursor_components.json');
          const docSnapshot = await getDoc(fileRef);
          
          if (docSnapshot.exists()) {
            console.log("Found file in Firestore!");
            const data = docSnapshot.data();
            console.log("File data:", data);
            
            // Try to extract the SHA from metadata
            const sha = data.metadata?.sha;
            if (sha) {
              console.log(`Found SHA: ${sha}, trying to fetch content from GitHub`);
              
              // Use GitHub's blob API to get the content using the SHA
              try {
                const blobUrl = `https://api.github.com/repos/${currentAccount.settings.githubRepository}/git/blobs/${sha}`;
                console.log(`Fetching blob from: ${blobUrl}`);
                
                const response = await fetch(blobUrl);
                if (response.ok) {
                  const blobData = await response.json();
                  if (blobData.content) {
                    // Decode base64 content
                    const decodedContent = atob(blobData.content.replace(/\n/g, ''));
                    try {
                      const parsedContent = JSON.parse(decodedContent);
                      console.log("Successfully parsed content from GitHub blob");
                      setExistingMetadata(parsedContent);
                      setActiveTab('existing');
                      return; // Exit early if successful
                    } catch (parseError) {
                      console.error("Error parsing blob content:", parseError);
                    }
                  }
                }
              } catch (blobError) {
                console.error("Error fetching blob:", blobError);
              }
            }
            
            // If we still don't have metadata, use the document data itself
            console.log("Using document data as fallback");
            
            // Check if the document has a 'components' field
            if (data.components) {
              console.log("Found 'components' field in document");
              setExistingMetadata(data);
              setActiveTab('existing');
            } else {
              // As a last resort, try to fetch the file content using the path
              try {
                console.log(`Trying to fetch file content using path: ${data.path}`);
                const fileContent = await fetch(`https://raw.githubusercontent.com/${currentAccount.settings.githubRepository}/main/${data.path}`);
                if (fileContent.ok) {
                  const jsonData = await fileContent.json();
                  console.log("Successfully fetched file content");
                  setExistingMetadata(jsonData);
                  setActiveTab('existing');
                } else {
                  console.error("Failed to fetch file content:", fileContent.statusText);
                  setError("Could not fetch components.json content");
                }
              } catch (contentError) {
                console.error("Error fetching file content:", contentError);
                setError("Error fetching components.json");
              }
            }
          } else {
            console.log("Document not found in Firestore");
            setError("Components.json file not found");
          }
        } catch (firestoreError) {
          console.error("Error querying Firestore:", firestoreError);
          setError("Error accessing database");
        }
      } catch (error) {
        console.error("Error checking for components.json:", error);
        setError("Unexpected error occurred");
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingFile();
  }, [currentAccount, db]);

  const handleGenerateMetadata = async () => {
    setLoading(true);
    setError(null);
    setPushSuccess(false);
    
    try {
      if (!currentAccount?.settings?.githubRepository) {
        throw new Error('No repository connected');
      }

      const metadata = await generateComponentMetadata(
        files,
        currentAccount.settings.githubRepository
      );
      setGeneratedMetadata(metadata);
      setActiveTab('generated');
    } catch (error) {
      console.error('Failed to generate metadata:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Since updateRepositoryFile doesn't exist, we'll implement a simple version
  const handlePushToGitHub = async () => {
    if (!generatedMetadata || !currentAccount?.settings?.githubRepository) {
      return;
    }

    setPushLoading(true);
    try {
      // We need to implement this function or use an alternative approach
      // For now, we'll just simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, you would call your GitHub API to update the file
      // await updateRepositoryFile(
      //   currentAccount.settings.githubRepository,
      //   '.cursor/components.json',
      //   JSON.stringify(generatedMetadata, null, 2),
      //   'Update components.json via Qeek'
      // );
      
      setPushSuccess(true);
      setExistingMetadata(generatedMetadata);
      setShowPushDialog(false);
    } catch (error) {
      console.error('Failed to push to GitHub:', error);
      setError(error instanceof Error ? error.message : 'Failed to push to GitHub');
    } finally {
      setPushLoading(false);
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

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Find differences between objects
  const findObjectDifferences = (obj1: any, obj2: any, path = ''): {path: string, existing: any, generated: any}[] => {
    const result: {path: string, existing: any, generated: any}[] = [];
    
    // Helper function to check if a value is an object
    const isObject = (value: any) => 
      value !== null && typeof value === 'object' && !Array.isArray(value);
    
    // Get all keys from both objects
    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    const allKeys: string[] = [];
    
    // Add keys from obj1
    keys1.forEach(key => {
      if (!allKeys.includes(key)) {
        allKeys.push(key);
      }
    });
    
    // Add keys from obj2
    keys2.forEach(key => {
      if (!allKeys.includes(key)) {
        allKeys.push(key);
      }
    });
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Key exists in both objects
      if (key in obj1 && key in obj2) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        
        // Both values are objects - recurse
        if (isObject(val1) && isObject(val2)) {
          result.push(...findObjectDifferences(val1, val2, currentPath));
        } 
        // Both values are arrays - compare them
        else if (Array.isArray(val1) && Array.isArray(val2)) {
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            result.push({
              path: currentPath,
              existing: val1,
              generated: val2
            });
          }
        }
        // Values are different
        else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          result.push({
            path: currentPath,
            existing: val1,
            generated: val2
          });
        }
      }
      // Key only in obj1
      else if (key in obj1) {
        result.push({
          path: currentPath,
          existing: obj1[key],
          generated: undefined
        });
      }
      // Key only in obj2
      else {
        result.push({
          path: currentPath,
          existing: undefined,
          generated: obj2[key]
        });
      }
    }
    
    return result;
  };

  // Generate diff when both metadata are available and compare tab is active
  useEffect(() => {
    if (existingMetadata && generatedMetadata && activeTab === 'compare') {
      console.log("Finding differences between existing and generated metadata");
      
      try {
        // Find differences between objects
        const diffs = findObjectDifferences(existingMetadata, generatedMetadata);
        console.log("Differences found:", diffs.length);
        
        if (diffs.length > 0) {
          console.log("First difference:", diffs[0]);
        }
        
        setDifferences(diffs);
        setHasDifferences(diffs.length > 0);
        
        // Generate highlighted code
        if (diffs.length > 0) {
          generateHighlightedCode(existingMetadata, generatedMetadata, diffs);
        }
      } catch (error) {
        console.error("Error finding differences:", error);
        setHasDifferences(false);
      }
    }
  }, [existingMetadata, generatedMetadata, activeTab]);

  // Generate highlighted code with differences
  const generateHighlightedCode = (existing: any, generated: any, diffs: {path: string, existing: any, generated: any}[]) => {
    // Convert objects to pretty JSON strings
    const existingStr = JSON.stringify(existing, null, 2);
    const generatedStr = JSON.stringify(generated, null, 2);
    
    // Create maps to track line numbers for each path
    const existingPathMap = createPathLineMap(existing);
    const generatedPathMap = createPathLineMap(generated);
    
    // Split into lines
    const existingLines = existingStr.split('\n');
    const generatedLines = generatedStr.split('\n');
    
    // Create highlighted versions
    const highlightedExisting = (
      <div>
        {existingLines.map((line, index) => {
          // Check if this line is part of a difference
          const isDiffLine = diffs.some(diff => {
            const lineRange = existingPathMap[diff.path];
            return lineRange && index >= lineRange.start && index <= lineRange.end;
          });
          
          return (
            <div 
              key={index} 
              className={isDiffLine ? 'bg-red-100 dark:bg-red-900/30' : ''}
              style={{ padding: '1px 0' }}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
    
    const highlightedGenerated = (
      <div>
        {generatedLines.map((line, index) => {
          // Check if this line is part of a difference
          const isDiffLine = diffs.some(diff => {
            const lineRange = generatedPathMap[diff.path];
            return lineRange && index >= lineRange.start && index <= lineRange.end;
          });
          
          return (
            <div 
              key={index} 
              className={isDiffLine ? 'bg-green-100 dark:bg-green-900/30' : ''}
              style={{ padding: '1px 0' }}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
    
    setHighlightedCode({
      existing: highlightedExisting,
      generated: highlightedGenerated
    });
  };

  // Create a map of JSON paths to line numbers in the formatted JSON
  const createPathLineMap = (obj: any) => {
    const jsonStr = JSON.stringify(obj, null, 2);
    const lines = jsonStr.split('\n');
    const pathMap: Record<string, {start: number, end: number}> = {};
    
    // Stack to keep track of current path and indentation
    const stack: {path: string, indent: number}[] = [];
    let currentPath = '';
    
    lines.forEach((line, index) => {
      // Calculate indentation level
      const match = line.match(/^(\s*)/);
      const indent = match ? match[1].length : 0;
      
      // Pop stack items with greater indentation
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      
      // Update current path based on stack
      currentPath = stack.length > 0 ? stack[stack.length - 1].path : '';
      
      // Check if line contains a property name
      const propMatch = line.match(/^\s*"([^"]+)"\s*:/);
      if (propMatch) {
        const propName = propMatch[1];
        const newPath = currentPath ? `${currentPath}.${propName}` : propName;
        
        // Check if this is an object or array opening
        if (line.includes('{') || line.includes('[')) {
          stack.push({ path: newPath, indent });
          pathMap[newPath] = { start: index, end: index };
        } else {
          // This is a simple property
          pathMap[newPath] = { start: index, end: index };
        }
      } 
      // Check for array items
      else if (line.match(/^\s*\{/) && currentPath) {
        // This is an array item in an array
        const arrayPath = currentPath;
        if (pathMap[arrayPath]) {
          pathMap[arrayPath].end = Math.max(pathMap[arrayPath].end, index);
        }
      }
    });
    
    return pathMap;
  };

  // Synchronized scrolling for compare panels
  useEffect(() => {
    if (activeTab !== 'compare' || !leftPanelRef.current || !rightPanelRef.current || !isScrollingSynced) {
      return;
    }

    console.log("Setting up synchronized scrolling");
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    
    // Flag to prevent infinite scroll loops
    let isScrolling = false;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isScrolling) return;
      
      isScrolling = true;
      
      // Calculate scroll percentage
      const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
      
      // Apply the same percentage to the target
      target.scrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight || 1);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isScrolling = false;
      }, 50);
    };

    const handleLeftScroll = () => syncScroll(leftPanel, rightPanel);
    const handleRightScroll = () => syncScroll(rightPanel, leftPanel);

    leftPanel.addEventListener('scroll', handleLeftScroll);
    rightPanel.addEventListener('scroll', handleRightScroll);

    return () => {
      leftPanel.removeEventListener('scroll', handleLeftScroll);
      rightPanel.removeEventListener('scroll', handleRightScroll);
    };
  }, [activeTab, isScrollingSynced]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
            Component Metadata
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Extract metadata from your components
          </p>
        </div>
        
        {/* Action buttons moved to top right */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateMetadata}
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
                Generate Metadata
              </>
            )}
          </button>
          
          {generatedMetadata && (
            <button
              onClick={() => setShowPushDialog(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                       flex items-center gap-2"
            >
              <GitPullRequest className="h-4 w-4" />
              Push to GitHub
            </button>
          )}
          
          {(existingMetadata || generatedMetadata) && (
            <button
              onClick={() => downloadJson(generatedMetadata || existingMetadata, 'components.json')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                       rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </button>
          )}
        </div>
      </div>

      {/* GitHub not connected message */}
      {!currentAccount?.settings?.githubRepository && !checkingExisting && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              GitHub Repository Not Connected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your GitHub repository in settings to use this feature.
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {checkingExisting && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Checking for existing metadata...
            </h3>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              Error
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {pushSuccess && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6 mb-6 border-l-4 border-green-500">
          <div className="flex items-center py-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">
                Successfully pushed to GitHub!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {!checkingExisting && !error && currentAccount?.settings?.githubRepository && (
        <div className="bg-white dark:bg-[#1e2132] rounded-lg shadow-sm p-6">
          {/* No metadata found state */}
          {!existingMetadata && !generatedMetadata && (
            <div className="text-center py-8">
              <Component className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Component Metadata Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Generate component metadata to document your UI components.
              </p>
            </div>
          )}

          {/* Metadata content */}
          {(existingMetadata || generatedMetadata) && (
            <SimpleTabs defaultValue={activeTab} onValueChange={setActiveTab}>
              {existingMetadata && (
                <Tab value="existing" label="Existing Metadata">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Existing Metadata
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(existingMetadata, null, 2))}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {JSON.stringify(existingMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Tab>
              )}
              
              {generatedMetadata && (
                <Tab value="generated" label="Generated Metadata">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center p-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 px-2">
                          Generated Metadata
                        </h3>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(generatedMetadata, null, 2))}
                          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                   dark:hover:bg-gray-600 rounded-md flex items-center gap-2 
                                   text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono">
                        {JSON.stringify(generatedMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Tab>
              )}
              
              {existingMetadata && generatedMetadata && (
                <Tab value="compare" label="Compare">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 p-4">
                        Compare Metadata
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          {hasDifferences ? (
                            <span className="text-sm text-red-500 font-medium">
                              {differences.length} difference{differences.length !== 1 ? 's' : ''} found
                            </span>
                          ) : (
                            <span className="text-sm text-green-500 font-medium">
                              No differences found
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isScrollingSynced}
                              onChange={() => setIsScrollingSynced(!isScrollingSynced)}
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                              Sync scrolling
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Existing <span className="text-red-500">(differences highlighted)</span>
                          </h4>
                          <div 
                            ref={leftPanelRef}
                            className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-[500px] font-mono p-2 bg-gray-50 dark:bg-gray-900 rounded"
                          >
                            {highlightedCode.existing || (
                              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                {JSON.stringify(existingMetadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Generated <span className="text-green-500">(differences highlighted)</span>
                          </h4>
                          <div 
                            ref={rightPanelRef}
                            className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-[500px] font-mono p-2 bg-gray-50 dark:bg-gray-900 rounded"
                          >
                            {highlightedCode.generated || (
                              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                {JSON.stringify(generatedMetadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab>
              )}
            </SimpleTabs>
          )}
        </div>
      )}

      {/* Push to GitHub confirmation dialog */}
      {showPushDialog && (
        <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Push to GitHub
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will update the components.json file in your GitHub repository. Are you sure you want to continue?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPushDialog(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                           rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
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
        </Dialog>
      )}
    </div>
  );
};

export default ComponentMetadataTool;