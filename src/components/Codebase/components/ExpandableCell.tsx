import React, { useState } from 'react';
// import { ChevronDown, ChevronUp } from 'lucide-react';
import { CodeFunction, CodeClass } from '../../../types/repository';

type ItemType = string | { name: string } | CodeFunction | CodeClass;

interface ExpandableCellProps {
  content: string;
  maxLength: number;
}

export default function ExpandableCell({ content, maxLength }: ExpandableCellProps) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  const displayText = expanded ? content : `${content.slice(0, maxLength)}...`;

  return (
    <div>
      <span>{displayText}</span>
      {content.length > maxLength && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-500 hover:text-blue-700 ml-1"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
