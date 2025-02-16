import { collection, doc, getDocs, updateDoc, query, where, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Ticket } from '../types/ticket';
import { useCallback } from 'react';
import { useAccount } from '../context/AccountContext';

interface UseTicketsReturn {
  getTickets: () => Promise<Ticket[]>;
  createTicket: (ticketData: Omit<Ticket, 'id' | 'accountId'>) => Promise<Ticket | null>;
  updateTicket: (ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'accountId'>>) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<boolean>;
  generateMissingTicketIds: () => Promise<number>;
}

export function useTickets(): UseTicketsReturn {
  const { currentAccount, isLoading: isAccountLoading } = useAccount();

  const getNextTicketNumber = async () => {
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      orderBy('ticket_id', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    let nextNumber = 1;
    
    if (!snapshot.empty) {
      const lastTicket = snapshot.docs[0].data();
      if (lastTicket.ticket_id) {
        const match = lastTicket.ticket_id.match(/Q-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
    }
    
    return nextNumber;
  };

  const updateTicket = useCallback(async (
    ticketId: string,
    updates: Partial<Omit<Ticket, 'id' | 'accountId'>>
  ) => {
    if (isAccountLoading) {
      console.log('[useTickets] Account still loading, waiting...');
      return;
    }

    if (!currentAccount?.id) {
      console.error('[useTickets] Cannot update ticket: no account selected');
      return;
    }
    
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('[useTickets] Error updating ticket:', error);
      throw error;
    }
  }, [currentAccount, isAccountLoading]);

  const generateMissingTicketIds = async () => {
    try {
      const ticketsRef = collection(db, 'tickets');
      const querySnapshot = await getDocs(ticketsRef);
      let nextNumber = await getNextTicketNumber();
      const updates = [];

      // Update tickets without IDs
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (!data.ticket_id || !data.ticket_id.match(/Q-\d+/)) {
          const ticket_id = `Q-${String(nextNumber++).padStart(4, '0')}`;
          updates.push(updateDoc(doc.ref, { 
            ticket_id,
            updatedAt: Date.now()
          }));
        }
      }

      await Promise.all(updates);
      console.log(`Updated ${updates.length} tickets with new IDs`);
      return updates.length;
    } catch (error) {
      console.error('Error generating missing ticket IDs:', error);
      throw error;
    }
  };

  const getTickets = useCallback(async () => {
    if (isAccountLoading || !currentAccount?.id) {
      throw new Error('Account not ready');
    }

    try {
      console.log('[useTickets] Fetching tickets for account:', currentAccount.id);
      
      const ticketsRef = collection(db, 'tickets');
      const ticketsQuery = query(
        ticketsRef,
        where('accountId', '==', currentAccount.id),
        orderBy('order', 'asc')
      );
      
      console.log('[useTickets] Executing query with ordering...');
      const querySnapshot = await getDocs(ticketsQuery);
      const tickets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      // Keep in-memory sorting as fallback
      const sortedTickets = tickets.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
      
      console.log('[useTickets] Found and sorted tickets:', sortedTickets.length);
      return sortedTickets;
    } catch (error) {
      console.error('[useTickets] Error fetching tickets:', error);
      return []; // Return empty array instead of throwing to prevent UI disruption
    }
  }, [currentAccount?.id, isAccountLoading]);

  const createTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'accountId'>) => {
    if (isAccountLoading) {
      console.log('[useTickets] Account still loading, waiting...');
      return null;
    }

    if (!currentAccount?.id) {
      console.error('[useTickets] Cannot create ticket: no account selected');
      return null;
    }
    
    try {
      const newTicket = {
        ...ticketData,
        accountId: currentAccount.id,
      };
      
      const docRef = await addDoc(collection(db, 'tickets'), newTicket);
      
      return {
        id: docRef.id,
        ...newTicket
      };
    } catch (error) {
      console.error('[useTickets] Error creating ticket:', error);
      return null;
    }
  }, [currentAccount, isAccountLoading]);

  const deleteTicket = async (ticketId: string) => {
    if (isAccountLoading) {
      throw new Error('Account is still loading');
    }

    if (!currentAccount?.id) {
      throw new Error('No account selected');
    }

    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await deleteDoc(ticketRef);
      return true;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  };

  return {
    getTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    generateMissingTicketIds
  };
}
