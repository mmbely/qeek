import { database, auth } from './firebase';
import { ref, push, onChildAdded, off, get, set, query, orderByChild, startAt, endAt, limitToLast, onValue } from "firebase/database";
import { CustomUser } from '../types/user';
import { Message } from '../types/message';

// Callback-based version for real-time updates
export const subscribeToUsers = (callback: (users: { [key: string]: CustomUser }) => void) => {
  const usersRef = ref(database, 'users');
  
  console.log('Setting up users subscription'); // Debug log
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
    console.log('Received users snapshot:', snapshot.val()); // Debug log
    const users: { [key: string]: CustomUser } = {};
    snapshot.forEach((childSnapshot) => {
      const userId = childSnapshot.key;
      const userData = childSnapshot.val();
      if (userId) {
        users[userId] = userData;
      }
    });
    console.log('Processed users:', users); // Debug log
    callback(users);
  });

  return () => {
    console.log('Unsubscribing from users'); // Debug log
    off(usersRef);
    unsubscribe();
  };
};

// Promise-based version for one-time fetches
export const fetchUsers = async (companyId: string): Promise<{ [key: string]: CustomUser }> => {
  const usersRef = ref(database, 'users');
  const snapshot = await get(usersRef);
  const users: { [key: string]: CustomUser } = {};
  
  snapshot.forEach((childSnapshot) => {
    users[childSnapshot.key!] = childSnapshot.val();
  });
  
  return users;
};

export const createUser = async (userId: string, userData: any) => {
  try {
    console.log("Creating user:", userId, userData);
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, userData);
    console.log("User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const subscribeToMessages = (channelId: string, callback: (messages: Message[]) => void) => {
  console.log('Setting up message subscription for channel:', channelId);
  const messagesRef = ref(database, `channels/${channelId}/messages`);
  
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: Message[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
    }
    console.log(`Received ${messages.length} messages for channel:`, channelId);
    callback(messages);
  });

  return () => {
    off(messagesRef);
    unsubscribe();
  };
};

export const sendMessage = async (channelId: string, message: Omit<Message, 'id'>) => {
  console.log('Sending message to channel:', channelId, message);
  const messagesRef = ref(database, `channels/${channelId}/messages`);
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, message);
};

export const updateMessage = async (channelId: string, messageId: string, updates: any) => {
  try {
    const messageRef = ref(database, `channels/${channelId}/messages/${messageId}`);
    await set(messageRef, updates);
  } catch (error) {
    console.error("Error updating message:", error);
    throw error;
  }
};

export const deleteMessage = async (channelId: string, messageId: string) => {
  try {
    const messageRef = ref(database, `channels/${channelId}/messages/${messageId}`);
    await set(messageRef, null);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

export const addReaction = async (channelId: string, messageId: string, reaction: string, userId: string) => {
  try {
    const reactionRef = ref(database, `channels/${channelId}/messages/${messageId}/reactions/${reaction}/${userId}`);
    await set(reactionRef, true);
  } catch (error) {
    console.error("Error adding reaction:", error);
    throw error;
  }
};

export const removeReaction = async (channelId: string, messageId: string, reaction: string, userId: string) => {
  try {
    const reactionRef = ref(database, `channels/${channelId}/messages/${messageId}/reactions/${reaction}/${userId}`);
    await set(reactionRef, null);
  } catch (error) {
    console.error("Error removing reaction:", error);
    throw error;
  }
};

export const setTypingStatus = async (channelId: string, userId: string, isTyping: boolean) => {
  try {
    const typingRef = ref(database, `channels/${channelId}/typing/${userId}`);
    await set(typingRef, isTyping ? Date.now() : null);
  } catch (error) {
    console.error("Error setting typing status:", error);
    throw error;
  }
};

export const subscribeToTyping = (channelId: string, callback: (typingUsers: {[key: string]: number}) => void) => {
  const typingRef = ref(database, `channels/${channelId}/typing`);
  const unsubscribe = onChildAdded(typingRef, (snapshot) => {
    const typingUsers = snapshot.val();
    callback(typingUsers);
  });
  return () => {
    off(typingRef, 'child_added', unsubscribe);
  };
};

// Expose fetchUsers globally for testing
(window as any).fetchUsers = fetchUsers;

// Update the test functions
(window as any).testFetchUsers = async (companyId: string) => {
  try {
    const users = await fetchUsers(companyId);
    console.log('Fetched users:', users);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};
