import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { ButtonProps } from '../../types';

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  testID,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return disabled 
          ? 'bg-gray-300' 
          : 'bg-primary-600 active:bg-primary-700';
      case 'secondary':
        return disabled 
          ? 'bg-gray-200' 
          : 'bg-secondary-600 active:bg-secondary-700';
      case 'outline':
        return disabled 
          ? 'border border-gray-300 bg-transparent' 
          : 'border border-primary-600 bg-transparent active:bg-primary-50';
      case 'ghost':
        return disabled 
          ? 'bg-transparent' 
          : 'bg-transparent active:bg-gray-100';
      default:
        return 'bg-primary-600 active:bg-primary-700';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2';
      case 'md':
        return 'px-4 py-3';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  };

  const getTextStyles = () => {
    const baseStyles = 'font-semibold text-center';
    
    if (variant === 'outline' || variant === 'ghost') {
      return `${baseStyles} ${disabled ? 'text-gray-400' : 'text-primary-600'}`;
    }
    
    return `${baseStyles} ${disabled ? 'text-gray-500' : 'text-white'}`;
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      className={`
        rounded-lg
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `.trim()}
    >
      <View className="flex-row items-center justify-center">
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'outline' || variant === 'ghost' ? '#0284c7' : '#ffffff'} 
            className="mr-2"
          />
        ) : icon ? (
          <View className="mr-2">{icon}</View>
        ) : null}
        
        <Text className={`${getTextStyles()} ${getTextSize()}`}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button;