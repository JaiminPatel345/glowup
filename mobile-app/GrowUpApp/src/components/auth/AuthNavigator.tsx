import React, { useState } from 'react';
import { useAppDispatch } from '../../store';
import { clearError } from '../../store/slices/authSlice';
import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from '../../screens/auth';

type AuthScreen = 'login' | 'register' | 'forgotPassword';

interface AuthNavigatorProps {
  onAuthSuccess?: () => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  const dispatch = useAppDispatch();
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  const navigateToLogin = () => {
    dispatch(clearError());
    setCurrentScreen('login');
  };
  
  const navigateToRegister = () => {
    dispatch(clearError());
    setCurrentScreen('register');
  };
  
  const navigateToForgotPassword = () => {
    dispatch(clearError());
    setCurrentScreen('forgotPassword');
  };

  switch (currentScreen) {
    case 'login':
      return (
        <LoginScreen
          onNavigateToRegister={navigateToRegister}
          onNavigateToForgotPassword={navigateToForgotPassword}
        />
      );
    
    case 'register':
      return (
        <RegisterScreen
          onNavigateToLogin={navigateToLogin}
        />
      );
    
    case 'forgotPassword':
      return (
        <ForgotPasswordScreen
          onNavigateToLogin={navigateToLogin}
        />
      );
    
    default:
      return (
        <LoginScreen
          onNavigateToRegister={navigateToRegister}
          onNavigateToForgotPassword={navigateToForgotPassword}
        />
      );
  }
};

export default AuthNavigator;