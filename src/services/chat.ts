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

// Subscribe to account users
export const subscribeToUsers = (accountId: string, callback: (users: { [key: string]: CustomUser }) => void) => {
  console.log('[Chat Service] Setting up users subscription for account:', accountId);
  
  const usersRef = collection(db, 'users');
  const usersQuery = firestoreQuery(usersRef, where('accountId', '==', accountId));

  return onSnapshot(usersQuery, (snapshot) => {
    const users: { [key: string]: CustomUser } = {};
    
    snapshot.forEach((doc) => {
      const userData = doc.data() as CustomUser;
      users[doc.id] = {
        ...userData,
        uid: doc.id
      };
    });

    console.log('[Chat Service] Found users for account:', Object.keys(users).length);
    callback(users);
  }, (error) => {
    console.error('[Chat Service] Error fetching users:', error);
  });
};

// Subscribe to channel messages
export const subscribeToMessages = (channelId: string, callback: (messages: Message[]) => void) => {
  console.log('[Chat Service] Setting up messages subscription for channel:', channelId);
  
  const messagesRef = collection(db, 'messages');
  const messagesQuery = firestoreQuery(
    messagesRef,
    where('channelId', '==', channelId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];

    console.log('[Chat Service] Found messages for channel:', messages.length);
    callback(messages);
  }, (error) => {
    console.error('[Chat Service] Error fetching messages:', error);
  });
};

// Send a new message
export const sendMessage = async (channelId: string, message: Omit<Message, 'id'>) => {
  console.log('[Chat Service] Sending message to channel:', channelId);
  
  try {
    const messagesRef = collection(db, 'messages');
    const newMessage = {
      ...message,
      timestamp: serverTimestamp(),
      channelId
    };

    const docRef = await addDoc(messagesRef, newMessage);
    console.log('[Chat Service] Message sent successfully:', docRef.id);
    return docRef.id;
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
    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};
