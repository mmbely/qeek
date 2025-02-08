import React, { useState } from 'react';
import TicketList from './TicketList';
import { TicketBoard } from './TicketBoard';
import TicketViewSwitch from './TicketViewSwitch';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

type ViewType = 'list' | 'board';

export function TicketsContainer() {
  const [view, setView] = useState<ViewType>('list');

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tickets</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg ${
                view === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('board')}
              className={`px-4 py-2 rounded-lg ${
                view === 'board' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Board
            </button>
          </div>
        </div>
      </div>
      {view === 'list' ? <TicketList showHeader={false} /> : <TicketBoard />}
    </div>
  );
}
