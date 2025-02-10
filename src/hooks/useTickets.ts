import { collection, doc, getDocs, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Ticket } from '../types/ticket';
import { useState, useCallback } from 'react';

export function useTickets() {
  const [cachedTickets, setCachedTickets] = useState<Ticket[] | null>(null);

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

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      // If ticket_id is empty, generate a new one
      if (!updates.ticket_id) {
        const nextNumber = await getNextTicketNumber();
        updates.ticket_id = `Q-${String(nextNumber).padStart(4, '0')}`;
        console.log('Generated new ticket_id:', updates.ticket_id);
      }

      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        ...updates,
        updatedAt: Date.now()
      });
      
      setCachedTickets(null); // Clear cache after update
      console.log('Ticket updated successfully with ID:', updates.ticket_id);
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

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
      setCachedTickets(null); // Clear cache to force refresh
      console.log(`Updated ${updates.length} tickets with new IDs`);
      return updates.length;
    } catch (error) {
      console.error('Error generating missing ticket IDs:', error);
      throw error;
    }
  };

  const getTickets = useCallback(async (status?: string) => {
    if (cachedTickets) {
      console.log('Using cached tickets');
      return cachedTickets;
    }

    try {
      const ticketsRef = collection(db, 'tickets');
      let q = query(
        ticketsRef,
        orderBy('createdAt', 'desc')
      );

      if (status) {
        q = query(
          ticketsRef,
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const tickets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];

      console.log('Fetched tickets:', tickets);
      setCachedTickets(tickets);
      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  }, [cachedTickets]);

  return {
    getTickets,
    updateTicket,
    generateMissingTicketIds,
  };
}
