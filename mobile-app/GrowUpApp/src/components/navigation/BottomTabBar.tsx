import React from 'react';
import { View, TouchableOpacity, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 4;

export type TabName = 'skin' | 'hair' | 'products' | 'profile';

interface Tab {
  name: TabName;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface BottomTabBarProps {
  currentTab: TabName;
  onTabPress: (tab: TabName) => void;
}

const tabs: Tab[] = [
  { name: 'skin', icon: 'sparkles', label: 'Skin' },
  { name: 'hair', icon: 'cut', label: 'Hair' },
  { name: 'products', icon: 'cart', label: 'Products' },
  { name: 'profile', icon: 'person', label: 'Profile' },
];

const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab, onTabPress }) => {
  const tabIndex = tabs.findIndex(tab => tab.name === currentTab);
  const translateX = useSharedValue(tabIndex * TAB_WIDTH);

  React.useEffect(() => {
    const index = tabs.findIndex(tab => tab.name === currentTab);
    translateX.value = withSpring(index * TAB_WIDTH, {
      damping: 20,
      stiffness: 120,
    });
  }, [currentTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="bg-white border-t border-gray-200 shadow-lg">
      {/* Animated Indicator */}
      <Animated.View
        className="absolute top-0 bg-primary-600"
        style={[
          indicatorStyle,
          {
            width: TAB_WIDTH,
            height: 3,
          },
        ]}
      />

      <View className="flex-row h-20 pb-safe">
        {tabs.map((tab, index) => {
          const isActive = currentTab === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => onTabPress(tab.name)}
              className={`flex-1 items-center justify-center`}
              activeOpacity={0.7}
            >
              <View className="items-center">
                <Ionicons
                  name={isActive ? tab.icon : `${tab.icon}-outline` as any}
                  size={24}
                  color={isActive ? '#0284c7' : '#9ca3af'}
                />
                <Text
                  className={`text-xs mt-1 ${
                    isActive ? 'text-primary-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BottomTabBar;
