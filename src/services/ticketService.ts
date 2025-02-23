import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ticket } from '../types/ticket';
import { getAuth } from 'firebase/auth';
import { database } from '../config/firebase';
import { ref, onValue, push, set, off, get } from 'firebase/database';

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

export const fetchTickets = async (): Promise<Ticket[]> => {
  const ticketsRef = ref(database, 'tickets');
  const snapshot = await get(ticketsRef);
  const tickets: Ticket[] = [];
  
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      tickets.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      });
    });
  }
  
  return tickets;
};

export const subscribeToTickets = (callback: (tickets: Ticket[]) => void) => {
  console.log('Setting up tickets subscription');
  
  // Try both potential paths
  const ticketsRef = ref(database, 'tickets');
  const channelsTicketsRef = ref(database, 'channels/tickets');
  
  // Debug: Check both paths
  get(ticketsRef).then(snapshot => {
    console.log('Checking /tickets path:', snapshot.exists(), snapshot.val());
  });
  
  get(channelsTicketsRef).then(snapshot => {
    console.log('Checking /channels/tickets path:', snapshot.exists(), snapshot.val());
  });
  
  // Subscribe to the original tickets path
  const unsubscribe = onValue(ticketsRef, (snapshot) => {
    const tickets: Ticket[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const ticket = childSnapshot.val();
        tickets.push({
          id: childSnapshot.key!,
          ...ticket
        });
      });
      console.log('Fetched tickets:', tickets);
    } else {
      console.log('No tickets found in database at /tickets');
    }
    callback(tickets);
  });

  return () => {
    console.log('Unsubscribing from tickets');
    off(ticketsRef);
    unsubscribe();
  };
};

export const createTicket = async (ticket: Omit<Ticket, 'id'>): Promise<string> => {
  console.log('Creating ticket:', ticket);
  const ticketsRef = ref(database, 'tickets');
  const newTicketRef = push(ticketsRef);
  await set(newTicketRef, ticket);
  return newTicketRef.key!;
};

export const updateTicket = async (ticketId: string, updates: Partial<Ticket>): Promise<void> => {
  console.log('Updating ticket:', ticketId, updates);
  const ticketRef = ref(database, `channels/tickets/${ticketId}`);
  await set(ticketRef, updates);
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  console.log('Deleting ticket:', ticketId);
  const ticketRef = ref(database, `channels/tickets/${ticketId}`);
  await set(ticketRef, null);
};

export const getTicket = async (ticketId: string): Promise<Ticket | null> => {
  console.log('Fetching ticket:', ticketId);
  const ticketRef = ref(database, `channels/tickets/${ticketId}`);
  const snapshot = await get(ticketRef);
  
  if (snapshot.exists()) {
    return {
      id: snapshot.key!,
      ...snapshot.val()
    };
  }
  
  return null;
};