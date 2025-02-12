import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, writeBatch, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket, TicketStatus, TicketPriority } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../services/firebase';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { X, Loader, Copy, Check } from 'lucide-react';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';
import ReactMarkdown from 'react-markdown';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import { useAccount } from '../../context/AccountContext';
import { useTickets } from '../../hooks/useTickets';
import { COLUMN_STATUS_LABELS } from '../../types/board/columns';

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

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  'BACKLOG_ICEBOX': 'Icebox',
  'BACKLOG_NEW': 'New',
  'BACKLOG_REFINED': 'Refined',
  'BACKLOG_DEV_NEXT': 'Next for Development',
  'SELECTED_FOR_DEV': 'Selected for Development',
  'IN_PROGRESS': 'In Progress',
  'READY_FOR_TESTING': 'Ready for Testing',
  'DEPLOYED': 'Deployed'
};

export default function TicketModal({ ticket, isOpen, onClose, onSave }: TicketModalProps) {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const { createTicket, updateTicket } = useTickets();
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [status, setStatus] = useState<TicketStatus>(ticket?.status || DEFAULT_STATUS);
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority || DEFAULT_PRIORITY);
  const [assigneeId, setAssigneeId] = useState(ticket?.assigneeId || '');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        setUsers(snapshot.val());
      }
    };
    fetchUsers();
  }, []);

  // Update form when ticket changes
  useEffect(() => {
    setTitle(ticket?.title || '');
    setDescription(ticket?.description || '');
    setStatus(ticket?.status || DEFAULT_STATUS);
    setPriority(ticket?.priority || DEFAULT_PRIORITY);
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
          updatedAt: Date.now(),
        });
      } else {
        // Create new ticket
        const ticketId = `TICKET-${Date.now()}`;
        const newTicket = await createTicket({
          title,
          description,
          status,
          priority,
          assigneeId,
          updatedAt: Date.now(),
          createdBy: user.uid,
          createdAt: Date.now(),
          order: Date.now(),
          ticket_id: ticketId, // Add the required ticket_id field
        });
        
        if (!newTicket) {
          throw new Error('Failed to create ticket');
        }
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error('[TicketModal] Error saving ticket:', error);
      setError('Failed to save ticket. Please try again.');
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

  // Don't render anything if not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <Modal
      open={isOpen && isAuthorized}
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                {Object.entries(COLUMN_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
