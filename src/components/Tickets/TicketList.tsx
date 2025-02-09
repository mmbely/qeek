import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { Plus, AlertCircle, ArrowRight } from 'lucide-react';
import TicketModal from './TicketModal';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { useTickets } from '../../hooks/useTickets';

interface TicketListProps {
  showHeader?: boolean;
}

export function TicketList({ showHeader = true }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { getTickets, updateTicket } = useTickets();
  const { user } = useAuth();

  const fetchTickets = useCallback(async () => {
    const allTickets = await getTickets();
    setTickets(allTickets);
  }, [getTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className={`
      flex flex-col h-full
      bg-white dark:bg-[${theme.colors.dark.background.primary}]
    `}>
      {showHeader && (
        <header className={commonStyles.header.wrapper}>
          <div className={commonStyles.header.container}>
            <div className={commonStyles.header.titleWrapper}>
              <h2 className={commonStyles.header.title}>All Tickets</h2>
              <p className={commonStyles.header.subtitle}>All tickets in a list</p>
            </div>
            <div className={commonStyles.header.actions}>
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
          </div>
        </header>
      )}

      <div className="p-6">
        {tickets.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Title</th>
                <th className="text-left">Description</th>
                <th className="text-left">Priority</th>
                <th className="text-left">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <td>{ticket.title}</td>
                  <td>{ticket.description}</td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.assigneeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={`
            ${layout.flex.center}
            flex-col gap-2 p-6
            text-gray-400 dark:text-gray-600
          `}>
            <AlertCircle className="w-5 h-5" />
            <p className={typography.small}>No tickets</p>
          </div>
        )}
      </div>

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
