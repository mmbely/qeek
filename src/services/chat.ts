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
export const subscribeToMessages = (channelId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, 'messages');
  const q = firestoreQuery(
    messagesRef,
    where('channelId', '==', channelId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    callback(messages);
  });
};

// Send a new message
export const sendMessage = async (channelId: string, message: Message) => {
  const messagesRef = collection(db, 'messages');
  await addDoc(messagesRef, message);
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
