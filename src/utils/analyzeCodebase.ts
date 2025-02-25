import { RepositoryFile } from '../types/repository';

export const analyzeCodebase = (files: RepositoryFile[]) => {
  console.log('Starting codebase analysis with files:', files); // Debug input
  
  const metadata = {
    directories: new Set<string>(),
    fileTypes: new Set<string>(),
    dependencies: new Set<string>(),
    testFiles: new Set<string>(),
    configFiles: new Set<string>(),
    sourceFiles: new Set<string>(),
    imports: new Set<string>(),
    exports: new Set<string>(),
    apiPatterns: new Set<string>(),
    envVars: new Set<string>(),
    scripts: new Set<string>()
  };

  files.forEach(file => {
    console.log('Processing file:', file.path); // Debug each file processing

    // Add directory path
    const dirPath = file.path.split('/').slice(0, -1).join('/');
    if (dirPath) {
      metadata.directories.add(dirPath);
      console.log('Added directory:', dirPath);
    }

    // Add file type
    const ext = file.path.split('.').pop();
    if (ext) {
      metadata.fileTypes.add(ext);
      console.log('Added file type:', ext);
    }

    // Categorize files
    if (file.path.includes('test') || file.path.includes('spec')) {
      metadata.testFiles.add(file.path);
      console.log('Added test file:', file.path);
    } else if (file.path.includes('config') || file.path.endsWith('.config.js')) {
      metadata.configFiles.add(file.path);
      console.log('Added config file:', file.path);
    } else if (file.path.includes('src/')) {
      metadata.sourceFiles.add(file.path);
      console.log('Added source file:', file.path);
    }

    // Parse package.json
    if (file.path.endsWith('package.json') && file.content) {
      try {
        const packageJson = JSON.parse(file.content);
        console.log('Parsed package.json:', packageJson);
        if (packageJson.dependencies) {
          Object.keys(packageJson.dependencies).forEach(dep => 
            metadata.dependencies.add(dep));
        }
        if (packageJson.scripts) {
          Object.keys(packageJson.scripts).forEach(script => 
            metadata.scripts.add(script));
        }
      } catch (e) {
        console.warn('Failed to parse package.json:', e);
      }
    }

    // Parse imports and exports
    if (file.ai_analysis?.imports) {
      file.ai_analysis.imports.forEach(imp => {
        if (typeof imp === 'object' && imp.path) {
          metadata.imports.add(imp.path);
          console.log('Added import:', imp.path);
        }
      });
    }

    // Look for API patterns and env vars
    if (file.content) {
      // Look for HTTP method patterns
      const httpMethods = file.content.match(/(get|post|put|delete|patch)\s*\(['"]/gi);
      if (httpMethods) {
        httpMethods.forEach(method => {
          metadata.apiPatterns.add(method);
          console.log('Added API pattern:', method);
        });
      }

      // Look for environment variables
      const envVars = file.content.match(/process\.env\.[A-Z_]+/g);
      if (envVars) {
        envVars.forEach(env => {
          metadata.envVars.add(env);
          console.log('Added env var:', env);
        });
      }
    }
  });

  console.log('Final metadata:', metadata); // Debug output
  return metadata;
};

