import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatInterface from './components/Chat/ChatInterface';
import TicketList from './components/Tickets/TicketList';
import { TicketBoard } from './components/Tickets/TicketBoard';
import Layout from './components/Layout';
import { TicketForm } from './components/Tickets';

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

function App() {
  return (
    <AuthProvider>
      <Router>
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
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
