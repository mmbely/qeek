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
import { Timestamp } from 'firebase/firestore';
import { getTimestampMillis, timestampToDate, formatMessageDate } from '../../utils/dateUtils';

// Add type guard for Firestore Timestamp
const isFirestoreTimestamp = (value: any): value is Timestamp => {
  return value && typeof value.toMillis === 'function';
};

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

  // Debug current state
  useEffect(() => {
    console.log('[ChatInterface] Current state:', {
      user: user ? { uid: user.uid } : null,
      currentAccount: currentAccount ? { id: currentAccount.id } : null,
      userId,
      channelId
    });
  }, [user, currentAccount, userId, channelId]);

  // Subscribe to messages
  useEffect(() => {
    if (!user) {
      console.log('[ChatInterface] No user, waiting for auth...');
      return;
    }

    if (!currentAccount?.id) {
      console.log('[ChatInterface] No current account, waiting for account context...');
      return;
    }

    console.log('[ChatInterface] Setting up message subscription:', {
      channelId,
      accountId: currentAccount.id,
      userId: user.uid
    });
    
    setIsLoading(true);
    
    const unsubscribe = subscribeToMessages(
      channelId,
      currentAccount.id,
      (newMessages) => {
        console.log('[ChatInterface] Received messages:', newMessages);
        
        // Ensure all timestamps are numbers
        const processedMessages = newMessages.map(msg => ({
          ...msg,
          timestamp: typeof msg.timestamp === 'number'
            ? msg.timestamp
            : isFirestoreTimestamp(msg.timestamp)
              ? msg.timestamp.toMillis()
              : Date.now()
        }));

        setMessages(processedMessages);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('[ChatInterface] Cleaning up message subscription');
      unsubscribe();
    };
  }, [user, currentAccount, channelId]);

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
      const newMessage: Message = {
        content: message.trim(),
        timestamp: Date.now(),
        userId: user.uid,
        channelId: channelId,
        accountId: currentAccount.id,
        participants: userId ? [user.uid, userId] : undefined
      };
      
      console.log('Sending message with timestamp:', {
        timestamp: newMessage.timestamp,
        date: timestampToDate(newMessage.timestamp)
      });

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