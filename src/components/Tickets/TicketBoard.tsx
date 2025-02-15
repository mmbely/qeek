import React, { useState, useEffect, useCallback } from 'react';
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
import { organizeTickets } from '../../utils/board';

type BoardMode = 'development' | 'backlog';

interface TicketBoardProps {
  mode?: BoardMode;
}

type ColumnsType = DevelopmentColumnsType | BacklogColumnsType;

export function TicketBoard({ mode = 'development' }: TicketBoardProps) {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const { getTickets, updateTicket } = useTickets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [columns, setColumns] = useState<ColumnsType>(mode === 'development' ? developmentColumns : backlogColumns);
  const title = mode === 'development' ? 'Development Board' : 'Backlog Board';
  const subtitle = mode === 'development' 
    ? "Manage your team's tickets"
    : 'Manage your upcoming tickets';
  const [selectedTicket, setSelectedTicket] = useState<Ticket | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [failedTicketId, setFailedTicketId] = useState<string | null>(null);

  // Type guards
  const isDevelopmentColumns = (cols: ColumnsType): cols is DevelopmentColumnsType => {
    return 'SELECTED_FOR_DEV' in cols;
  };

  const isBacklogColumns = (cols: ColumnsType): cols is BacklogColumnsType => {
    return 'BACKLOG_DEV_NEXT' in cols;
  };

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
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId as TicketStatus;
    const destStatus = destination.droppableId as TicketStatus;

    // Create a new columns object to avoid mutating state
    const newColumns = { ...columns };

    // Ensure we're working with the correct column type and status
    if (!isDevelopmentColumns(newColumns) && !isBacklogColumns(newColumns)) {
      console.error('Invalid column type');
      return;
    }

    // Type assertion for column access
    type ValidColumnKey = keyof typeof newColumns;
    
    if (!(sourceStatus in newColumns) || !(destStatus in newColumns)) {
      console.error('Invalid status transition');
      return;
    }

    const sourceColumn = newColumns[sourceStatus as ValidColumnKey] as Column;
    const draggedTicket = sourceColumn.tickets.find((t: Ticket) => t.id === draggableId);
    if (!draggedTicket) return;

    // Immediately update UI state (optimistic update)
    if (sourceStatus === destStatus) {
      const columnTickets = [...sourceColumn.tickets];
      columnTickets.splice(source.index, 1);
      columnTickets.splice(destination.index, 0, draggedTicket);
      (newColumns[sourceStatus as ValidColumnKey] as Column).tickets = columnTickets;
    } else {
      const destColumn = newColumns[destStatus as ValidColumnKey] as Column;
      const sourceTickets = [...sourceColumn.tickets];
      const destTickets = [...destColumn.tickets];

      sourceTickets.splice(source.index, 1);
      destTickets.splice(destination.index, 0, draggedTicket);

      (newColumns[sourceStatus as ValidColumnKey] as Column).tickets = sourceTickets;
      (newColumns[destStatus as ValidColumnKey] as Column).tickets = destTickets;
    }

    // Update UI immediately
    setColumns(newColumns);

    try {
      const targetColumn = sourceStatus === destStatus 
        ? newColumns[sourceStatus as ValidColumnKey] as Column
        : newColumns[destStatus as ValidColumnKey] as Column;
      
      const newOrder = calculateNewOrder(
        targetColumn.tickets[destination.index - 1]?.order || 0,
        targetColumn.tickets[destination.index + 1]?.order || targetColumn.tickets[destination.index - 1]?.order + 2000
      );

      const updates: Partial<Ticket> = { order: newOrder };
      if (sourceStatus !== destStatus) {
        updates.status = destStatus;
      }

      await updateTicket(draggedTicket.id, updates);
    } catch (error) {
      console.error('Failed to update ticket:', error);
      setFailedTicketId(draggedTicket.id);
      setColumns(columns); // Revert on error
      setTimeout(() => setFailedTicketId(null), 2000); // Clear error state after 2s
    }
  };

  // Helper function to calculate new order
  const calculateNewOrder = (prevOrder: number, nextOrder: number): number => {
    return prevOrder + (nextOrder - prevOrder) / 2;
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleMoveToBoard = async () => {
    if (!isBacklogColumns(columns)) return;
    
    const nextForDevTickets = columns.BACKLOG_DEV_NEXT.tickets;
    if (nextForDevTickets.length === 0) return;

    try {
      // Update all tickets in the column
      const updatePromises = nextForDevTickets.map((ticket: Ticket) =>
        updateTicket(ticket.id, {
          status: 'SELECTED_FOR_DEV' as TicketStatus,
          order: calculateNewOrder(0, 2000) // Place at the beginning of the new column
        })
      );

      await Promise.all(updatePromises);

      // Update local state
      const newColumns = { ...columns } as BacklogColumnsType;
      newColumns.BACKLOG_DEV_NEXT.tickets = [];
      setColumns(newColumns);
    } catch (error) {
      console.error('Failed to move tickets to board:', error);
    }
  };

  // Add refreshTickets function
  const refreshTickets = useCallback(async () => {
    if (!currentAccount?.id) return;
    
    try {
      const ticketsData = await getTickets();
      console.log('[TicketBoard] Refreshing tickets:', ticketsData);
      const newColumns = organizeTickets(ticketsData, mode);
      setColumns(newColumns);
    } catch (error) {
      console.error('Error refreshing tickets:', error);
    }
  }, [currentAccount?.id, getTickets, mode]);

  // Update modal handlers
  const handleModalClose = () => {
    setSelectedTicket(undefined);
    setIsCreateModalOpen(false);
  };

  const handleModalSave = async () => {
    await refreshTickets();
    handleModalClose();
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
                    <div className="flex items-center gap-2">
                      {/* Add Move to Board button for Next for Development column */}
                      {mode === 'backlog' && status === 'BACKLOG_DEV_NEXT' && (
                        <button
                          onClick={handleMoveToBoard}
                          className={`
                            ${commonStyles.button.base}
                            ${commonStyles.button.secondary}
                            text-sm
                          `}
                        >
                          Move to Board
                        </button>
                      )}
                      <span className={`
                        px-2.5 py-0.5 
                        rounded-full text-sm
                        bg-gray-100 dark:bg-gray-800
                        text-gray-600 dark:text-gray-400
                      `}>
                        {column.tickets.length}
                      </span>
                    </div>
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
                              ${failedTicketId === ticket.id ? 'opacity-50' : ''}
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
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
      <TicketModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
}

export default TicketBoard;
