import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Ticket } from '../types/ticket';
import { getAuth } from 'firebase/auth';

export const ticketService = {
  async createTicket(ticket: Omit<Ticket, 'id'>) {
    try {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      console.log('Creating ticket with data:', ticket);
      
      // Verify user is authenticated
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('User is not authenticated');
      }

      const ticketsRef = collection(db, 'tickets');
      const docRef = await addDoc(ticketsRef, {
        ...ticket,
        createdBy: auth.currentUser.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      console.log('Ticket created successfully with ID:', docRef.id);
      return docRef;
    } catch (error) {
      console.error('Error creating ticket:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create ticket: ${error.message}`);
      }
      throw error;
    }
  },

  async updateTicket(id: string, ticket: Partial<Ticket>) {
    const ticketRef = doc(db, 'tickets', id);
    await updateDoc(ticketRef, {
      ...ticket,
      updatedAt: Date.now()
    });
  },

  async deleteTicket(id: string) {
    const ticketRef = doc(db, 'tickets', id);
    await deleteDoc(ticketRef);
  },

  async getTicket(id: string) {
    const ticketRef = doc(db, 'tickets', id);
    const ticketSnap = await getDoc(ticketRef);
    if (ticketSnap.exists()) {
      return { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
    }
    return null;
  }
};