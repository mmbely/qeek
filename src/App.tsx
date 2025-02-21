import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatInterface from './components/Chat/ChatInterface';
import TicketList from './components/Tickets/TicketList';
import { TicketBoard } from './components/Tickets/TicketBoard';
import Layout from './components/Layout';
import { TicketForm } from './components/Tickets';
import GitHubSettings from './components/Settings/GitHubSettings';
import CodebaseViewer from './components/Codebase/CodebaseViewer';
import { CodebaseProvider } from './context/CodebaseContext';
import { AccountProvider } from './context/AccountContext';
import SettingsLayout from './components/Settings/SettingsLayout';
import UserManagement from './components/Settings/UserManagement';
import UserProfile from './components/Settings/UserProfile';
import AdminSettings from './components/Settings/AdminSettings';
import FileExtractionTool from './components/Codebase/FileExtractionTool';
import { settingsRoutes } from './routes/settings';
import CursorSettings from './components/Settings/CursorSettings';
import CursorExtractionTool from './components/Codebase/CursorExtractionTool';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Add this custom hook for managing titles
function usePageTitle() {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path.startsWith('/chat')) {
      return 'Chat';
    } else if (path.startsWith('/tickets/board')) {
      return 'Board';
    } else if (path.startsWith('/tickets/backlog')) {
      return 'Backlog';
    } else if (path.startsWith('/tickets/all')) {
      return 'All Tickets';
    } else if (path.startsWith('/tickets/new')) {
      return 'New Ticket';
    } else if (path === '/login') {
      return 'Login';
    } else if (path === '/register') {
      return 'Register';
    } else if (path.startsWith('/codebase/connect')) {
      return 'Connect Repository';
    } else if (path === '/settings/github') {
      return 'GitHub Settings';
    } else if (path === '/settings/cursor') {
      return 'Cursor Integration';
    }
    
    return 'Dashboard';
  };

  return getPageTitle();
}

function AppContent() {
  const pageTitle = usePageTitle();
  
  useEffect(() => {
    document.title = `Q: ${pageTitle}`;
  }, [pageTitle]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/tickets/board" replace />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/chat/dm/:userId" element={<ChatInterface />} />
        <Route path="/tickets" element={<TicketList />} />
        <Route path="/tickets/backlog" element={<TicketBoard mode="backlog" />} />
        <Route path="/tickets/board" element={<TicketBoard mode="development" />} />
        <Route path="/tickets/all" element={<TicketList />} />
        <Route path="/tickets/new" element={<TicketForm />} />
        <Route path="/codebase/connect" element={<GitHubSettings />} />
        <Route path="/codebase/files" element={<CodebaseViewer />} />
        <Route path="/codebase/files/:repositoryName" element={<CodebaseViewer />} />
        <Route path="/codebase">
          <Route path="file-extractor" element={<FileExtractionTool />} />
          <Route path="cursor-extractor" element={<CursorExtractionTool />} />
        </Route>
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<UserProfile />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="github" element={<GitHubSettings />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="admin" element={<AdminSettings />} />
          <Route path="cursor" element={<CursorSettings />} />
        </Route>
        <Route path="/repository/:repoName" element={<CodebaseViewer />} />
        <Route path="/repository/:repoName/file/:filePath" element={<CodebaseViewer />} />
      </Route>
    </Routes>
  );
}

const router = createBrowserRouter([
  // ... other routes ...
  ...settingsRoutes  // Make sure this is included
]);

function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <CodebaseProvider>
          <Router>
            <AppContent />
          </Router>
        </CodebaseProvider>
      </AccountProvider>
    </AuthProvider>
  );
}

export default App;
