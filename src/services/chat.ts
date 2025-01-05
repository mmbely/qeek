import { database, auth } from './firebase';
import { ref, push, onChildAdded, off, get, set, query, orderByChild, startAfter, limitToFirst, limitToLast } from "firebase/database";
import { CustomUser } from '../types/user';

export const fetchUsers = async (companyId: string): Promise<{ [key: string]: CustomUser }> => {
  try {
    console.log("Fetching users for company:", companyId);
    const user = auth.currentUser;
    console.log("Current user:", user);
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log("No users found");
      return {};
    }
    
    const users = snapshot.val();
    console.log("Fetched users:", users);
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.stack);
      throw new Error(`Failed to fetch users: ${error.message}`);
    } else {
      console.error("Unknown error object:", error);
      throw new Error('An unknown error occurred while fetching users');
    }
  }
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

export const fetchMessages = (channelId: string, callback: (message: any) => void, lastTimestamp: number | null = null) => {
  const messagesRef = ref(database, `channels/${channelId}/messages`);
  let messageQuery;
  if (lastTimestamp) {
    messageQuery = query(messagesRef, orderByChild('timestamp'), startAfter(lastTimestamp), limitToFirst(20));
  } else {
    messageQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(20));
  }
  const unsubscribe = onChildAdded(messageQuery, (snapshot) => {
    const messageData = snapshot.val();
    console.log("New message received:", messageData);
    callback({...messageData, id: snapshot.key});
  });
  return () => {
    console.log(`Unsubscribing from messages for channel: ${channelId}`);
    off(messagesRef, 'child_added', unsubscribe);
  };
};

export const sendMessage = async (channelId: string, message: any) => {
  try {
    console.log(`Sending message to channel: ${channelId}`, message);
    const messagesRef = ref(database, `channels/${channelId}/messages`);
    
    // Add participants for direct messages
    const messageWithMetadata = {
      ...message,
      timestamp: Date.now(),
      status: 'sent',
      reactions: {},
      participants: channelId.startsWith('dm_') ? channelId.split('_').slice(1) : []
    };
    
    await push(messagesRef, messageWithMetadata);
    console.log("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
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

// Add this at the end of the file
(window as any).testFetchUsers = async (companyId: string) => {
  try {
    const users = await fetchUsers(companyId);
    console.log('Fetched users:', users);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};
