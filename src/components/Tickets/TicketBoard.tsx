import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { ticketService } from '../../services/ticketService';

type BoardStatus = Exclude<Ticket['status'], 'BACKLOG'>;

type TicketColumn = {
  title: string;
  tickets: Ticket[];
};

type ColumnType = {
  [K in BoardStatus]: TicketColumn;
};

export default function TicketBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [columns, setColumns] = useState<ColumnType>({
    SELECTED_FOR_DEV: { title: 'Selected for Dev', tickets: [] },
    IN_PROGRESS: { title: 'In Progress', tickets: [] },
    READY_FOR_TESTING: { title: 'Ready for Testing', tickets: [] },
    DEPLOYED: { title: 'Deployed', tickets: [] },
  });

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      setTickets(ticketsData);
      
      // Reset columns before populating
      const newColumns: ColumnType = {
        SELECTED_FOR_DEV: { title: 'Selected for Dev', tickets: [] },
        IN_PROGRESS: { title: 'In Progress', tickets: [] },
        READY_FOR_TESTING: { title: 'Ready for Testing', tickets: [] },
        DEPLOYED: { title: 'Deployed', tickets: [] },
      };
      
      ticketsData
        .filter(ticket => ticket.status !== 'BACKLOG')
        .forEach(ticket => {
          const status = ticket.status as BoardStatus;
          if (status in newColumns) {
            newColumns[status].tickets.push(ticket);
          }
        });
      
      setColumns(newColumns);
    });
    return () => unsubscribe();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // If there's no destination or the item was dropped in its original location
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }

    try {
      // Update in Firestore
      const ticketRef = doc(db, 'tickets', draggableId);
      await updateDoc(ticketRef, {
        status: destination.droppableId as Ticket['status'],
        updatedAt: Date.now()
      });

      console.log('Ticket updated successfully');
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-gray-800">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tickets Board</h1>
          <Link
            to="/tickets/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Link>
        </div>
      </div>

      <div className="p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.entries(columns).map(([status, column]) => (
              <div key={status} className="flex-1 min-w-[300px]">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    {column.title} ({column.tickets.length})
                  </h3>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[200px] ${
                          snapshot.isDraggingOver ? 'bg-gray-200 dark:bg-gray-600' : ''
                        }`}
                      >
                        {column.tickets.map((ticket, index) => (
                          <Draggable
                            key={ticket.id}
                            draggableId={ticket.id || ''}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-gray-800 p-4 rounded shadow-sm 
                                  ${snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'} 
                                  transition-shadow`}
                              >
                                <Link to={`/tickets/${ticket.id}`}>
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {ticket.title}
                                  </h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {ticket.description}
                                  </p>
                                  <div className="mt-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full
                                      ${ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                                      ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                                      'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'}`}
                                    >
                                      {ticket.priority}
                                    </span>
                                  </div>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}