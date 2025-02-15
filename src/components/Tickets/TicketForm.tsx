import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ticket } from '../../types/ticket';
import { useAccount } from '../../context/AccountContext';

export default function TicketForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentAccount) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Get the current highest ticket_id
      const ticketsRef = collection(db, 'tickets');
      const ticketsQuery = query(
        ticketsRef,
        orderBy('ticket_id', 'desc'),
        limit(1)
      );
      
      const ticketsSnapshot = await getDocs(ticketsQuery);
      let nextNumber = 1;
      
      if (!ticketsSnapshot.empty) {
        const lastTicket = ticketsSnapshot.docs[0].data();
        const lastNumber = parseInt(lastTicket.ticket_id.split('-')[1]);
        nextNumber = lastNumber + 1;
      }

      const ticket_id = `Q-${String(nextNumber).padStart(4, '0')}`;

      const ticketData: Omit<Ticket, 'id'> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        status: 'BACKLOG_NEW',
        priority: 'medium',
        type: 'task',
        createdBy: user?.uid || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: nextNumber,
        ticket_id,
        accountId: currentAccount.id
      };

      await addDoc(collection(db, 'tickets'), ticketData);
      navigate('/tickets');
    } catch (error) {
      setError('Failed to create ticket. Please try again.');
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create New Ticket</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter ticket title"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter ticket description"
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
