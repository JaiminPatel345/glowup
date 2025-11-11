import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import BottomTabBar, { TabName } from '../navigation/BottomTabBar';
import { SkinAnalysisScreen } from '../../screens/skin';
import { HairTryOnScreen } from '../../screens/hair';
import { ProductsScreen } from '../../screens/products';
import { ProfileScreen } from '../../screens/profile';

const MainNavigator: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabName>('skin');

  const renderScreen = () => {
    switch (currentTab) {
      case 'skin':
        return <SkinAnalysisScreen />;
      case 'hair':
        return <HairTryOnScreen />;
      case 'products':
        return <ProductsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <SkinAnalysisScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View className="flex-1 bg-gray-50">
        <Animated.View
          key={currentTab}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="flex-1"
        >
          {renderScreen()}
        </Animated.View>
        
        <BottomTabBar currentTab={currentTab} onTabPress={setCurrentTab} />
      </View>
    </SafeAreaView>
  );
};

export default MainNavigator;
