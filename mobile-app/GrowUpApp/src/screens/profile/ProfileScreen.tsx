import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppSelector, useAppDispatch } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  type: 'navigation' | 'toggle';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline' as const,
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          type: 'navigation' as const,
          onPress: () => console.log('Edit Profile'),
        },
        {
          icon: 'lock-closed-outline' as const,
          title: 'Change Password',
          subtitle: 'Update your security credentials',
          type: 'navigation' as const,
          onPress: () => console.log('Change Password'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline' as const,
          title: 'Notifications',
          subtitle: 'Manage your notification preferences',
          type: 'toggle' as const,
          value: notifications,
          onToggle: setNotifications,
        },
        {
          icon: 'moon-outline' as const,
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          type: 'toggle' as const,
          value: darkMode,
          onToggle: setDarkMode,
        },
      ],
    },
    {
      title: 'History',
      items: [
        {
          icon: 'time-outline' as const,
          title: 'Skin Analysis History',
          subtitle: 'View your past skin analyses',
          type: 'navigation' as const,
          onPress: () => console.log('Skin History'),
        },
        {
          icon: 'cut-outline' as const,
          title: 'Hair Try-On History',
          subtitle: 'See your saved hairstyles',
          type: 'navigation' as const,
          onPress: () => console.log('Hair History'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline' as const,
          title: 'Help & Support',
          subtitle: 'Get help with using the app',
          type: 'navigation' as const,
          onPress: () => console.log('Help'),
        },
        {
          icon: 'information-circle-outline' as const,
          title: 'About',
          subtitle: 'Learn more about GlowUp',
          type: 'navigation' as const,
          onPress: () => console.log('About'),
        },
      ],
    },
  ];

  const SettingItem = ({ item, index }: { item: SettingItem; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
    >
      <TouchableOpacity
        onPress={item.type === 'navigation' ? item.onPress : undefined}
        disabled={item.type === 'toggle'}
        className="bg-white px-4 py-4 flex-row items-center justify-between border-b border-gray-100"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4">
            <Ionicons name={item.icon} size={20} color="#0284c7" />
          </View>
          
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-900">{item.title}</Text>
            {item.subtitle && (
              <Text className="text-sm text-gray-500 mt-0.5">{item.subtitle}</Text>
            )}
          </View>
        </View>
        
        {item.type === 'navigation' && (
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
        
        {item.type === 'toggle' && item.onToggle && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={item.value ? '#0284c7' : '#f3f4f6'}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.springify()}
          className="bg-gradient-to-b from-primary-600 to-primary-700 px-6 pt-14 pb-8"
        >
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-white items-center justify-center mb-4 shadow-lg">
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Ionicons name="person" size={48} color="#0284c7" />
              )}
            </View>
            
            <Text className="text-2xl font-bold text-white mb-1">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-primary-100 mb-4">{user?.email}</Text>
            
            <TouchableOpacity className="bg-white px-6 py-2 rounded-full">
              <Text className="text-primary-600 font-medium">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="px-6 -mt-6 mb-6"
        >
          <View className="bg-white rounded-2xl shadow-lg p-4">
            <View className="flex-row">
              <View className="flex-1 items-center border-r border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">12</Text>
                <Text className="text-sm text-gray-500 mt-1">Analyses</Text>
              </View>
              <View className="flex-1 items-center border-r border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">8</Text>
                <Text className="text-sm text-gray-500 mt-1">Try-Ons</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-gray-900">5</Text>
                <Text className="text-sm text-gray-500 mt-1">Saved</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={section.title} className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase px-6 mb-3">
              {section.title}
            </Text>
            <View className="bg-white">
              {section.items.map((item, index) => (
                <SettingItem
                  key={item.title}
                  item={item}
                  index={sectionIndex * 10 + index}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          className="px-6 pb-8"
        >
          <TouchableOpacity
            onPress={handleLogout}
            disabled={isLoading}
            className="bg-red-50 border border-red-200 rounded-xl py-4 items-center"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text className="text-red-600 font-semibold ml-2">
                {isLoading ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* App Version */}
        <View className="items-center pb-6">
          <Text className="text-gray-400 text-sm">GlowUp v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
