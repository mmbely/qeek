import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../../types/message';
import { CustomUser } from '../../types/user';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { Loader, User, Trash2, SmilePlus, X, Pencil, Check } from 'lucide-react';
import { format } from 'date-fns';
import { getTimestampMillis, timestampToDate, formatMessageDate } from '../../utils/dateUtils';
import { deleteMessage } from '../../services/chat';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserAvatar } from '../../components/ui/UserAvatar';

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;   
  currentUser: CustomUser | null;
  users: { [key: string]: CustomUser };
  className?: string;
}

const DateSeparator = ({ date }: { date: Date }) => {
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <div className={`
      ${layout.flex.center}
      relative py-4
    `}>
      <div className="absolute left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
      <span className={`
        ${typography.small}
        px-4 bg-gray-50 dark:bg-gray-800
        text-gray-500 dark:text-gray-400
        relative z-10
      `}>
        {formatDate(date)}
      </span>
    </div>
  );
};

const EmojiPicker = ({ onSelect, onClose }: { 
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) => {
  const commonEmojis = ['👍', '❤️', '😊', '🎉', '🤔', '👀', '🚀', '✅'];
  
  return (
    <div className="absolute bottom-full mb-2 bg-white dark:bg-gray-800 
                    rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
      <div className="flex gap-1 items-center">
        {commonEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
          >
            {emoji}
          </button>
        ))}
        <button 
          onClick={onClose}
          className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function MessageList({ 
  messages, 
  isLoading, 
  currentUser,
  users,
  className = ''
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!messageId || !currentUser?.uid) return;
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      const hasReacted = message?.reactions?.[emoji]?.users.includes(currentUser.uid);
      
      if (hasReacted) {
        // Remove reaction
        await updateDoc(messageRef, {
          [`reactions.${emoji}.users`]: arrayRemove(currentUser.uid)
        });
      } else {
        // Add reaction
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: {
            emoji,
            users: arrayUnion(currentUser.uid)
          }
        });
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!messageId || !currentUser?.uid || !newContent.trim()) return;
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        content: newContent.trim(),
        edited: true,
        editedAt: Date.now()
      });
      setEditingMessageId(null);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  console.log('[MessageList] Rendering with:', {
    messageCount: messages.length,
    userCount: Object.keys(users).length,
    users: users, // Log full users object
    currentUser: currentUser?.uid
  });

  if (isLoading) {
    return (
      <div className={`
        ${layout.flex.center}
        h-full flex-col gap-3
      `}>
        <Loader className="w-6 h-6 text-blue-500 animate-spin" />
        <p className={typography.body}>Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`
        ${layout.flex.center}
        h-full flex-col gap-2
        text-gray-500 dark:text-gray-400
      `}>
        <p className={typography.body}>No messages yet.</p>
        <p className={typography.small}>Start the conversation!</p>
      </div>
    );
  }

  // Update the grouping logic to maintain correct order
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[][] }, message) => {
    const date = timestampToDate(message.timestamp).toDateString();
    
    if (!groups[date]) {
      groups[date] = [];
    }

    const dateGroups = groups[date];
    const lastGroup = dateGroups[dateGroups.length - 1];
    const lastMessage = lastGroup?.[lastGroup.length - 1];
    
    const shouldStartNewGroup = !lastMessage || 
      lastMessage.userId !== message.userId ||
      getTimestampMillis(message.timestamp) - getTimestampMillis(lastMessage.timestamp) > 5 * 60 * 1000;

    if (shouldStartNewGroup) {
      dateGroups.push([message]);
    } else {
      lastGroup.push(message);
    }
    
    return groups;
  }, {});

  // Sort the dates in chronological order (oldest to newest)
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2">
        {Object.entries(groupedMessages)
          .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
          .map(([dateStr, dateGroups]) => (
            <div key={dateStr}>
              <DateSeparator date={new Date(dateStr)} />
              
              <div className="space-y-6 px-4">
                {dateGroups.map((group, groupIndex) => {
                  const sortedGroup = [...group].sort(
                    (a, b) => getTimestampMillis(a.timestamp) - getTimestampMillis(b.timestamp)
                  );
                  
                  const firstMessage = sortedGroup[0];
                  const messageUser = users[firstMessage.userId];
                  console.log('[MessageList] Message user data:', {
                    messageUserId: firstMessage.userId,
                    foundUser: messageUser,
                    displayName: messageUser?.displayName
                  });
                  const senderName = messageUser?.displayName || messageUser?.email || 'Unknown User';

                  return (
                    <div key={groupIndex} className="flex items-start gap-3 group">
                      {/* User Avatar */}
                      <div className="flex-shrink-0 mt-1">
                        {messageUser ? (
                          <UserAvatar 
                            userData={messageUser} 
                            size="medium"
                          />
                        ) : (
                          <div className={`
                            ${layout.flex.center}
                            w-10 h-10 rounded-md
                            bg-gray-100 dark:bg-gray-700
                          `}>
                            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Messages Content */}
                      <div className="flex-1 min-w-0">
                        {/* Sender Info */}
                        <div className={`${layout.flex.start} items-center gap-2`}>
                          <span className={`
                            ${typography.body}
                            font-medium
                            text-gray-900 dark:text-gray-100
                          `}>
                            {senderName}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {timestampToDate(firstMessage.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="space-y-1 mt-1">
                          {sortedGroup.map((message) => {
                            return (
                              <div 
                                key={message.id}
                                className={`
                                  ${typography.body}
                                  group relative
                                  text-gray-900 dark:text-gray-100
                                  hover:bg-gray-50 dark:hover:bg-gray-750
                                  -mx-2 px-2 py-1 rounded
                                  ${animations.transition.normal}
                                `}
                              >
                                {/* Message content with actions */}
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 break-words">
                                    {editingMessageId === message.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={editContent}
                                          onChange={(e) => setEditContent(e.target.value)}
                                          className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 
                                                    rounded border border-gray-200 dark:border-gray-600
                                                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleEdit(message.id!, editContent);
                                            } else if (e.key === 'Escape') {
                                              setEditingMessageId(null);
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleEdit(message.id!, editContent)}
                                          className="p-1 text-green-500 hover:bg-green-50 
                                                   dark:hover:bg-green-900/20 rounded-full"
                                          title="Save edit"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setEditingMessageId(null)}
                                          className="p-1 text-gray-500 hover:bg-gray-50 
                                                   dark:hover:bg-gray-700 rounded-full"
                                          title="Cancel edit"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        {message.content}
                                        {message.edited && (
                                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                            (edited)
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Message Actions - Moved to right side */}
                                  <div className={`
                                    invisible group-hover:visible
                                    flex items-center gap-1
                                    text-gray-400 flex-shrink-0
                                  `}>
                                    <div className="relative">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowEmojiPicker(message.id!);
                                        }}
                                        className="p-1 hover:text-blue-500 rounded-full 
                                                   hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                        title="Add reaction"
                                      >
                                        <SmilePlus className="w-4 h-4" />
                                      </button>
                                      
                                      {showEmojiPicker === message.id && (
                                        <EmojiPicker
                                          onSelect={(emoji) => {
                                            handleReaction(message.id!, emoji);
                                            setShowEmojiPicker(null);
                                          }}
                                          onClose={() => setShowEmojiPicker(null)}
                                        />
                                      )}
                                    </div>
                                    
                                    {message.userId === currentUser?.uid && (
                                      <>
                                        <button 
                                          onClick={() => {
                                            setEditingMessageId(message.id!);
                                            setEditContent(message.content);
                                          }}
                                          className="p-1 hover:text-blue-500 rounded-full 
                                                   hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                          title="Edit message"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!message.id) return;
                                            
                                            if (window.confirm('Are you sure you want to delete this message?')) {
                                              try {
                                                await deleteMessage(message.id);
                                              } catch (error) {
                                                console.error('Failed to delete message:', error);
                                              }
                                            }
                                          }}
                                          className="p-1 hover:text-red-500 rounded-full 
                                                   hover:bg-red-50 dark:hover:bg-red-900/20"
                                          title="Delete message"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Reactions display - Moved below message */}
                                {message.reactions && Object.entries(message.reactions).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(message.reactions).map(([emoji, reaction]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReaction(message.id!, emoji)}
                                        className={`
                                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
                                          ${reaction.users.includes(currentUser?.uid || '')
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                          }
                                          hover:bg-blue-100 dark:hover:bg-blue-900/30
                                          ${animations.transition.normal}
                                        `}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-xs">{reaction.users.length}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}