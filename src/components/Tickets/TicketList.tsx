import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { Plus, AlertCircle } from 'lucide-react';
import TicketModal from './TicketModal';
import { theme, commonStyles, typography, layout, animations } from '../../styles';

interface TicketListProps {
  showHeader?: boolean;
}

export function TicketList({ showHeader = true }: TicketListProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!user) return;

    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Ticket data:', data);
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt,
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt,
        } as Ticket;
      });
      
      console.log('All tickets:', ticketsData);
      
      const backlogTickets = ticketsData.filter(ticket => ticket.status === 'BACKLOG');
      console.log('Backlog tickets:', backlogTickets);
      
      setTickets(backlogTickets);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className={`${layout.container.fluid} py-6`}>
      {/* Header */}
      {showHeader && (
        <div className={`${layout.flex.between} mb-8`}>
          <h1 className={typography.h1}>Backlog</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className={`
              ${commonStyles.button.base} 
              ${commonStyles.button.primary}
            `}
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </button>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`
                ${commonStyles.card}
                ${animations.transition.normal}
                hover:shadow-md cursor-pointer
                p-4 sm:p-6
              `}
            >
              <div className="space-y-4">
                {/* Title and Priority */}
                <div className={layout.flex.between}>
                  <h2 className={typography.h4}>{ticket.title}</h2>
                  <span className={`
                    px-2.5 py-1 rounded-full text-sm font-medium
                    ${ticket.priority === 'high' 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : ticket.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }
                  `}>
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </span>
                </div>

                {/* Description */}
                <p className={`
                  ${typography.body}
                  line-clamp-2
                `}>
                  {ticket.description}
                </p>

                {/* Metadata */}
                <div className={`
                  ${layout.flex.between}
                  pt-4 border-t border-gray-200 dark:border-gray-700
                `}>
                  <div className="flex items-center gap-4">
                    {ticket.assigneeId && (
                      <span className={typography.small}>
                        Assigned to: {ticket.assigneeId}
                      </span>
                    )}
                    <span className={typography.small}>
                      Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {ticket.updatedAt && (
                    <span className={typography.small}>
                      Updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          // Empty State
          <div className={`
            ${commonStyles.card}
            ${layout.flex.center}
            flex-col gap-3 p-12
          `}>
            <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            <div className="text-center">
              <h3 className={`${typography.h4} mb-1`}>No tickets found</h3>
              <p className={typography.small}>
                Create a new ticket to get started
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={`
                ${commonStyles.button.base} 
                ${commonStyles.button.primary}
                mt-4
              `}
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
      <TicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export default TicketList;