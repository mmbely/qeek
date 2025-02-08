import React from 'react';
import { List, LayoutGrid } from 'lucide-react';

type ViewSwitchProps = {
  view: 'list' | 'board';
  onViewChange: (view: 'list' | 'board') => void;
};

export default function TicketViewSwitch({ view, onViewChange }: ViewSwitchProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onViewChange('list')}
        className={`p-2 rounded-md ${
          view === 'list'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        <List className="h-5 w-5" />
      </button>
      <button
        onClick={() => onViewChange('board')}
        className={`p-2 rounded-md ${
          view === 'board'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
    </div>
  );
}