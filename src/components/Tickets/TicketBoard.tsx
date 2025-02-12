import React, { useState, useEffect } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ticket, TicketStatus } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../config/firebase';
import { ref, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TicketModal from './TicketModal';
import { Plus, AlertCircle } from 'lucide-react';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { useTickets } from '../../hooks/useTickets';
import { useAccount } from '../../context/AccountContext';
import { 
  Column, 
  BoardStatus, 
  BacklogStatus, 
  developmentColumns, 
  backlogColumns,
  DevelopmentColumnsType,
  BacklogColumnsType
} from '../../types/board';

type BoardMode = 'development' | 'backlog';

interface TicketBoardProps {
  mode?: BoardMode;
}

export function TicketBoard({ mode = 'development' }: TicketBoardProps) {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const { getTickets } = useTickets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [columns, setColumns] = useState<DevelopmentColumnsType | BacklogColumnsType>(() => {
    return mode === 'development' ? { ...developmentColumns } : { ...backlogColumns };
  });
  const title = mode === 'development' ? 'Development Board' : 'Backlog Board';
  const subtitle = mode === 'development' 
    ? "Manage your team's tickets"
    : 'Manage your upcoming tickets';
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        setUsers(snapshot.val());
      }
    };
    fetchUsers();
  }, []);

  // Fetch tickets using useTickets hook
  useEffect(() => {
    const fetchTickets = async () => {
      console.log('[TicketBoard] Fetching tickets for account:', currentAccount?.id);
      const ticketsData = await getTickets();
      console.log('[TicketBoard] Fetched tickets:', ticketsData);

      // Create fresh columns
      const newColumns = mode === 'development' 
        ? { ...developmentColumns }
        : { ...backlogColumns };

      // Sort tickets by order
      const sortedTickets = [...ticketsData].sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('[TicketBoard] Sorted tickets:', sortedTickets);

      // Group tickets by status
      const ticketsByStatus = sortedTickets.reduce((acc, ticket) => {
        if (!acc[ticket.status]) {
          acc[ticket.status] = [];
        }
        acc[ticket.status].push(ticket);
        return acc;
      }, {} as Record<TicketStatus, Ticket[]>);

      console.log('[TicketBoard] Tickets by status:', ticketsByStatus);

      // Distribute tickets to columns
      if (mode === 'development') {
        Object.entries(developmentColumns).forEach(([status, _]) => {
          const typedStatus = status as BoardStatus;
          if (ticketsByStatus[typedStatus]) {
            (newColumns as DevelopmentColumnsType)[typedStatus].tickets = 
              ticketsByStatus[typedStatus];
          }
        });
      } else {
        Object.entries(backlogColumns).forEach(([status, _]) => {
          const typedStatus = status as BacklogStatus;
          if (ticketsByStatus[typedStatus]) {
            (newColumns as BacklogColumnsType)[typedStatus].tickets = 
              ticketsByStatus[typedStatus];
          }
        });
      }

      console.log('[TicketBoard] Final columns:', newColumns);
      setTickets(ticketsData);
      setColumns(newColumns);
    };

    if (currentAccount?.id) {
      fetchTickets();
    }
  }, [getTickets, mode, currentAccount]);

  const getUserName = (userId: string) => {
    const userInfo = users[userId];
    return userInfo?.displayName || userInfo?.email || 'Unknown User';
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      const sourceStatus = source.droppableId as TicketStatus;
      const destStatus = destination.droppableId as TicketStatus;

      // Validate status based on mode
      const isValidMove = mode === 'development'
        ? sourceStatus in developmentColumns && destStatus in developmentColumns
        : sourceStatus in backlogColumns && destStatus in backlogColumns;

      if (!isValidMove) {
        console.error('Invalid status for current mode');
        return;
      }

      // Find the moved ticket
      const movedTicket = tickets.find(t => t.id === draggableId);
      if (!movedTicket || !movedTicket.id) return;

      // Create a batch for all updates
      const batch = writeBatch(db);
      const ticketRef = doc(db, 'tickets', movedTicket.id);

      if (sourceStatus === destStatus) {
        // Reordering within the same column
        const columnTickets = [...tickets]
          .filter(t => t.status === sourceStatus)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // Update moved ticket's order
        batch.update(ticketRef, {
          order: destination.index,
        });

        // Update orders for affected tickets
        if (destination.index < source.index) {
          // Moving up: increment orders of tickets between new and old position
          columnTickets.forEach((ticket, index) => {
            if (ticket.id && ticket.id !== draggableId && 
                index >= destination.index && index < source.index) {
              const ref = doc(db, 'tickets', ticket.id);
              batch.update(ref, { order: index + 1 });
            }
          });
        } else {
          // Moving down: decrement orders of tickets between old and new position
          columnTickets.forEach((ticket, index) => {
            if (ticket.id && ticket.id !== draggableId && 
                index > source.index && index <= destination.index) {
              const ref = doc(db, 'tickets', ticket.id);
              batch.update(ref, { order: index - 1 });
            }
          });
        }
      } else {
        // Moving between columns
        const destColumnTickets = [...tickets]
          .filter(t => t.status === destStatus)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // Update moved ticket
        batch.update(ticketRef, {
          status: destStatus,
          order: destination.index,
        });

        // Insert ticket at new position
        destColumnTickets.splice(destination.index, 0, { id: draggableId } as Ticket);

        // Update orders for destination column
        destColumnTickets.forEach((ticket, index) => {
          if (ticket.id && ticket.id !== draggableId) {
            const ref = doc(db, 'tickets', ticket.id);
            batch.update(ref, { order: index });
          }
        });

        // Update orders for source column
        const sourceColumnTickets = [...tickets]
          .filter(t => t.status === sourceStatus && t.id !== draggableId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        sourceColumnTickets.forEach((ticket, index) => {
          if (ticket.id) {
            const ref = doc(db, 'tickets', ticket.id);
            batch.update(ref, { order: index });
          }
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  return (
    <div className={`
      flex flex-col h-full
      bg-white dark:bg-[${theme.colors.dark.background.primary}]
    `}>
      <header className={commonStyles.header.wrapper}>
        <div className={commonStyles.header.container}>
          <div className={commonStyles.header.titleWrapper}>
            <h2 className={commonStyles.header.title}>{title}</h2>
            <p className={commonStyles.header.subtitle}>{subtitle}</p>
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

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={`
          ${layout.grid.cols4}
          min-h-[calc(100vh-12rem)]
          overflow-x-auto
          gap-4 lg:gap-6
          p-6
          bg-white dark:bg-[${theme.colors.dark.background.primary}]
        `}>
          {Object.entries(columns).map(([status, column]) => (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    rounded-lg
                    ${snapshot.isDraggingOver ? `ring-2 ring-blue-500/20 dark:bg-[${theme.colors.dark.background.hover}]` : ''}
                    bg-white dark:bg-[${theme.colors.dark.primary}]
                    border border-gray-200 dark:border-gray-700
                    p-4
                    ${animations.transition.normal}
                  `}
                >
                  {/* Column Header */}
                  <div className={`${layout.flex.between} mb-4`}>
                    <h2 className={typography.h4}>{column.title}</h2>
                    <span className={`
                      px-2.5 py-0.5 
                      rounded-full text-sm
                      bg-gray-100 dark:bg-gray-800
                      text-gray-600 dark:text-gray-400
                    `}>
                      {column.tickets.length}
                    </span>
                  </div>

                  {/* Tickets */}
                  <div className="space-y-3">
                    {column.tickets.map((ticket, index) => (
                      <Draggable
                        key={ticket.id}
                        draggableId={ticket.id!}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`
                              ${commonStyles.card}
                              ${snapshot.isDragging ? 'ring-2 ring-blue-500/20 shadow-lg' : ''}
                              bg-white dark:bg-[${theme.colors.dark.background.primary}]
                              hover:shadow-md dark:hover:bg-[${theme.colors.dark.background.hover}]
                              cursor-pointer
                              p-4
                            `}
                          >
                            {/* Ticket Content */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                  {ticket.ticket_id}
                                </span>
                                <span className="text-gray-900 dark:text-gray-100 truncate">
                                  {ticket.title}
                                </span>
                              </div>
                              
                              <div className={`${layout.flex.between} gap-2`}>
                                {/* Priority Badge */}
                                <span className={`
                                  px-2 py-1 rounded-md text-xs font-medium
                                  ${ticket.priority === 'high' 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : ticket.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  }
                                `}>
                                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                </span>

                                {/* Assignee */}
                                {ticket.assigneeId && (
                                  <span className={`
                                    ${typography.small}
                                    truncate max-w-[150px]
                                  `}>
                                    {getUserName(ticket.assigneeId)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>

                  {/* Empty State */}
                  {column.tickets.length === 0 && (
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
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

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

export default TicketBoard;
