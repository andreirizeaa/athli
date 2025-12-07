import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigationBar } from '../components/ui/BottomNavigationBar';
import { TranslucentStatusBar } from '../components/ui/TranslucentStatusBar';
import { HomeScreen } from '../screens/application/home/HomeScreen';
import { PerformanceScreen } from '../screens/application/performance/PerformanceScreen';
import { SettingsScreen } from '../screens/application/settings/SettingsScreen';

// Types for navigation
export type MainTabParamList = {
  Home: undefined;
  Performance: undefined;
  Settings: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// Wrapper components for screens
function HomeScreenWrapper() {
  return <HomeScreen />;
}

function SettingsScreenWrapper() {
  return <SettingsScreen />;
}

function PerformanceScreenWrapper() {
  return <PerformanceScreen />;
}

// Main tabs navigator with custom bottom navigation
function MainTabsNavigator() {
  const [activeTab, setActiveTab] = React.useState<'home' | 'progress' | 'settings'>('home');

  const handleTabPress = (tab: 'home' | 'progress' | 'settings') => {
    setActiveTab(tab);
  };

  const handleAddPress = () => {
    // Empty handler for add button
  };

  const renderScreenContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreenWrapper />;
      case 'progress':
        return <PerformanceScreenWrapper />;
      case 'settings':
        return <SettingsScreenWrapper />;
      default:
        return <HomeScreenWrapper />;
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#e2e8f0', '#ffffff']}
        locations={[0, 0.9]}
        style={styles.container}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <TranslucentStatusBar tint="light" />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>{renderScreenContent()}</View>

          <BottomNavigationBar
            activeTab={activeTab}
            onTabPress={handleTabPress}
            onAddPress={handleAddPress}
          />
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

// Main stack navigator
export function MainAppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs">
          {() => <MainTabsNavigator />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
});
