import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { loginUser, clearError } from '../../store/slices/authSlice';
import { Button, Input } from '../../components/common';
import { LoginFormData } from '../../types';
import { validateEmail } from '../../utils';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<LoginFormData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<LoginFormData> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(loginUser(formData)).unwrap();
      // Navigation will be handled by the parent component based on auth state
    } catch (error) {
      // Error is already handled by the Redux slice
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear global error
    if (error) {
      dispatch(clearError());
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-20 pb-8">
        {/* Header */}
        <View className="items-center mb-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </Text>
          <Text className="text-gray-600 text-center">
            Sign in to your GrowUp account
          </Text>
        </View>

        {/* Form */}
        <View className="mb-8">
          <Input
            label="Email Address"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="login-email-input"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            error={formErrors.password}
            secureTextEntry
            testID="login-password-input"
          />

          {error && (
            <View className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <Text className="text-error-600 text-sm text-center">
                {error}
              </Text>
            </View>
          )}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            testID="login-submit-button"
            className="mb-4"
          />

          <Button
            title="Forgot Password?"
            onPress={onNavigateToForgotPassword}
            variant="ghost"
            testID="forgot-password-button"
          />
        </View>

        {/* Footer */}
        <View className="items-center">
          <Text className="text-gray-600 mb-4">
            Don't have an account?
          </Text>
          <Button
            title="Create Account"
            onPress={onNavigateToRegister}
            variant="outline"
            testID="navigate-to-register-button"
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default LoginScreen;