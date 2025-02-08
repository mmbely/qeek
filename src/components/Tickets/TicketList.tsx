import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';

const getStatusStyle = (status: Ticket['status']) => {
  switch (status) {
    case 'DEPLOYED':
      return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
    case 'READY_FOR_TESTING':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
    case 'SELECTED_FOR_DEV':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
    case 'BACKLOG':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }
};

export default function TicketList({ showHeader = true }: { showHeader?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First, get tickets without ordering while index builds
    const simpleQuery = query(
      collection(db, 'tickets'),
      where('status', '==', 'BACKLOG')
    );
    
    const unsubscribe = onSnapshot(
      simpleQuery,
      (snapshot) => {
        const ticketsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Ticket[];
        
        // Sort locally until index is ready
        ticketsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        setTickets(ticketsData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching tickets:', error);
        setError('Error loading tickets. Please try again later.');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, []);

  const handleMoveToDev = async (ticketId: string) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'SELECTED_FOR_DEV',
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error moving ticket to development:', error);
      alert('Failed to move ticket to development. Please try again.');
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-gray-800">
      {showHeader && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Backlog</h1>
            <Link
              to="/tickets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Link>
          </div>
        </div>
      )}
      
      <div className="p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tickets...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-4 text-gray-600 dark:text-gray-400">
            No tickets in backlog. Create a new ticket to get started.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <Link to={`/tickets/${ticket.id}`} className="block">
                          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            {ticket.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {ticket.description}
                          </p>
                        </Link>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                            ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                            'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <button
                          onClick={() => ticket.id && handleMoveToDev(ticket.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Move to Dev
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}