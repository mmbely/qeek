import { database } from './firebase';
import { ref, push, onChildAdded, off, get, set } from "firebase/database";
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { CustomUser } from '../types/user';

export const fetchUsers = async (companyId: string): Promise<{ [key: string]: CustomUser }> => {
  try {
    console.log("Fetching users for company:", companyId);
    const response = await fetch('https://us-central1-qap-ai.cloudfunctions.net/api/getUsersByCompany', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const users = await response.json();
    console.log("Fetched users:", users);
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return {};
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

export const fetchMessages = (channelId: string, callback: (message: any) => void) => {
  console.log(`Fetching messages for channel: ${channelId}`);
  const messagesRef = ref(database, `channels/${channelId}/messages`);
  const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
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
    await push(messagesRef, message);
    console.log("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Expose fetchUsers globally for testing
(window as any).fetchUsers = fetchUsers;
