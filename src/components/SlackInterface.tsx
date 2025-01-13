import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { fetchUsers, fetchMessages, sendMessage } from '../services/chat'
import { Hash, Plus, Send, Menu, Sun, Moon, Smile } from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { CustomUser } from '../types/user'

interface Message {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
}

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
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadUsers = async () => {
      try {
        const companyId = (user as CustomUser).companyId || 'default';
        const fetchedUsers = await fetchUsers(companyId);
        if (Object.keys(fetchedUsers).length === 0) {
          console.log("No users found for company:", companyId);
        } else {
          // Create a new object with unique users
          const uniqueUsers = Object.entries(fetchedUsers).reduce((acc, [key, value]) => {
            if (!acc[key]) {
              acc[key] = value;
            }
            return acc;
          }, {} as {[key: string]: CustomUser});
          
          setUsers(uniqueUsers);
          console.log("Users loaded in SlackInterface:", uniqueUsers);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    loadUsers();

    // Clear messages and setup new listener
    setMessages([]);
    setLastMessageTimestamp(null);
    
    let unsubscribe: () => void;
    const setupListener = async () => {
      // Clean up previous listener if it exists
      if (unsubscribe) {
        unsubscribe();
      }
      
      unsubscribe = fetchMessages(currentChannel, (newMessage) => {
        setMessages(prevMessages => {
          // Check if message already exists to prevent duplicates
          if (!prevMessages.some(msg => msg.id === newMessage.id)) {
            return [...prevMessages, newMessage];
          }
          return prevMessages;
        });
        setLastMessageTimestamp(newMessage.timestamp);
      }, lastMessageTimestamp);
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentChannel, user]);

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
    if (!user) return;

    const channelId = [user.uid, userId].sort().join('_');
    setCurrentChannel(`dm_${channelId}`);
    setIsDirectMessageModalOpen(false);
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

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`w-64 bg-gray-800 dark:bg-gray-900 text-gray-300 flex-col ${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/qeek-logo.png" alt="QEK Logo" className="h-8 w-auto mr-2" />
          </div>
          <button 
            onClick={toggleDarkMode} 
            className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        <ScrollArea className="flex-grow">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2 flex items-center justify-between text-gray-100">
              Channels
              <button 
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded transition-colors"
                onClick={() => setIsDirectMessageModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </h2>
            <ul>
              {channels.map((channel) => (
                <li key={channel} className="mb-1">
                  <button 
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center transition-all ${
                      currentChannel === channel 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                    onClick={() => setCurrentChannel(channel)}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    {channel}
                  </button>
                </li>
              ))}
            </ul>
            <h2 className="text-lg font-semibold mt-6 mb-2 flex items-center justify-between text-gray-100">
              Direct Messages
              <button 
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded transition-colors"
                onClick={() => setIsDirectMessageModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </h2>
            <ul>
              {Object.entries(users).map(([userId, userData]) => (
                <li key={userId} className="mb-1">
                  <button 
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center hover:bg-gray-700 transition-colors group"
                    onClick={() => handleStartDirectMessage(userId)}
                  >
                    <div className="relative mr-2">
                      <img 
                        src={userData.photoURL || '/placeholder.svg?height=40&width=40'} 
                        alt={userData.displayName || 'User'} 
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800"></div>
                    </div>
                    <span className="text-gray-300 group-hover:text-white transition-colors">
                      {userData.displayName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={handleLogout} 
            className="w-full text-left px-3 py-2 rounded-lg text-red-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {/* Channel Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <button className="mr-2 md:hidden" onClick={toggleMobileMenu}>
              <Menu className="h-6 w-6" />
            </button>
            <Hash className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {currentChannel.startsWith('dm_') ? (
                (() => {
                  const userIds = currentChannel.replace('dm_', '').split('_');
                  // If both IDs are the same, it's a self-message
                  if (userIds[0] === userIds[1]) {
                    return `Note to self`;
                  }
                  const otherUserId = userIds.find(id => id !== user?.uid);
                  const otherUser = otherUserId ? users[otherUserId] : null;
                  return otherUser?.displayName || `DM with ${otherUserId}`;
                })()
              ) : (
                currentChannel
              )}
            </h2>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            {messages.map((message) => {
              const messageUser = users[message.userId];
              return (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="pt-1">
                    <img
                      src={messageUser?.photoURL || '/placeholder.svg?height=40&width=40'}
                      alt={messageUser?.displayName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {messageUser?.displayName || message.userId}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100 break-words text-left">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSendMessage} className="flex items-center">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mr-2"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: any) => setMessage(prev => prev + emoji.native)}
                  theme={isDarkMode ? 'dark' : 'light'}
                />
              </PopoverContent>
            </Popover>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message ${currentChannel.startsWith('dm_') ? (
                (() => {
                  const userIds = currentChannel.replace('dm_', '').split('_');
                  // If both IDs are the same, it's a self-message
                  if (userIds[0] === userIds[1]) {
                    return 'yourself';
                  }
                  const otherUserId = userIds.find(id => id !== user?.uid);
                  const otherUser = otherUserId ? users[otherUserId] : null;
                  return otherUser?.displayName || `user ${otherUserId}`;
                })()
              ) : `#${currentChannel}`}`}
              className="flex-1 mr-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
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
