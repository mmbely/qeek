import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../services/firebase';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { X, Loader } from 'lucide-react';

interface TicketModalProps {
  ticket?: Ticket;
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketModal({ ticket, isOpen, onClose }: TicketModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [priority, setPriority] = useState<Ticket['priority']>(ticket?.priority || 'low');
  const [status, setStatus] = useState<Ticket['status']>(ticket?.status || 'BACKLOG');
  const [assigneeId, setAssigneeId] = useState(ticket?.assigneeId || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{[key: string]: any}>({});

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
    setStatus(ticket?.status || 'BACKLOG');
    setAssigneeId(ticket?.assigneeId || '');
  }, [ticket]);

  const getUserName = (userId: string) => {
    const userInfo = users[userId];
    return userInfo?.displayName || userInfo?.email || 'Unknown User';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const ticketData = {
        title,
        description,
        priority,
        status,
        assigneeId,
        updatedAt: Date.now(),
      };

      if (ticket?.id) {
        const ticketRef = doc(db, 'tickets', ticket.id);
        await updateDoc(ticketRef, ticketData);
      } else {
        // For new tickets, get the current highest order in the status column
        const ticketsRef = collection(db, 'tickets');
        const statusQuery = query(
          ticketsRef, 
          where('status', '==', status)
        );
        const statusSnapshot = await getDocs(statusQuery);
        const maxOrder = statusSnapshot.docs.reduce((max, doc) => 
          Math.max(max, doc.data().order || 0), -1);

        const ticketsCollection = collection(db, 'tickets');
        await addDoc(ticketsCollection, {
          ...ticketData,
          createdBy: user.uid,
          createdAt: Date.now(),
          order: maxOrder + 1, // Set order to one more than the current highest
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`
      fixed inset-0 bg-black/50 
      ${layout.flex.center}
      ${animations.fade.enter}
      z-50 p-4
    `}>
      <div className={`
        w-full max-w-7xl h-[90vh] flex flex-col
        ${commonStyles.modal}
        ${animations.transition.normal}
      `}>
        {/* Header */}
        <div className={`
          ${layout.flex.between} p-6
          border-b border-gray-200 dark:border-gray-700
        `}>
          <h2 className={typography.h2}>
            {ticket ? 'Edit Ticket' : 'Create Ticket'}
          </h2>
          <button
            onClick={onClose}
            className={`
              ${commonStyles.button.base}
              ${commonStyles.button.secondary}
              !p-2 rounded-full
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form id="ticketForm" onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <label className={`block mb-2 ${typography.small}`}>
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={commonStyles.input}
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
                  className={`${commonStyles.input} h-[calc(90vh-280px)] resize-none`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className={`
            w-80 border-l border-gray-200 dark:border-gray-700 
            bg-gray-50 dark:bg-[${theme.colors.dark.secondary}]
            p-6 space-y-6
          `}>
            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Ticket['status'])}
                className={commonStyles.input}
              >
                <option value="BACKLOG">Backlog</option>
                <option value="SELECTED_FOR_DEV">Selected for Dev</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_FOR_TESTING">Ready for Testing</option>
                <option value="DEPLOYED">Deployed</option>
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

            {/* Metadata */}
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

        {/* Footer */}
        <div className={`
          border-t border-gray-200 dark:border-gray-700 
          p-6 ${layout.flex.end} gap-3
        `}>
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
    </div>
  );
}