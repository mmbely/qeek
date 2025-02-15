import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, writeBatch, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket, TicketStatus, TicketPriority, TicketType } from '../../types/ticket';
import { CustomUser } from '../../types/user';
import { useAuth } from '../../context/AuthContext';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { X, Loader, Copy, Check, Trash2 } from 'lucide-react';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';
import ReactMarkdown from 'react-markdown';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import { useAccount } from '../../context/AccountContext';
import { useTickets } from '../../hooks/useTickets';
import { 
  COLUMN_STATUS_LABELS,
  BacklogStatus,
  BoardStatus
} from '../../types/board';

// Define the CodeProps interface directly
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface TicketModalProps {
  ticket?: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const DEFAULT_STATUS: TicketStatus = 'BACKLOG_NEW';
const DEFAULT_PRIORITY: TicketPriority = 'medium';

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = COLUMN_STATUS_LABELS;

// Define the backlog and development status options
const BACKLOG_OPTIONS: BacklogStatus[] = [
  'BACKLOG_ICEBOX',
  'BACKLOG_NEW',
  'BACKLOG_REFINED',
  'BACKLOG_DEV_NEXT'
];

const DEVELOPMENT_OPTIONS: BoardStatus[] = [
  'SELECTED_FOR_DEV',
  'IN_PROGRESS',
  'READY_FOR_TESTING',
  'DEPLOYED'
];

export default function TicketModal({ ticket, isOpen, onClose, onSave }: TicketModalProps) {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const { createTicket, updateTicket, deleteTicket } = useTickets();
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [status, setStatus] = useState<TicketStatus>(ticket?.status || DEFAULT_STATUS);
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority || DEFAULT_PRIORITY);
  const [assigneeId, setAssigneeId] = useState(ticket?.assigneeId || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{[key: string]: CustomUser}>({});
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>(ticket?.type || 'task');

  // Check authorization
  const isAuthorized = React.useMemo(() => {
    if (!user || !currentAccount) return false;
    
    // For new tickets, check if user is in current account
    if (!ticket) {
      return currentAccount.members[user.uid] != null;
    }
    
    // For existing tickets, check if ticket belongs to current account
    return ticket.accountId === currentAccount.id && currentAccount.members[user.uid] != null;
  }, [user, currentAccount, ticket]);

  // Redirect or close if not authorized
  useEffect(() => {
    if (isOpen && !isAuthorized) {
      console.log('[TicketModal] Unauthorized access, closing modal');
      onClose();
    }
  }, [isOpen, isAuthorized, onClose]);

  // Fetch users for the assignee dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentAccount) return;
      
      try {
        const userPromises = Object.keys(currentAccount.members).map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              return { userId, userData: userDoc.data() as CustomUser };
            }
          } catch (error) {
            console.error(`Failed to load user ${userId}:`, error);
          }
          return null;
        });

        const usersData = await Promise.all(userPromises);
        const newUsers: Record<string, CustomUser> = {};
        
        usersData.forEach(user => {
          if (user) {
            newUsers[user.userId] = user.userData;
          }
        });

        setUsers(newUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    fetchUsers();
  }, [currentAccount]);

  // Update form when ticket changes
  useEffect(() => {
    setTitle(ticket?.title || '');
    setDescription(ticket?.description || '');
    setStatus(ticket?.status || DEFAULT_STATUS);
    setPriority(ticket?.priority || DEFAULT_PRIORITY);
    setAssigneeId(ticket?.assigneeId || '');
    setTicketType(ticket?.type || 'task');
  }, [ticket]);

  const getUserName = (userId: string) => {
    const userInfo = users[userId];
    return userInfo?.displayName || userInfo?.email || 'Unknown User';
  };

  const getNextTicketNumber = async () => {
    if (!currentAccount?.id) {
      console.error('[TicketModal] No current account when generating ticket number');
      return 'Q-001'; // Fallback
    }
    
    const prefix = 'Q';
    
    try {
      // Get all tickets for this account to ensure we don't miss any
      const ticketsRef = collection(db, 'tickets');
      const q = query(
        ticketsRef,
        where('accountId', '==', currentAccount.id),
        where('ticket_id', '>=', 'Q-'), // Ensure we only get Q- prefixed tickets
        orderBy('ticket_id', 'desc')  // Remove limit to get all tickets
      );
      
      console.log('[TicketModal] Querying for last ticket number');
      const snapshot = await getDocs(q);
      let maxNumber = 0;
      
      // Iterate through all tickets to find the highest number
      snapshot.forEach((doc) => {
        const ticketData = doc.data();
        if (ticketData.ticket_id) {
          const match = ticketData.ticket_id.match(/Q-(\d{3})/);
          if (match) {
            const number = parseInt(match[1], 10);
            maxNumber = Math.max(maxNumber, number);
          }
        }
      });

      console.log('[TicketModal] Highest ticket number found:', maxNumber);
      const nextNumber = maxNumber + 1;
      const newTicketId = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
      
      console.log('[TicketModal] Generated new ticket ID:', newTicketId);
      return newTicketId;
      
    } catch (error) {
      console.error('[TicketModal] Error generating ticket number:', error);
      return 'Q-001'; // Fallback in case of error
    }
  };

  // Handle submit with authorization check
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !currentAccount || !isAuthorized) {
      console.error('[TicketModal] Unauthorized attempt to save ticket');
      setError('You do not have permission to perform this action');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (ticket?.id) {
        // Update existing ticket
        await updateTicket(ticket.id, {
          title,
          description,
          status,
          priority,
          assigneeId,
          type: ticketType,
          updatedAt: Date.now(),
        });
      } else {
        // Create new ticket
        const nextTicketId = await getNextTicketNumber();
        
        // Double check that this ticket ID doesn't already exist
        const ticketsRef = collection(db, 'tickets');
        const existingTicketQuery = query(
          ticketsRef,
          where('accountId', '==', currentAccount.id),
          where('ticket_id', '==', nextTicketId)
        );
        
        const existingTicket = await getDocs(existingTicketQuery);
        if (!existingTicket.empty) {
          throw new Error('Duplicate ticket ID generated. Please try again.');
        }

        const newTicket = await createTicket({
          title,
          description,
          status,
          priority,
          assigneeId,
          type: ticketType,
          updatedAt: Date.now(),
          createdBy: user.uid,
          createdAt: Date.now(),
          order: Date.now(),
          ticket_id: nextTicketId,
        });
        
        if (!newTicket) {
          throw new Error('Failed to create ticket');
        }
      }

      await onSave?.();
      onClose();
    } catch (error) {
      console.error('[TicketModal] Error saving ticket:', error);
      setError(error instanceof Error ? error.message : 'Failed to save ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Adjust height whenever entering edit mode or content changes
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto first
      textarea.style.height = 'auto';
      // Then set to scrollHeight to match content
      textarea.style.height = `${Math.max(300, textarea.scrollHeight)}px`;
      console.log('Adjusting height to:', textarea.scrollHeight); // Debug log
    }
  };

  // Call adjust height when entering edit mode
  const handlePreviewClick = () => {
    setIsEditing(true);
    // Focus and adjust height after the textarea is rendered
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        adjustTextareaHeight();
      }
    }, 0);
  };

  // Call adjust height when content changes
  useEffect(() => {
    if (isEditing) {
      adjustTextareaHeight();
    }
  }, [description, isEditing]);

  // Handle content changes
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    adjustTextareaHeight();
  };

  const handleEditBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const cursorPosition = target.selectionStart;
    const currentLine = target.value.slice(0, cursorPosition).split('\n').pop() || '';
    
    // Only add closing backticks if the current line is exactly ```
    if (currentLine === '```' && e.key === 'Enter') {
      e.preventDefault();
      const textBeforeCursor = target.value.slice(0, cursorPosition);
      const textAfterCursor = target.value.slice(cursorPosition);
      
      const newValue = textBeforeCursor + '\n\n```' + textAfterCursor;
      setDescription(newValue);
      
      // Move cursor between the backticks
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = cursorPosition + 1; // Position after the first newline
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  // Add this helper function
  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
      // Prevent the click from bubbling up to the preview div and modal
      e.stopPropagation();
      e.preventDefault();
      
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <button
        onClick={handleCopy}
        onMouseDown={(e) => e.preventDefault()} // Prevent modal close on mousedown
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    );
  };

  // Add this component for rendering the description preview
  const DescriptionPreview = ({ text }: { text: string }) => {
    // Function to convert URLs in text to markdown links
    const addMarkdownLinks = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return text.replace(urlRegex, (url) => `[${url}](${url})`);
    };

    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: CodeProps) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            
            return !inline ? (
              <div className="relative group" onClick={(e) => e.stopPropagation()}>
                <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {language && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                      {language}
                    </span>
                  )}
                  <CopyButton text={String(children).replace(/\n$/, '')} />
                </div>
                <SyntaxHighlighter
                  style={tomorrow as any}
                  language={language}
                  PreTag="div"
                  customStyle={{}}
                  className="rounded-md !mt-0"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="px-1 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-700 text-sm" {...props}>
                {children}
              </code>
            );
          },
          a({ node, children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent edit mode activation
                }}
                {...props}
              >
                {children}
              </a>
            );
          }
        }}
      >
        {addMarkdownLinks(text)}
      </ReactMarkdown>
    );
  };

  const placeholderText = 
