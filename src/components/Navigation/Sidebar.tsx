import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Hash, Plus, Sun, Moon, ListTodo, Kanban, MessageSquare, LayoutGrid, LogOut, User, Github, Settings, FolderOpen, Code2 } from "lucide-react"
import { AccountSwitcher } from '../ui/AccountSwitcher'
import { ScrollArea } from "../ui/scroll-area"
import { Button } from "../ui/button"
import { CustomUser } from '../../types/user'
import { commonStyles } from '../../styles/theme'
import { animations } from '../../styles/animations'
import { typography } from '../../styles/theme'
import { subscribeToUsers } from '../../services/chat'
import { useAccount } from '../../context/AccountContext'
import { useAuth } from '../../context/AuthContext'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { UserAvatar } from '../../components/ui/UserAvatar'

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
  const { currentAccount } = useAccount();
  const { user: authUser } = useAuth();
  const [accountUsers, setAccountUsers] = useState<{ [key: string]: CustomUser }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentAccount?.id) {
      console.log('[Sidebar] No current account, skipping users subscription');
      setAccountUsers({});
      setIsLoading(false);
      return;
    }

    const memberIds = Object.keys(currentAccount.members);
    console.log('[Sidebar] Setting up users subscription for members:', memberIds);

    const unsubscribe = subscribeToUsers(
      currentAccount.id,
      memberIds,
      (fetchedUsers) => {
        console.log('[Sidebar] Received users:', fetchedUsers);
        setAccountUsers(fetchedUsers);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('[Sidebar] Cleaning up users subscription');
      unsubscribe();
    };
  }, [currentAccount]);

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
        {/* Account Section */}
        <div>
          <h2 className={typography.sidebarHeader}>Account</h2>
          <AccountSwitcher />
        </div>

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
            <li>
              <NavLink
                to="/codebase/file-extractor"
                className={({ isActive }) =>
                  `${commonStyles.sidebar.nav.item} ${
                    isActive ? commonStyles.sidebar.nav.active : commonStyles.sidebar.nav.inactive
                  }`
                }
              >
                <Hash className="h-5 w-5 mr-2" />
                File Extractor
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/codebase/cursor-extractor"
                className={({ isActive }) =>
                  `${commonStyles.sidebar.nav.item} ${
                    isActive ? commonStyles.sidebar.nav.active : commonStyles.sidebar.nav.inactive
                  }`
                }
              >
                <Code2 className="h-5 w-5 mr-2" />
                Cursor Extractor
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
              className="p-1 hover:bg-gray-700 rounded text-gray-300"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {isLoading ? (
            <div className="text-sm text-gray-400 p-2">Loading users...</div>
          ) : Object.keys(accountUsers).length > 0 ? (
            <ScrollArea className="h-[200px]">
              <ul className="space-y-1">
                {Object.entries(accountUsers).map(([userId, userData]) => {
                  const isCurrentUser = userId === authUser?.uid;
                  const userDataToShow = isCurrentUser 
                    ? { 
                        displayName: userData.displayName,
                        email: userData.email,
                        photoURL: authUser?.photoURL
                      }
                    : userData;
                  
                  return (
                    <li key={userId}>
                      <button
                        onClick={() => handleStartDirectMessage(userId)}
                        className={`
                          flex items-center w-full p-2 rounded-lg text-left
                          ${location.pathname === `/chat/dm/${userId}` 
                            ? 'bg-gray-700 text-white' 
                            : 'text-gray-300 hover:bg-gray-700'
                          }
                        `}
                      >
                        <div className="mr-2">
                          <UserAvatar userData={userDataToShow} size="small" />
                        </div>
                        <span className="truncate">
                          {userData.displayName || userData.email || 'Unknown User'}
                          {isCurrentUser && ' (You)'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <div className="text-sm text-gray-400 p-2">
              No users in this account
            </div>
          )}
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
                    location.pathname === '/chat' && currentChannel === channel
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
