import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Auth/Login';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const onLoginSuccess = () => {
    navigate('/');
  };

  return <Login onSuccess={onLoginSuccess} />;
};

export default LoginPage;
