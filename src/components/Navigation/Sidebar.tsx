import React from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Hash, Plus, Sun, Moon, ListTodo, Kanban, MessageSquare, LayoutGrid, LogOut, User, Github, Settings, FolderOpen } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { Button } from "../ui/button"
import { CustomUser } from '../../types/user'
import { commonStyles } from '../../styles/theme'
import { animations } from '../../styles/animations'
import { typography } from '../../styles/theme'

interface SidebarProps {
  user: CustomUser | null;
  channels: string[];
  users: { [key: string]: CustomUser };
  currentChannel: string;
  isDarkMode: boolean;
  isMobileMenuOpen: boolean;
  setCurrentChannel: (channel: string) => void;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  setIsDirectMessageModalOpen: (isOpen: boolean) => void;
  setIsCreateChannelModalOpen: (isOpen: boolean) => void;
  toggleDarkMode: () => void;
  handleLogout: () => void;
  handleStartDirectMessage: (userId: string) => void;
}

export function Sidebar({
  user,
  channels,
  users,
  currentChannel,
  isDarkMode,
  isMobileMenuOpen,
  setCurrentChannel,
  setIsMobileMenuOpen,
  setIsDirectMessageModalOpen,
  setIsCreateChannelModalOpen,
  toggleDarkMode,
  handleLogout,
  handleStartDirectMessage,
}: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentUserId = currentPath.startsWith('/chat/dm/') 
    ? currentPath.split('/chat/dm/')[1]
    : null;

  // Debug log to check users data
  console.log('Users in Sidebar:', users);

  return (
    <div className={commonStyles.layout.sidebar}>
      <div className="p-4 flex justify-between items-center">
        <h1 className={typography.brand}>QEEK</h1>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-300 hover:bg-[#313a55] transition-colors duration-200"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-8">
        {/* Tickets Section */}
        <div>
          <h2 className={typography.sidebarHeader}>Tickets</h2>
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
            <li>
              <NavLink
                to="/tickets/all"
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                <ListTodo className="h-5 w-5 mr-2" />
                All
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Codebase Section */}
        <div>
          <h2 className={typography.sidebarHeader}>Codebase</h2>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/codebase/connect"
                className={({ isActive }) =>
                  `${commonStyles.sidebar.nav.item} ${
                    isActive ? commonStyles.sidebar.nav.active : commonStyles.sidebar.nav.inactive
                  }`
                }
              >
                <Github className="h-5 w-5 mr-2" />
                Connect
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/codebase/files"
                className={({ isActive }) =>
                  `${commonStyles.sidebar.nav.item} ${
                    isActive ? commonStyles.sidebar.nav.active : commonStyles.sidebar.nav.inactive
                  }`
                }
              >
                <FolderOpen className="h-5 w-5 mr-2" />
                View Files
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className={typography.sidebarHeader}>Direct Messages</h2>
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
            <h2 className={typography.sidebarHeader}>Channels</h2>
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

      {/* Footer with Settings and Sign Out */}
      <div className="border-t border-gray-700 p-4 space-y-2">
        <NavLink
          to="/settings/github"
          className="flex items-center w-full p-2 rounded-lg text-gray-300 hover:bg-[#313a55] transition-colors duration-200 gap-2"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 rounded-lg text-gray-300 hover:bg-[#313a55] transition-colors duration-200 gap-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
