import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CodeFunction, CodeClass } from '../../../types/repository';

type ItemType = string | { name: string } | CodeFunction | CodeClass;

export const ExpandableCell = ({ items }: { items?: ItemType[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items?.length) return <span className="text-gray-500 dark:text-gray-400">-</span>;

  const displayItems = isExpanded ? items : items.slice(0, 2);

  const getDisplayName = (item: ItemType): string => {
    if (typeof item === 'string') return item;
    return item.name;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {displayItems.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs 
                     bg-gray-100 dark:bg-gray-700 
                     text-gray-700 dark:text-gray-300"
          >
            {getDisplayName(item)}
          </span>
        ))}
        {items.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs 
                     bg-blue-100 dark:bg-blue-900/30 
                     text-blue-700 dark:text-blue-300 
                     hover:bg-blue-200 dark:hover:bg-blue-900/50 
                     transition-colors"
          >
            {isExpanded ? 'Show Less' : `+${items.length - 2} more`}
          </button>
        )}
      </div>
    </div>
  );
};

export default ExpandableCell;
