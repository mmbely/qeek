import React from 'react';
import { 
  SiPython, 
  SiJavascript, 
  SiTypescript, 
  SiReact, 
  SiVuedotjs,
  SiHtml5,
  SiCss3,
  SiJavascript as SiJava,
  SiPhp,
  SiRuby,
  SiSwift,
  SiKotlin,
  SiGo,
  SiRust,
  SiMarkdown,
  SiDocker,
  SiGit
} from 'react-icons/si';
import { FolderIcon, FileIcon as LucideFileIcon, FileCodeIcon, FileJsonIcon } from 'lucide-react';

interface FileIconProps {
  filePath: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ filePath, className }) => {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const fileName = filePath.toLowerCase();

  // Language-specific icons
  switch (extension) {
    // Python
    case 'py':
      return <SiPython className={className || "h-4 w-4 text-blue-500"} />;
    
    // JavaScript
    case 'js':
      return <SiJavascript className={className || "h-4 w-4 text-yellow-400"} />;
    
    // TypeScript
    case 'ts':
    case 'tsx':
      return <SiTypescript className={className || "h-4 w-4 text-blue-600"} />;
    
    // React
    case 'jsx':
      return <SiReact className={className || "h-4 w-4 text-cyan-400"} />;
    
    // Vue
    case 'vue':
      return <SiVuedotjs className={className || "h-4 w-4 text-emerald-400"} />;
    
    // HTML
    case 'html':
    case 'htm':
      return <SiHtml5 className={className || "h-4 w-4 text-orange-500"} />;
    
    // CSS
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <SiCss3 className={className || "h-4 w-4 text-blue-500"} />;
    
    // Java
    case 'java':
      return <SiJava className={className || "h-4 w-4 text-red-500"} />;
    
    // PHP
    case 'php':
      return <SiPhp className={className || "h-4 w-4 text-purple-500"} />;
    
    // Ruby
    case 'rb':
      return <SiRuby className={className || "h-4 w-4 text-red-600"} />;
    
    // Swift
    case 'swift':
      return <SiSwift className={className || "h-4 w-4 text-orange-500"} />;
    
    // Kotlin
    case 'kt':
    case 'kts':
      return <SiKotlin className={className || "h-4 w-4 text-purple-600"} />;
    
    // Go
    case 'go':
      return <SiGo className={className || "h-4 w-4 text-cyan-500"} />;
    
    // Rust
    case 'rs':
      return <SiRust className={className || "h-4 w-4 text-orange-600"} />;
    
    // Markdown
    case 'md':
    case 'mdx':
      return <SiMarkdown className={className || "h-4 w-4 text-gray-500"} />;
    
    // JSON
    case 'json':
      return <FileJsonIcon className={className || "h-4 w-4 text-yellow-600"} />;
    
    // YAML
    case 'yml':
    case 'yaml':
      return <FileCodeIcon className={className || "h-4 w-4 text-gray-500"} />;
  }

  // Special files
  if (fileName === 'dockerfile') {
    return <SiDocker className={className || "h-4 w-4 text-blue-500"} />;
  }
  if (fileName === '.gitignore' || fileName.endsWith('.git')) {
    return <SiGit className={className || "h-4 w-4 text-orange-600"} />;
  }

  // Directory
  if (!extension || extension === filePath) {
    return <FolderIcon className={className || "h-4 w-4 text-yellow-400"} />;
  }

  // Default file icon
  return <LucideFileIcon className={className || "h-4 w-4 text-gray-400"} />;
};

export default FileIcon;
