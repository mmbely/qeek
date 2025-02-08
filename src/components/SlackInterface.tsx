import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Outlet } from 'react-router-dom'
import { fetchUsers, fetchMessages, sendMessage } from '../services/chat'
import { Hash, Plus, Send, Menu, Sun, Moon, Smile, Ticket, ListTodo, Kanban } from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { CustomUser } from '../types/user'
import { Link } from 'react-router-dom'
import Sidebar from './Navigation/Sidebar'
import { ref, get, set } from 'firebase/database'
import { database } from '../services/firebase'
import { Message } from '../types/message'

export default function SlackInterface() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentChannel, setCurrentChannel] = useState('general')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<{[key: string]: CustomUser}>({})

  const channels = ['general', 'random', 'announcements', 'project-a', 'project-b']
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isDirectMessageModalOpen, setIsDirectMessageModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [channelError, setChannelError] = useState('');
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadUsers = async () => {
      try {
        const companyId = (user as CustomUser).companyId || 'default';
        const fetchedUsers = await fetchUsers(companyId);
        if (Object.keys(fetchedUsers).length === 0) {
          console.log("No users found for company:", companyId);
        } else {
          setUsers(fetchedUsers);
          console.log("Users loaded in SlackInterface:", fetchedUsers);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    loadUsers();

    // Clear messages and setup new listener when channel changes
    console.log('Setting up listener for channel:', currentChannel);
    setMessages([]); // Clear messages when changing channels
    setLastMessageTimestamp(null);
    
    let unsubscribe: () => void;
    const setupListener = async () => {
      setIsLoading(true);
      try {
        // Clean up previous listener if it exists
        if (unsubscribe) {
          unsubscribe();
        }
        
        unsubscribe = fetchMessages(currentChannel, (newMessage) => {
          console.log('Received message:', newMessage);
          setMessages(prevMessages => {
            // Check if message already exists to prevent duplicates
            if (!prevMessages.some(msg => msg.id === newMessage.id)) {
              return [...prevMessages, newMessage].sort((a, b) => a.timestamp - b.timestamp);
            }
            return prevMessages;
          });
          setLastMessageTimestamp(newMessage.timestamp);
        }, lastMessageTimestamp);
      } finally {
        setIsLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentChannel, user]); // Add currentChannel to dependency array

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && user) {
      const newMessage = {
        content: message,
        timestamp: Date.now(),
        userId: user.uid,
      }
      try {
        await sendMessage(currentChannel, newMessage);
        setMessage('');
      } catch (error) {
        console.error("Failed to send message:", error);
        // Handle error (e.g., show error message to user)
      }
    }
  }

  const handleStartDirectMessage = async (userId: string) => {
    console.log('Starting DM with user:', userId);
    if (!user) {
      console.log('No current user');
      return;
    }

    const dmUsers = [user.uid, userId].sort();
    const channelId = `dm_${dmUsers.join('_')}`;
    console.log('Setting channel to:', channelId);
    
    // Clear messages before changing channel
    setMessages([]);
    setCurrentChannel(channelId);
    setIsDirectMessageModalOpen(false);

    // Create the DM channel if it doesn't exist
    try {
      const channelRef = ref(database, `channels/${channelId}`);
      const snapshot = await get(channelRef);
      if (!snapshot.exists()) {
        await set(channelRef, {
          type: 'dm',
          participants: dmUsers,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      console.error('Error creating DM channel:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  const handleFetchUsers = async () => {
    try {
      const companyId = (user as CustomUser).companyId || 'default';
      const fetchedUsers = await fetchUsers(companyId);
      console.log("Fetched users:", fetchedUsers);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    console.log('Current channel changed to:', currentChannel);
    // ... rest of your channel effect
  }, [currentChannel]);

  // Move getUserName inside the component to access users state
  const getUserName = (userId: string): string => {
    return users[userId]?.displayName || users[userId]?.email || 'Unknown User';
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar 
        user={user}
        channels={channels}
        users={users}
        currentChannel={currentChannel}
        isDarkMode={isDarkMode}
        isMobileMenuOpen={isMobileMenuOpen}
        setCurrentChannel={setCurrentChannel}
        toggleDarkMode={toggleDarkMode}
        setIsDirectMessageModalOpen={setIsDirectMessageModalOpen}
        setIsCreateChannelModalOpen={setIsCreateChannelModalOpen}
        handleStartDirectMessage={handleStartDirectMessage}
        handleLogout={handleLogout}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-4 flex items-center">
            <Hash className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {currentChannel.startsWith('dm_') 
                ? `Direct Message with ${getUserName(currentChannel.split('_')[2])}`
                : currentChannel}
            </h2>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex items-start ${
                    message.userId === user?.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`flex items-start space-x-2 max-w-[70%] ${
                    message.userId === user?.uid ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                  }`}>
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <img
                        src={users[message.userId]?.photoURL || '/placeholder.svg?height=40&width=40'}
                        alt={users[message.userId]?.displayName || 'User'}
                        className="h-8 w-8 rounded-full"
                      />
                    </div>

                    {/* Message Content */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {users[message.userId]?.displayName || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`mt-1 rounded-lg p-3 ${
                        message.userId === user?.uid
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Direct Message Modal */}
      {isDirectMessageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Start a Direct Message</h2>
            {/* We need to implement a way to fetch and display users for direct messaging */}
            <button 
              onClick={() => setIsDirectMessageModalOpen(false)} 
              className="mt-4 px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
