import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, writeBatch, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../services/firebase';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { X, Loader } from 'lucide-react';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';

interface TicketModalProps {
  ticket?: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function TicketModal({ ticket, isOpen, onClose, onSave }: TicketModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [priority, setPriority] = useState<Ticket['priority']>(ticket?.priority || 'low');
  const [status, setStatus] = useState<Ticket['status']>(ticket?.status || 'BACKLOG_NEW');
  const [assigneeId, setAssigneeId] = useState(ticket?.assigneeId || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch users for the assignee dropdown
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

  useEffect(() => {
    setTitle(ticket?.title || '');
    setDescription(ticket?.description || '');
    setPriority(ticket?.priority || 'low');
    setStatus(ticket?.status || 'BACKLOG_NEW');
    setAssigneeId(ticket?.assigneeId || '');
  }, [ticket]);

  const getUserName = (userId: string) => {
    const userInfo = users[userId];
    return userInfo?.displayName || userInfo?.email || 'Unknown User';
  };

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
    
    return `Q-${String(nextNumber).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const ticket_id = ticket?.ticket_id || await getNextTicketNumber();

      const ticketData: Omit<Ticket, 'id'> = {
        title,
        description,
        status,
        priority,
        assigneeId,
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: Date.now(),
        ticket_id,
      };

      if (ticket?.id) {
        const ticketRef = doc(db, 'tickets', ticket.id);
        await updateDoc(ticketRef, ticketData);
      } else {
        await addDoc(collection(db, 'tickets'), ticketData);
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving ticket:', error);
      setError('Failed to save ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      center
      styles={{
        modal: {
          maxWidth: '90%',  // This will make the modal 90% of the viewport width
          width: '90%',
        }
      }}
      classNames={{
        modal: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl',
        overlay: 'bg-black bg-opacity-50'
      }}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {ticket?.ticket_id || 'New Ticket'}
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mt-1">
              {ticket?.title || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="ticketForm" onSubmit={handleSubmit} className="flex gap-8">
          <div className="flex-[3] space-y-6">
            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${commonStyles.input} w-full`}
                required
              />
            </div>

            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${commonStyles.input} w-full h-[calc(100vh-400px)] min-h-[200px] resize-none`}
                required
              />
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Ticket['status'])}
                className={commonStyles.input}
              >
                {/* Backlog Statuses */}
                <optgroup label="Backlog">
                  <option value="BACKLOG_ICEBOX">Icebox</option>
                  <option value="BACKLOG_NEW">New</option>
                  <option value="BACKLOG_REFINED">Refined</option>
                  <option value="BACKLOG_DEV_NEXT">Dev Next</option>
                </optgroup>
                {/* Development Statuses */}
                <optgroup label="Development">
                  <option value="SELECTED_FOR_DEV">Selected for Dev</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="READY_FOR_TESTING">Ready for Testing</option>
                  <option value="DEPLOYED">Deployed</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Ticket['priority'])}
                className={commonStyles.input}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Assigned To
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={commonStyles.input}
              >
                <option value="">Unassigned</option>
                {Object.entries(users).map(([userId, userInfo]: [string, any]) => (
                  <option key={userId} value={userId}>
                    {userInfo.displayName || userInfo.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className={typography.small}>
                Created by: {ticket?.createdBy ? getUserName(ticket.createdBy) : user?.email}
              </div>
              {ticket?.createdAt && (
                <div className={`mt-1 ${typography.small}`}>
                  Created: {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              )}
              {ticket?.updatedAt && (
                <div className={`mt-1 ${typography.small}`}>
                  Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className={`${commonStyles.button.base} ${commonStyles.button.secondary}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="ticketForm"
            disabled={loading}
            className={`
              ${commonStyles.button.base} 
              ${commonStyles.button.primary}
              disabled:opacity-50
            `}
          >
            {loading ? (
              <span className={layout.flex.center}>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
