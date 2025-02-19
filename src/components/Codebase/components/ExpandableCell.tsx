import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableCellProps {
  items?: string[];
}

export const ExpandableCell: React.FC<ExpandableCellProps> = ({ items }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxDisplayItems = 3;
  
  if (!items || items.length === 0) {
    return <span className="text-gray-500 dark:text-gray-400">-</span>;
  }
  
  const displayItems = isExpanded ? items : items.slice(0, maxDisplayItems);
  const hasMore = items.length > maxDisplayItems;

  return (
    <div className="group relative">
      <div className={`${!isExpanded && hasMore ? 'line-clamp-3' : ''} pr-6`}>
        {displayItems.join(', ')}
      </div>
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="absolute right-0 top-0 p-1 text-gray-500 dark:text-gray-400 
                     hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          title={isExpanded ? 'Show less' : 'Show more'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
      {hasMore && !isExpanded && (
        <div className="absolute bottom-0 right-0 left-0 h-6 bg-gradient-to-t 
                       from-white dark:from-gray-800 to-transparent pointer-events-none" />
      )}
    </div>
  );
};

export default ExpandableCell;
