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
  language: string | null | undefined;
  className?: string;
}

export default function FileIcon({ language, className }: FileIconProps) {
  const iconProps = { className: `w-4 h-4 mr-2 ${className}` };

  if (!language) return null;

  switch (language.toLowerCase()) {
    case 'typescript':
    case 'ts':
    case 'tsx':
      return <SiTypescript {...iconProps} />;
    case 'javascript':
    case 'js':
    case 'jsx':
      return <SiJavascript {...iconProps} />;
    case 'python':
    case 'py':
      return <SiPython {...iconProps} />;
    case 'css':
      return <SiCss3 {...iconProps} />;
    case 'html':
      return <SiHtml5 {...iconProps} />;
    case 'markdown':
    case 'md':
      return <SiMarkdown {...iconProps} />;
    default:
      return null;
  }
}
