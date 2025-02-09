import { collection, doc, getDocs, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Ticket } from '../types/ticket';

export function useTickets() {
  const getTickets = async (status: string = 'BACKLOG') => {
    try {
      const ticketsRef = collection(db, 'tickets');
      const q = query(
        ticketsRef,
        where('status', '==', status),
        orderBy('order', 'desc'), // Primary sort by order
        orderBy('createdAt', 'desc') // Secondary sort by creation date
      );
      
      const querySnapshot = await getDocs(q);
      const tickets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      console.log('Fetched tickets:', tickets); // Debug log
      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, updates);
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  return {
    getTickets,
    updateTicket,
  };
}