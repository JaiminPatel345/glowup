import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { Button, Input } from '../../components/common';
import { RegisterFormData } from '../../types';
import { validateEmail, validatePassword } from '../../utils';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<RegisterFormData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<RegisterFormData> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const { confirmPassword, ...registerData } = formData;
      await dispatch(registerUser(registerData)).unwrap();
      // Navigation will be handled by the parent component based on auth state
    } catch (error) {
      // Error is stored in Redux state and will be displayed in the error view
      // Form data is preserved, user stays on the register screen
      console.log('Registration failed:', error);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
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
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </Text>
          <Text className="text-gray-600 text-center">
            Join GrowUp and start your beauty journey
          </Text>
        </View>

        {/* Form */}
        <View className="mb-8">
          <Input
            label="First Name"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
            error={formErrors.firstName}
            autoCapitalize="words"
            testID="register-firstname-input"
          />

          <Input
            label="Last Name"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
            error={formErrors.lastName}
            autoCapitalize="words"
            testID="register-lastname-input"
          />

          <Input
            label="Email Address"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="register-email-input"
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            error={formErrors.password}
            secureTextEntry
            testID="register-password-input"
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            error={formErrors.confirmPassword}
            secureTextEntry
            testID="register-confirm-password-input"
          />

          {error && (
            <View className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <Text className="text-error-600 text-sm text-center">
                {error}
              </Text>
            </View>
          )}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            testID="register-submit-button"
            className="mb-4"
          />
        </View>

        {/* Footer */}
        <View className="items-center">
          <Text className="text-gray-600 mb-4">
            Already have an account?
          </Text>
          <Button
            title="Sign In"
            onPress={onNavigateToLogin}
            variant="outline"
            testID="navigate-to-login-button"
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default RegisterScreen;