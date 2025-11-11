import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { forgotPassword, clearError } from '../../store/slices/authSlice';
import { Button, Input } from '../../components/common';
import { ForgotPasswordFormData } from '../../types';
import { validateEmail } from '../../utils';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<ForgotPasswordFormData>>({});
  const [isEmailSent, setIsEmailSent] = useState(false);

  const validateForm = (): boolean => {
    const errors: Partial<ForgotPasswordFormData> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(forgotPassword(formData.email)).unwrap();
      setIsEmailSent(true);
    } catch (error) {
      // Error is stored in Redux state and will be displayed in the error view
      console.log('Forgot password failed:', error);
    }
  };

  const handleInputChange = (field: keyof ForgotPasswordFormData, value: string) => {
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

  if (isEmailSent) {
    return (
      <View className="flex-1 bg-white px-6 justify-center">
        <View className="items-center">
          <View className="w-20 h-20 bg-success-100 rounded-full items-center justify-center mb-6">
            <Text className="text-success-600 text-2xl">✓</Text>
          </View>
          
          <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Check Your Email
          </Text>
          
          <Text className="text-gray-600 text-center mb-8 leading-6">
            We've sent password reset instructions to{'\n'}
            <Text className="font-semibold">{formData.email}</Text>
          </Text>
          
          <Button
            title="Back to Sign In"
            onPress={onNavigateToLogin}
            testID="back-to-login-button"
            className="w-full"
          />
          
          <Button
            title="Resend Email"
            onPress={handleForgotPassword}
            variant="ghost"
            loading={isLoading}
            disabled={isLoading}
            testID="resend-email-button"
            className="mt-4"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-20 pb-8">
        {/* Header */}
        <View className="items-center mb-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Forgot Password?
          </Text>
          <Text className="text-gray-600 text-center">
            Enter your email address and we'll send you instructions to reset your password
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
            testID="forgot-password-email-input"
          />

          {error && (
            <View className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <Text className="text-error-600 text-sm text-center">
                {error}
              </Text>
            </View>
          )}

          <Button
            title="Send Reset Instructions"
            onPress={handleForgotPassword}
            loading={isLoading}
            disabled={isLoading}
            testID="forgot-password-submit-button"
            className="mb-4"
          />
        </View>

        {/* Footer */}
        <View className="items-center">
          <Text className="text-gray-600 mb-4">
            Remember your password?
          </Text>
          <Button
            title="Back to Sign In"
            onPress={onNavigateToLogin}
            variant="outline"
            testID="navigate-to-login-button"
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default ForgotPasswordScreen;