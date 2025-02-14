import React, { useEffect, useRef } from 'react';
import { Message } from '../../types/message';
import { CustomUser } from '../../types/user';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { Loader, User } from 'lucide-react';

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;   
  currentUser: CustomUser | null;
  users: { [key: string]: CustomUser };
  className?: string;
}

const UserAvatar = ({ user }: { user: CustomUser }) => {
  if (user.photoURL) {
    return (
      <div className="w-10 h-10 rounded-md overflow-hidden">
        <img
          src={user.photoURL}
          alt={user.displayName || user.email || 'User avatar'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback avatar with first letter of email or name
  const initial = (user.displayName || user.email || '?')[0].toUpperCase();
  
  return (
    <div className={`
      ${layout.flex.center}
      w-10 h-10 rounded-md
      bg-blue-100 dark:bg-blue-900
      text-blue-700 dark:text-blue-300
      font-medium text-lg
    `}>
      {initial}
    </div>
  );
};

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

  // Group messages by date and then by user
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[][] }, message) => {
    const date = new Date(message.timestamp).toDateString();
    
    if (!groups[date]) {
      groups[date] = [];
    }

    const dateGroups = groups[date];
    const lastGroup = dateGroups[dateGroups.length - 1];
    const lastMessage = lastGroup?.[lastGroup.length - 1];
    
    const shouldStartNewGroup = !lastMessage || 
      lastMessage.userId !== message.userId ||
      message.timestamp - lastMessage.timestamp > 5 * 60 * 1000; // 5 minutes gap

    if (shouldStartNewGroup) {
      dateGroups.push([message]);
    } else {
      lastGroup.push(message);
    }
    
    return groups;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2">
        {Object.entries(groupedMessages).map(([dateStr, dateGroups]) => (
          <div key={dateStr}>
            <DateSeparator date={new Date(dateStr)} />
            
            <div className="space-y-6 px-4">
              {dateGroups.map((group, groupIndex) => {
                const firstMessage = group[0];
                const sender = users[firstMessage.userId];
                const senderName = sender?.displayName || sender?.email || 'Unknown User';

                return (
                  <div key={groupIndex} className="flex items-start gap-3 group">
                    {/* User Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      {sender ? (
                        <UserAvatar user={sender} />
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
                      <div className={`${layout.flex.start} gap-2`}>
                        <span className={`
                          ${typography.body}
                          font-medium
                          text-gray-900 dark:text-gray-100
                        `}>
                          {senderName}
                        </span>
                        <span className={`
                          ${typography.small}
                          text-gray-500 dark:text-gray-400
                        `}>
                          {new Date(firstMessage.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Messages */}
                      <div className="space-y-1 mt-1">
                        {group.map((message) => (
                          <div 
                            key={message.id}
                            className={`
                              ${typography.body}
                              text-gray-900 dark:text-gray-100
                              hover:bg-gray-50 dark:hover:bg-gray-750
                              -mx-2 px-2 py-1 rounded
                              ${animations.transition.normal}
                            `}
                          >
                            {message.content}
                          </div>
                        ))}
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