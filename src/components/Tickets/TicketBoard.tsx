import React, { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ticket } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../config/firebase';
import { ref, get, onValue } from 'firebase/database';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TicketModal from './TicketModal';
import { Plus, AlertCircle } from 'lucide-react';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { useTickets } from '../../hooks/useTickets';
import { useAccount } from '../../context/AccountContext';
import { 
  COLUMN_STATUS_LABELS,
  Column,
  BacklogColumnsType,
  DevelopmentColumnsType,
  backlogColumns,
  developmentColumns
} from '../../types/board';
import { TicketStatus } from '../../types/board';
import { getAuth } from 'firebase/auth';

type BoardMode = 'development' | 'backlog';

interface TicketBoardProps {
  mode?: BoardMode;
}

// Define ColumnsType as union of both column types
type ColumnsType = BacklogColumnsType | DevelopmentColumnsType;

export function TicketBoard({ mode = 'development' }: TicketBoardProps) {
  const { user } = useAuth();
  const { currentAccount, isLoading: isAccountLoading } = useAccount();
  const { getTickets, updateTicket } = useTickets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [columns, setColumns] = useState<ColumnsType>(
    mode === 'development' ? developmentColumns : backlogColumns
  );
  const title = mode === 'development' ? 'Development Board' : 'Backlog Board';
  const subtitle = mode === 'development' 
    ? "Manage your team's tickets"
    : 'Manage your upcoming tickets';
  const [selectedTicket, setSelectedTicket] = useState<Ticket | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [failedTicketId, setFailedTicketId] = useState<string | null>(null);
  const [authUsers, setAuthUsers] = useState<{[key: string]: any}>({});

  // Type guards
  const isDevelopmentColumns = (cols: ColumnsType): cols is DevelopmentColumnsType => {
    return 'SELECTED_FOR_DEV' in cols;
  };

  const isBacklogColumns = (cols: ColumnsType): cols is BacklogColumnsType => {
    return 'BACKLOG_DEV_NEXT' in cols;
  };

  // Fetch auth users
  useEffect(() => {
    const auth = getAuth();
    const fetchAuthUsers = async () => {
      console.log('[TicketBoard] Starting auth user fetch');
      // First get realtime database users for online status
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      const realtimeUsers = snapshot.exists() ? snapshot.val() : {};
      
      // Then merge with auth user data
      const mergedUsers = { ...realtimeUsers };
      if (auth.currentUser) {
        mergedUsers[auth.currentUser.uid] = {
          ...mergedUsers[auth.currentUser.uid],
          displayName: auth.currentUser.displayName,
          email: auth.currentUser.email,
          photoURL: auth.currentUser.photoURL,
        };
      }
      
      console.log('[TicketBoard] Merged users:', mergedUsers);
      setUsers(mergedUsers);
    };
    
    fetchAuthUsers();
  }, []);


  const getUserName = (userId: string) => {
    if (!userId) return 'Unassigned';
    
    const userInfo = users[userId];
    if (!userInfo) return 'Unknown User';
    
    return userInfo.displayName || userInfo.email || 'Unknown User';
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId as TicketStatus;
    const destStatus = destination.droppableId as TicketStatus;

    // Create a new columns object to avoid mutating state
    const newColumns = { ...columns };

    // Use type guards to ensure proper column access
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

  const organizeTicketsIntoColumns = useCallback((tickets: Ticket[]) => {
    // Create fresh columns with proper typing
    const newColumns = mode === 'development' 
      ? { ...developmentColumns } as DevelopmentColumnsType
      : { ...backlogColumns } as BacklogColumnsType;

    // Clear existing tickets
    if (isDevelopmentColumns(newColumns)) {
      Object.values(newColumns).forEach(column => {
        column.tickets = [];
      });
    } else if (isBacklogColumns(newColumns)) {
      Object.values(newColumns).forEach(column => {
        column.tickets = [];
      });
    }

    // Sort tickets by order
    const sortedTickets = [...tickets].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Distribute tickets to columns
    sortedTickets.forEach(ticket => {
      if (isDevelopmentColumns(newColumns)) {
        if (ticket.status in newColumns) {
          newColumns[ticket.status as keyof DevelopmentColumnsType].tickets.push(ticket);
        }
      } else if (isBacklogColumns(newColumns)) {
        if (ticket.status in newColumns) {
          newColumns[ticket.status as keyof BacklogColumnsType].tickets.push(ticket);
        }
      }
    });

    return newColumns;
  }, [mode]);

  // Load tickets when account is ready
  useEffect(() => {
    const loadTickets = async () => {
      try {
        console.log('[TicketBoard] Loading tickets for account:', currentAccount?.id);
        const ticketsData = await getTickets();
        console.log('[TicketBoard] Loaded tickets:', ticketsData.length);
        
        // Sort tickets by order
        const sortedTickets = [...ticketsData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setTickets(sortedTickets);
        
        // Organize tickets into columns
        const newColumns = organizeTicketsIntoColumns(sortedTickets);
        setColumns(newColumns);
      } catch (error) {
        if (error instanceof Error && error.message === 'Account not ready') {
          console.log('[TicketBoard] Account not ready, waiting...');
          setTickets([]);
          setColumns(mode === 'development' ? developmentColumns : backlogColumns);
        } else {
          console.error('[TicketBoard] Error loading tickets:', error);
          setTickets([]);
          setColumns(mode === 'development' ? developmentColumns : backlogColumns);
        }
      }
    };

    loadTickets();
  }, [currentAccount?.id, isAccountLoading, getTickets, organizeTicketsIntoColumns, mode]);

  // Single refresh function for both tickets and board
  const refreshBoard = useCallback(async () => {
    if (isAccountLoading) {
      console.log('[TicketBoard] Account still loading, waiting...');
      return;
    }
    
    if (!currentAccount?.id) {
      console.log('[TicketBoard] No current account, skipping board refresh');
      return;
    }
    
    try {
      console.log('[TicketBoard] Refreshing board for account:', currentAccount.id);
      const ticketsData = await getTickets();
      console.log('[TicketBoard] Refreshed tickets:', ticketsData.length);
      setTickets(ticketsData);
      const newColumns = organizeTicketsIntoColumns(ticketsData);
      setColumns(newColumns);
    } catch (error) {
      console.error('[TicketBoard] Error refreshing tickets:', error);
    }
  }, [currentAccount?.id, getTickets, organizeTicketsIntoColumns]);

  // Alias for consistency in naming
  const refreshTickets = refreshBoard;

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
            <Droppable droppableId={status} key={`column-${status}`}>
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
                        key={`${ticket.id}-${status}`}
                        draggableId={ticket.id}
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
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                  {ticket.ticket_id}
                                </span>
                                <span className="text-gray-900 dark:text-gray-100 line-clamp-2">
                                  {ticket.title}
                                </span>
                              </div>
                              
                              <div className={`${layout.flex.between} gap-2 flex-wrap`}>
                                <div className="flex gap-2 items-center">
                                  {/* Type Badge */}
                                  <span className={`
                                    px-2 py-1 rounded-md text-xs font-medium
                                    ${(ticket.type || 'task') === 'bug' 
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : (ticket.type || 'task') === 'story'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                    }
                                  `}>
                                    {(ticket.type || 'task').charAt(0).toUpperCase() + (ticket.type || 'task').slice(1)}
                                  </span>

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
                                </div>

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
          onSave={refreshBoard}
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
