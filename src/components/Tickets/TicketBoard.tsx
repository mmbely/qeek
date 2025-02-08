import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { database } from '../../services/firebase';
import { ref, get } from 'firebase/database';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TicketModal from './TicketModal';
import { Plus, AlertCircle } from 'lucide-react';
import { theme, commonStyles, typography, layout, animations } from '../../styles';

type BoardStatus = Exclude<Ticket['status'], 'BACKLOG'>;

interface ColumnType {
  [key: string]: {
    title: string;
    tickets: Ticket[];
  };
}

export function TicketBoard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [columns, setColumns] = useState<ColumnType>({
    SELECTED_FOR_DEV: { title: 'Selected for Dev', tickets: [] },
    IN_PROGRESS: { title: 'In Progress', tickets: [] },
    READY_FOR_TESTING: { title: 'Ready for Testing', tickets: [] },
    DEPLOYED: { title: 'Deployed', tickets: [] },
  });
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

  // Fetch tickets and organize them into columns
  useEffect(() => {
    if (!user) return;

    const ticketsRef = collection(db, 'tickets');
    const unsubscribe = onSnapshot(
      query(ticketsRef),
      (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          order: doc.data().order || 0, // Default order to 0 if not set
        })) as Ticket[];

        // Organize tickets into columns
        const newColumns = {
          SELECTED_FOR_DEV: { title: 'Selected for Dev', tickets: [] },
          IN_PROGRESS: { title: 'In Progress', tickets: [] },
          READY_FOR_TESTING: { title: 'Ready for Testing', tickets: [] },
          DEPLOYED: { title: 'Deployed', tickets: [] },
        } as ColumnType;

        // Sort tickets by order within each status
        ticketsData.forEach(ticket => {
          if (ticket.status !== 'BACKLOG' && ticket.status in newColumns) {
            newColumns[ticket.status as BoardStatus].tickets.push(ticket);
          }
        });

        // Sort tickets in each column by order
        Object.values(newColumns).forEach(column => {
          column.tickets.sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        setColumns(newColumns);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getUserName = (userId: string) => {
    const userInfo = users[userId];
    return userInfo?.displayName || userInfo?.email || 'Unknown User';
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      const ticketRef = doc(db, 'tickets', draggableId);
      const updates: any = {
        status: destination.droppableId as BoardStatus,
      };

      // If we're reordering within the same column, update the order
      if (destination.droppableId === source.droppableId) {
        const columnTickets = columns[destination.droppableId as BoardStatus].tickets;
        const newOrder = Array.from(columnTickets);
        const [movedTicket] = newOrder.splice(source.index, 1);
        newOrder.splice(destination.index, 0, movedTicket);
        
        // Update order field for the moved ticket
        updates.order = destination.index;
        
        // Update order for affected tickets
        const batch = writeBatch(db);
        newOrder.forEach((ticket, index) => {
          if (ticket.id !== draggableId && ticket.order !== index) {
            batch.update(doc(db, 'tickets', ticket.id!), { order: index });
          }
        });
        
        await batch.commit();
      } else {
        // If moving to a new column, set order to the destination index
        updates.order = destination.index;
      }

      await updateDoc(ticketRef, updates);
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  return (
    <div className={`${layout.container.fluid} py-6`}>
      {/* Header */}
      <div className={`${layout.flex.between} mb-8`}>
        <h1 className={typography.h1}>Development Board</h1>
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

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={`
          ${layout.grid.cols4}
          min-h-[calc(100vh-12rem)]
          overflow-x-auto
          gap-4 lg:gap-6
        `}>
          {Object.entries(columns).map(([status, column]) => (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    ${commonStyles.card}
                    ${snapshot.isDraggingOver ? 'ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10' : ''}
                    p-4
                    ${animations.transition.normal}
                  `}
                >
                  {/* Column Header */}
                  <div className={`${layout.flex.between} mb-4`}>
                    <h2 className={typography.h4}>{column.title}</h2>
                    <span className={`
                      px-2.5 py-0.5 rounded-full text-sm
                      bg-gray-100 dark:bg-gray-700
                      text-gray-600 dark:text-gray-300
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
                              hover:shadow-md
                              cursor-pointer
                              p-4
                            `}
                          >
                            {/* Ticket Content */}
                            <div className="space-y-2">
                              <h3 className={typography.body}>{ticket.title}</h3>
                              
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
