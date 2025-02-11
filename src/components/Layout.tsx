import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Navigation/Sidebar';
import { useAuth } from '../context/AuthContext';
import { CustomUser } from '../types/user';
import { subscribeToUsers } from '../services/chat';

export default function Layout() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDirectMessageModalOpen, setIsDirectMessageModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState('general');
  const [channels] = useState(['general', 'random']);
  const [users, setUsers] = useState<{ [key: string]: CustomUser }>({});

  useEffect(() => {
    if (!user) return;

    console.log('Fetching users...');
    const unsubscribe = subscribeToUsers((fetchedUsers) => {
      console.log('Received users:', fetchedUsers);
      const filteredUsers = Object.fromEntries(
        Object.entries(fetchedUsers).filter(([id]) => id !== user?.uid)
      );
      console.log('Filtered users:', filteredUsers);
      setUsers(filteredUsers);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const getDMChannelId = (user1Id: string, user2Id: string) => {
    const sortedIds = [user1Id, user2Id].sort();
    return `dm_${sortedIds[0]}_${sortedIds[1]}`;
  };

  const handleStartDirectMessage = async (userId: string) => {
    console.log('Starting DM with user:', userId);
    if (!userId || !user?.uid) {
      console.error('No userId provided to handleStartDirectMessage');
      return;
    }
    const dmChannelId = getDMChannelId(user.uid, userId);
    setCurrentChannel(dmChannelId);
    navigate(`/chat/dm/${userId}`);
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
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setIsDirectMessageModalOpen={setIsDirectMessageModalOpen}
        setIsCreateChannelModalOpen={setIsCreateChannelModalOpen}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        handleStartDirectMessage={handleStartDirectMessage}
      />
      <main className="flex-1 overflow-hidden bg-white dark:bg-[#262b3d]">
        <Outlet />
      </main>
    </div>
  );
}