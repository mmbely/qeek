import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMessages, sendMessage, subscribeToUsers } from '../../services/chat';
import { CustomUser } from '../../types/user';
import { Message } from '../../types/message';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { useAccount } from '../../context/AccountContext';

export default function ChatInterface() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<{ [key: string]: CustomUser }>({});

  // Create a consistent channel ID for DMs by sorting user IDs
  const getDMChannelId = (user1Id: string, user2Id: string) => {
    const sortedIds = [user1Id, user2Id].sort();
    return `dm_${sortedIds[0]}_${sortedIds[1]}`;
  };

  // Determine the channel ID based on whether it's a DM or general chat
  const channelId = userId && user?.uid 
    ? getDMChannelId(user.uid, userId)
    : 'general';

  console.log('Current channel ID:', channelId); // Debug log

  // Subscribe to messages
  useEffect(() => {
    if (!user || !currentAccount?.id) {
      console.log('No user or account, skipping message subscription');
      return;
    }

    console.log('Setting up message subscription for channel:', channelId);
    setIsLoading(true);
    
    const unsubscribe = subscribeToMessages(channelId, (newMessages) => {
      console.log('Received messages:', newMessages);
      setMessages(newMessages);
      setIsLoading(false);
    });

    return () => {
      console.log('Cleaning up message subscription');
      unsubscribe();
    };
  }, [user, channelId, currentAccount]);

  // Subscribe to users
  useEffect(() => {
    if (!currentAccount?.id) {
      console.log('[ChatInterface] No current account, skipping users subscription');
      setUsers({});
      setIsLoading(false);
      return;
    }

    const memberIds = Object.keys(currentAccount.members);
    console.log('[ChatInterface] Setting up users subscription for members:', memberIds);

    const unsubscribe = subscribeToUsers(
      currentAccount.id,
      memberIds,
      (fetchedUsers) => {
        console.log('[ChatInterface] Received users data:', fetchedUsers);
        setUsers(fetchedUsers);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('[ChatInterface] Cleaning up users subscription');
      unsubscribe();
    };
  }, [currentAccount]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !currentAccount?.id) return;

    try {
      const newMessage = {
        content: message,
        timestamp: Date.now(),
        userId: user.uid,
        channelId: channelId,
        accountId: currentAccount.id
      };
      
      console.log('Sending message:', newMessage);
      await sendMessage(channelId, newMessage);
      setMessage('');
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Debug render
  console.log('ChatInterface render:', {
    userId,
    channelId,
    messagesCount: messages.length,
    usersLoaded: Object.keys(users).length,
    isLoading
  });

  // Get the other user's display name
  const otherUser = userId ? users[userId] : null;
  const otherUserName = otherUser?.displayName || otherUser?.email || 'Loading...';
  const subtitle = userId ? (otherUser?.email || 'Loading...') : 'Public channel';

  return (
    <div className="flex flex-col h-full">
      <header className={commonStyles.header.wrapper}>
        <div className={commonStyles.header.container}>
          <div className={commonStyles.header.titleWrapper}>
            <h2 className={commonStyles.header.title}>
              {userId ? `Chat with ${otherUserName}` : 'General Chat'}
            </h2>
            {otherUser?.email && (
              <p className={commonStyles.header.subtitle}>{otherUser.email}</p>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <MessageList 
          messages={messages}
          isLoading={isLoading}
          currentUser={user}
          users={users}
          className="p-4 space-y-4"
        />
      </div>

      <MessageInput 
        message={message}
        setMessage={setMessage}
        handleSendMessage={handleSendMessage}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4"
      />
    </div>
  );
}