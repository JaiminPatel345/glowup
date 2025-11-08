import React, { useState } from 'react';
import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from '../../screens/auth';

type AuthScreen = 'login' | 'register' | 'forgotPassword';

interface AuthNavigatorProps {
  onAuthSuccess?: () => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  const navigateToLogin = () => setCurrentScreen('login');
  const navigateToRegister = () => setCurrentScreen('register');
  const navigateToForgotPassword = () => setCurrentScreen('forgotPassword');

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