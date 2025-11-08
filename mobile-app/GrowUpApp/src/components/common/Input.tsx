import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { InputProps } from '../../types';

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  className = '',
  testID,
}) => {
  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text className="text-gray-700 text-sm font-medium mb-2">
          {label}
        </Text>
      )}
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        testID={testID}
        className={`
          border rounded-lg px-4 py-3 text-base
          ${error 
            ? 'border-error-500 bg-error-50' 
            : 'border-gray-300 bg-white focus:border-primary-500'
          }
          ${multiline ? 'text-top' : ''}
        `.trim()}
        placeholderTextColor="#9ca3af"
      />
      
      {error && (
        <Text className="text-error-500 text-sm mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};

export default Input;