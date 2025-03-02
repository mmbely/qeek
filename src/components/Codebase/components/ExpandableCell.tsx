import React, { useState } from 'react';
// import { ChevronDown, ChevronUp } from 'lucide-react';
import { CodeFunction, CodeClass } from '../../../types/repository';

type ItemType = string | { name: string } | CodeFunction | CodeClass;

export interface ExpandableCellProps {
  text?: string;
  content?: string;
  maxLength: number;
}

export default function ExpandableCell({ text, content, maxLength }: ExpandableCellProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Use either text or content prop
  const displayText = text || content || '';
  
  if (!displayText || displayText.length <= maxLength) {
    return <span>{displayText}</span>;
  }
  
  return (
    <div onClick={(e) => {
      e.stopPropagation(); // Prevent row click event
      setExpanded(!expanded);
    }}>
      {expanded ? (
        <div className="relative">
          <span>{displayText}</span>
          <button 
            className="text-blue-600 dark:text-blue-400 hover:underline mt-1 text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
          >
            Show less
          </button>
        </div>
      ) : (
        <div className="relative">
          <span>{displayText.substring(0, maxLength)}...</span>
          <button 
            className="text-blue-600 dark:text-blue-400 hover:underline ml-1 text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
