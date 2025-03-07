import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../Navigation/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../styles/theme';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isDarkMode, toggleDarkMode, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDirectMessageModalOpen, setIsDirectMessageModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);

  const handleStartDirectMessage = (userId: string) => {
    navigate(`/chat/dm/${userId}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`flex h-screen bg-[${theme.colors.dark.primary}]`}>
      <Sidebar
        user={user}
        channels={[]}
        users={{}}
        currentChannel=""
        isDarkMode={isDarkMode}
        isMobileMenuOpen={isMobileMenuOpen}
        setCurrentChannel={() => {}}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setIsDirectMessageModalOpen={setIsDirectMessageModalOpen}
        setIsCreateChannelModalOpen={setIsCreateChannelModalOpen}
        toggleDarkMode={toggleDarkMode}
        handleLogout={logout}
        handleStartDirectMessage={handleStartDirectMessage}
      />
      <main className={`
        flex-1 overflow-auto flex flex-col
        bg-white dark:bg-[${theme.colors.dark.background.primary}]
      `}>
        <div className="w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