`Description supports markdown and code blocks:

# Heading 1
## Heading 2

- Bullet points
- Another point

Start a code block with \`\`\` and press Enter:

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`

Text after the code block.

**Bold text** and *italic text*

You can also use \`inline code\` with single backticks.`;

  // Add delete handler
  const handleDelete = async () => {
    if (!ticket?.id) return;
    
    setLoading(true);
    setError(null);

    try {
      await deleteTicket(ticket.id);
      await onSave?.();
      onClose();
    } catch (error) {
      console.error('[TicketModal] Error deleting ticket:', error);
      setError('Failed to delete ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add delete confirmation modal
  const DeleteConfirmation = () => (
    <Modal
      open={isDeleteConfirmOpen}
      onClose={() => setIsDeleteConfirmOpen(false)}
      center
      classNames={{
        modal: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6',
        overlay: 'bg-black bg-opacity-50'
      }}
    >
      <div className="space-y-4">
        <h3 className={typography.h3}>Delete Ticket</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete ticket {ticket?.ticket_id}? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => setIsDeleteConfirmOpen(false)}
            className={`${commonStyles.button.base} ${commonStyles.button.secondary}`}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className={`
              ${commonStyles.button.base} 
              ${commonStyles.button.danger}
              disabled:opacity-50
            `}
          >
            {loading ? (
              <span className={layout.flex.center}>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Deleting...
              </span>
            ) : (
              'Delete Ticket'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );

  // Don't render anything if not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <Modal
      open={isOpen && isAuthorized}
      onClose={onClose}
      center
      closeIcon={<></>}
      styles={{
        modal: {
          maxWidth: '90%',
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
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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
              <div className="relative border rounded-md dark:border-gray-700">
                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    value={description}
                    onChange={handleDescriptionChange}
                    onBlur={handleEditBlur}
                    onKeyDown={handleKeyDown}
                    className={`
                      ${commonStyles.input} 
                      w-full
                      min-h-[300px]
                      font-mono text-sm 
                      resize-none
                      border-none
                      focus:ring-0
                      overflow-hidden
                    `}
                    placeholder={placeholderText}
                    required
                  />
                ) : (
                  <div 
                    onClick={handlePreviewClick}
                    className={`
                      p-4 min-h-[300px] cursor-text
                      ${description ? '' : 'text-gray-400 dark:text-gray-500'}
                    `}
                  >
                    {description ? (
                      <div className="prose dark:prose-invert max-w-none">
                        <DescriptionPreview text={description} />
                      </div>
                    ) : (
                      <p>Click to add description...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Type
              </label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as TicketType)}
                className={commonStyles.input}
              >
                <option value="bug">Bug</option>
                <option value="task">Task</option>
                <option value="story">Story</option>
              </select>
            </div>

            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className={commonStyles.input}
              >
                <optgroup label="Backlog">
                  {BACKLOG_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {COLUMN_STATUS_LABELS[value]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Development">
                  {DEVELOPMENT_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {COLUMN_STATUS_LABELS[value]}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className={`block mb-2 ${typography.small}`}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
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
                {Object.entries(users).map(([userId, userInfo]) => (
                  <option key={userId} value={userId}>
                    {userInfo.displayName || userInfo.email || 'Unknown User'}
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

        <div className="flex justify-between gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          {/* Add delete button (only show for existing tickets) */}
          {ticket?.id && (
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className={`
                ${commonStyles.button.base} 
                ${commonStyles.button.danger}
              `}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Ticket
            </button>
          )}
          
          <div className="flex gap-3">
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
      
      {/* Render delete confirmation modal */}
      <DeleteConfirmation />
    </Modal>
  );
}

