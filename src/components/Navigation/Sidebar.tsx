import React from 'react'
import { Link } from 'react-router-dom'
import { Hash, Plus, Sun, Moon, ListTodo, Kanban } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { Button } from "../ui/button"
import { CustomUser } from '../../types/user'

interface SidebarProps {
  user: CustomUser | null;
  channels: string[];
  users: {[key: string]: CustomUser};
  currentChannel: string;
  isDarkMode: boolean;
  isMobileMenuOpen: boolean;
  setCurrentChannel: (channel: string) => void;
  toggleDarkMode: () => void;
  setIsDirectMessageModalOpen: (isOpen: boolean) => void;
  setIsCreateChannelModalOpen: (isOpen: boolean) => void;
  handleStartDirectMessage: (userId: string) => void;
  handleLogout: () => void;
}

export default function Sidebar({
  user,
  channels,
  users,
  currentChannel,
  isDarkMode,
  isMobileMenuOpen,
  setCurrentChannel,
  toggleDarkMode,
  setIsDirectMessageModalOpen,
  setIsCreateChannelModalOpen,
  handleStartDirectMessage,
  handleLogout
}: SidebarProps) {

  const isDMActive = (userId: string): boolean => {
    if (!user) return false;
    const dmChannelId = `dm_${[user.uid, userId].sort().join('_')}`;
    return currentChannel === dmChannelId;
  };

  return (
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
            Tickets
            <div className="flex gap-1">
              <Link 
                to="/tickets/new"
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </h2>
          <ul>
            <li className="mb-1">
              <Link
                to="/tickets"
                className="w-full text-left px-3 py-2 rounded-lg flex items-center transition-all text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <ListTodo className="h-4 w-4 mr-2" />
                Backlog
              </Link>
            </li>
            <li className="mb-1">
              <Link
                to="/tickets/board"
                className="w-full text-left px-3 py-2 rounded-lg flex items-center transition-all text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <Kanban className="h-4 w-4 mr-2" />
                Board
              </Link>
            </li>
          </ul>
          <h2 className="text-lg font-semibold mt-6 mb-2 flex items-center justify-between text-gray-100">
            Channels
            <div className="flex gap-1">
              <button 
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded transition-colors"
                onClick={() => setIsCreateChannelModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
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
            {Object.entries(users)
              .filter(([userId]) => userId !== user?.uid) // Don't show current user
              .map(([userId, userData]) => (
                <li key={userId} className="mb-1">
                  <button 
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center hover:bg-gray-700 transition-colors group ${
                      isDMActive(userId)
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                    onClick={() => {
                      console.log('DM button clicked for user:', userId);
                      handleStartDirectMessage(userId);
                    }}
                  >
                    <div className="relative mr-2">
                      <img 
                        src={userData.photoURL || '/placeholder.svg?height=40&width=40'} 
                        alt={userData.displayName || 'User'} 
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800"></div>
                    </div>
                    <span className="group-hover:text-white transition-colors">
                      {userData.displayName || userData.email}
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
  )
}