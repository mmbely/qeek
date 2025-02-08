import React from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Hash, Plus, Sun, Moon, ListTodo, Kanban, MessageSquare, LayoutGrid, LogOut, User } from "lucide-react"
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
  const location = useLocation();
  const currentPath = location.pathname;
  const currentUserId = currentPath.startsWith('/chat/dm/') 
    ? currentPath.split('/chat/dm/')[1]
    : null;

  // Debug log to check users data
  console.log('Users in Sidebar:', users);

  return (
    <div className={`w-64 bg-gray-900 text-white h-screen flex flex-col ${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex`}>
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Qeek</h1>
        <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-700 rounded">
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
        {/* Tickets Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Tickets</h2>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/tickets/backlog"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                <ListTodo className="h-5 w-5 mr-2" />
                Backlog
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/tickets/board"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                <LayoutGrid className="h-5 w-5 mr-2" />
                Board
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Direct Messages</h2>
            <button
              onClick={() => setIsDirectMessageModalOpen(true)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {Object.entries(users).map(([userId, userData]) => (
              <li key={userId}>
                <button
                  onClick={() => handleStartDirectMessage(userId)}
                  className={`flex items-center p-2 rounded-lg w-full text-left ${
                    currentUserId === userId
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  {userData.displayName || userData.email || 'Unknown User'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Channels Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Channels</h2>
            <button
              onClick={() => setIsCreateChannelModalOpen(true)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {channels.map((channel) => (
              <li key={channel}>
                <button
                  onClick={() => {
                    setCurrentChannel(channel);
                    // Navigate to general chat
                    window.location.href = '/chat';
                  }}
                  className={`flex items-center p-2 rounded-lg w-full text-left ${
                    currentPath === '/chat' && currentChannel === channel
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Hash className="h-5 w-5 mr-2" />
                  {channel}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 w-full"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </button>
      </div>
    </div>
  )
}