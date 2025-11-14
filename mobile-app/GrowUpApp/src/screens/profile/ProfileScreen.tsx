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
import { UserApi } from '../../api';
import EditProfileModal from '../../components/profile/EditProfileModal';
import ChangePasswordModal from '../../components/profile/ChangePasswordModal';
import HistoryModal from '../../components/profile/HistoryModal';
import { useTheme } from '../../context/ThemeContext';

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
  const { isDarkMode, setDarkModePreference } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyTab, setHistoryTab] = useState<'skin' | 'hair'>('skin');

  const handleDarkModeToggle = async (value: boolean) => {
    const previous = isDarkMode;

    try {
      await setDarkModePreference(value);

      if (user?.id) {
        const currentPreferences = await UserApi.getPreferences(user.id).catch(() => null);
        await UserApi.updatePreferences(user.id, {
          ...currentPreferences,
          preferences: {
            ...(currentPreferences?.preferences || {}),
            darkMode: value,
            theme: value ? 'dark' : 'light',
          },
        });
      }
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
      try {
        await setDarkModePreference(previous);
      } catch (revertError) {
        console.error('Error reverting theme preference:', revertError);
      }
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const openHistory = (tab: 'skin' | 'hair') => {
    setHistoryTab(tab);
    setHistoryVisible(true);
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
          onPress: () => setEditProfileVisible(true),
        },
        {
          icon: 'lock-closed-outline' as const,
          title: 'Change Password',
          subtitle: 'Update your security credentials',
          type: 'navigation' as const,
          onPress: () => setChangePasswordVisible(true),
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
          value: isDarkMode,
          onToggle: handleDarkModeToggle,
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
          onPress: () => openHistory('skin'),
        },
        {
          icon: 'cut-outline' as const,
          title: 'Hair Try-On History',
          subtitle: 'See your saved hairstyles',
          type: 'navigation' as const,
          onPress: () => openHistory('hair'),
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
  className="bg-white dark:bg-gray-900 px-4 py-4 flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-b-0"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mr-4">
            <Ionicons name={item.icon} size={20} color="#0284c7" />
          </View>
          
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100">{item.title}</Text>
            {item.subtitle && (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.subtitle}</Text>
            )}
          </View>
        </View>
        
        {item.type === 'navigation' && (
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#6b7280' : '#9ca3af'} />
        )}
        
        {item.type === 'toggle' && item.onToggle && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: isDarkMode ? '#4b5563' : '#d1d5db', true: '#3b82f6' }}
            thumbColor={item.value ? '#0284c7' : isDarkMode ? '#1f2937' : '#f3f4f6'}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.springify()}
          className="bg-gradient-to-b from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-900 px-6 pt-14 pb-10 rounded-b-3xl shadow"
        >
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-white dark:bg-gray-900 items-center justify-center mb-5 shadow-lg">
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Ionicons name="person" size={48} color="#0284c7" />
              )}
            </View>

            <Text
              className="text-3xl font-semibold text-white tracking-tight mb-1"
              style={{ textShadowColor: 'rgba(15, 23, 42, 0.35)', textShadowRadius: 6 }}
            >
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName || user?.lastName || user?.email || 'User'}
            </Text>
            <Text className="text-base text-primary-50/90 dark:text-primary-100 mb-6">
              {user?.email}
            </Text>

            <TouchableOpacity
              className="bg-white/90 dark:bg-primary-900/40 px-6 py-2 rounded-full shadow-sm"
              onPress={() => setEditProfileVisible(true)}
              activeOpacity={0.85}
            >
              <Text className="text-primary-600 dark:text-primary-200 font-semibold">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={section.title} className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase px-6 mb-3">
              {section.title}
            </Text>
            <View className="bg-white dark:bg-gray-900 mx-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
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
            className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl py-4 items-center"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="log-out-outline"
                size={20}
                color={isDarkMode ? '#fca5a5' : '#dc2626'}
              />
              <Text className="text-red-600 dark:text-red-200 font-semibold ml-2">
                {isLoading ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* App Version */}
        <View className="items-center pb-6">
          <Text className="text-gray-400 dark:text-gray-600 text-sm">GlowUp v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => {
          setEditProfileVisible(false);
        }}
      />
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />
      <HistoryModal
        visible={historyVisible}
        initialTab={historyTab}
        userId={user?.id}
        onClose={() => setHistoryVisible(false)}
      />
    </View>
  );
};

export default ProfileScreen;
