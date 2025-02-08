import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { Ticket } from '../../types/ticket';
import { db } from '../../services/firebase';

export default function TicketEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTicket = async () => {
      if (id) {
        const ticketData = await ticketService.getTicket(id);
        setTicket(ticketData);
      }
      setLoading(false);
    };
    loadTicket();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticket && id) {
      await ticketService.updateTicket(id, ticket);
      navigate('/tickets');
    }
  };

  if (loading) {
    return <div className="flex-1 p-4">Loading...</div>;
  }

  if (!ticket) {
    return <div className="flex-1 p-4">Ticket not found</div>;
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-800">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Edit Ticket</h1>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={ticket.title}
              onChange={(e) => setTicket({ ...ticket, title: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
            </label>
            <textarea
              id="description"
              value={ticket.description}
              onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Status
              </label>
              <select
                id="status"
                value={ticket.status}
                onChange={(e) => setTicket({ ...ticket, status: e.target.value as Ticket['status'] })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="SELECTED_FOR_DEV">Selected for Dev</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_TESTING">Ready for Testing</option>
                <option value="DEPLOYED">Deployed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Priority
              </label>
              <select
                id="priority"
                value={ticket.priority}
                onChange={(e) => setTicket({ ...ticket, priority: e.target.value as Ticket['priority'] })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}