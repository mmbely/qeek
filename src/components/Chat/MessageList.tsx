import React, { useEffect, useRef } from 'react';
import { Message } from '../../types/message';
import { CustomUser } from '../../types/user';

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentUser: CustomUser | null;
  users: { [key: string]: CustomUser };
}

export default function MessageList({ 
  messages, 
  isLoading, 
  currentUser,
  users 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll when messages change

  console.log('MessageList render:', { messages, isLoading, currentUser, users });

  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        <p>Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 p-4">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.userId === currentUser?.uid;
          const sender = users[message.userId];
          const senderName = sender?.displayName || sender?.email || 'Unknown User';

          console.log('Rendering message:', message);
          return (
            <div 
              key={message.id}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  isCurrentUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                {!isCurrentUser && (
                  <p className="text-xs font-semibold mb-1">{senderName}</p>
                )}
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-75">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          );
        })}
        {/* Invisible div at the bottom for scrolling */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}