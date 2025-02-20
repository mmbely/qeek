import { 
  collection, 
  doc,
  addDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  serverTimestamp,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { Message } from '../types/message';
import { CustomUser } from '../types/user';
import { getTimestampMillis } from '../utils/dateUtils';

// Subscribe to account users
export const subscribeToUsers = (
  accountId: string, 
  memberIds: string[],
  callback: (users: { [key: string]: CustomUser }) => void
) => {
  if (!accountId || !memberIds.length) {
    console.error('[Chat Service] Cannot subscribe to users: missing accountId or memberIds');
    return () => {};
  }

  console.log('[Chat Service] Starting users subscription for account:', accountId, 'members:', memberIds);
  
  const usersRef = collection(db, 'users');
  const q = firestoreQuery(
    usersRef,
    where('uid', 'in', memberIds)
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const users: { [key: string]: CustomUser } = {};
      snapshot.forEach((doc) => {
        const userData = doc.data() as CustomUser;
        users[doc.id] = {
          ...userData,
          uid: doc.id,
          displayName: userData.displayName || userData.email || 'Unknown User',
        };
      });

      console.log('[Chat Service] Snapshot received with users:', users);
      callback(users);
    }, 
    (error) => {
      console.error('[Chat Service] Error in users subscription:', error);
      callback({});
    }
  );
};

// Subscribe to channel messages
export const subscribeToMessages = (
  channelId: string,
  accountId: string,
  callback: (messages: Message[]) => void
) => {
  console.log('[Chat Service] Setting up message subscription:', {
    channelId,
    accountId
  });

  const q = firestoreQuery(
    collection(db, 'messages'),
    where('channelId', '==', channelId),
    where('accountId', '==', accountId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp || Date.now()
    })) as Message[];
    
    callback(messages);
  }, (error) => {
    console.error("Error subscribing to messages:", error);
  });
};

// Send a new message
export const sendMessage = async (channelId: string, message: Message) => {
  console.log('[Chat Service] Sending message:', message);
  
  // Ensure timestamp is a number before storing
  const messageToStore = {
    ...message,
    channelId,
    timestamp: typeof message.timestamp === 'number' 
      ? message.timestamp 
      : Date.now()
  };

  try {
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, messageToStore);
    console.log('[Chat Service] Message sent successfully');
  } catch (error) {
    console.error('[Chat Service] Error sending message:', error);
    throw error;
  }
};

// Update a message
export const updateMessage = async (messageId: string, updates: Partial<Message>) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, updates);
  } catch (error) {
    console.error("Error updating message:", error);
    throw error;
  }
};

// Delete a message
export const deleteMessage = async (messageId: string) => {
  try {
    await deleteDoc(doc(db, 'messages', messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};
