import React from 'react';
import type { IconType } from 'react-icons';
import type { IconBaseProps } from 'react-icons';
import { 
  SiPython, 
  SiJavascript, 
  SiTypescript, 
  SiHtml5,
  SiCss3,
  SiMarkdown,
} from 'react-icons/si';

interface FileIconProps {
  language: string | null | undefined;
  className?: string;
}

type FileExtension =
  | 'typescript'
  | 'ts'
  | 'tsx'
  | 'javascript'
  | 'js'
  | 'jsx'
  | 'python'
  | 'py'
  | 'css'
  | 'html'
  | 'markdown'
  | 'md';

const iconMap = new Map<FileExtension, IconType>([
  ['typescript', SiTypescript],
  ['ts', SiTypescript],
  ['tsx', SiTypescript],
  ['javascript', SiJavascript],
  ['js', SiJavascript],
  ['jsx', SiJavascript],
  ['python', SiPython],
  ['py', SiPython],
  ['css', SiCss3],
  ['html', SiHtml5],
  ['markdown', SiMarkdown],
  ['md', SiMarkdown],
]);

export default function FileIcon({ language, className }: FileIconProps) {
  if (!language) return null;

  const lang = language.toLowerCase() as FileExtension;
  const Icon = iconMap.get(lang);
  if (!Icon) return null;

  const props: IconBaseProps = {
    size: 16,
    className: `mr-2 text-gray-600 dark:text-gray-300 ${className || ''}`,
    'aria-hidden': true,
  };

  return React.createElement(Icon as React.ComponentType<IconBaseProps>, props);
}
