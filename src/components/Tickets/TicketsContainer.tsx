import React, { useState } from 'react';
import TicketList from './TicketList';
import TicketBoard from './TicketBoard';
import TicketViewSwitch from './TicketViewSwitch';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function TicketsContainer() {
  const [view, setView] = useState<'list' | 'board'>('list');

  return (
    <div className="flex-1 bg-white dark:bg-gray-800">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tickets</h1>
          <div className="flex items-center space-x-4">
            <TicketViewSwitch view={view} onViewChange={setView} />
            <Link
              to="/tickets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Link>
          </div>
        </div>
      </div>
      {view === 'list' ? <TicketList showHeader={false} /> : <TicketBoard />}
    </div>
  );
}
