import React, { useEffect, useRef } from 'react';
import { Message } from '../../types/message';
import { CustomUser } from '../../types/user';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { Loader } from 'lucide-react';

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentUser: CustomUser | null;
  users: { [key: string]: CustomUser };
  className?: string;
}

export default function MessageList({ 
  messages, 
  isLoading, 
  currentUser,
  users,
  className = ''
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className={`
      flex-1 overflow-y-auto
      ${className}
    `}>
      <div className="space-y-6">
        {messages.map((message) => {
          const isCurrentUser = message.userId === currentUser?.uid;
          const sender = users[message.userId];
          const senderName = sender?.displayName || sender?.email || 'Unknown User';

          return (
            <div 
              key={message.id}
              className={`
                flex items-end gap-2
                ${isCurrentUser ? 'justify-end' : 'justify-start'}
              `}
            >
              {/* Message Content */}
              <div className={`
                ${commonStyles.card}
                ${isCurrentUser 
                  ? 'bg-blue-500 text-white dark:bg-blue-600'
                  : 'bg-white dark:bg-gray-700'
                }
                max-w-[70%] p-4 shadow-sm
                ${animations.transition.normal}
              `}>
                {/* Sender Name */}
                {!isCurrentUser && (
                  <div className={`
                    ${typography.small}
                    font-medium mb-1
                    ${isCurrentUser 
                      ? 'text-blue-100' 
                      : 'text-gray-600 dark:text-gray-300'
                    }
                  `}>
                    {senderName}
                  </div>
                )}

                {/* Message Text */}
                <div className={`
                  ${typography.body}
                  whitespace-pre-wrap break-words
                `}>
                  {message.content}
                </div>

                {/* Timestamp */}
                <div className={`
                  ${typography.small}
                  mt-2
                  ${isCurrentUser 
                    ? 'text-blue-100' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}