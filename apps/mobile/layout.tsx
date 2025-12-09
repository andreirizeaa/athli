import React from 'react';
import { Platform, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { MainAppNavigator } from './src/navigation/MainAppNavigator';
import { useTheme } from './src/context/ThemeContext';

// Keep splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

export function Layout() {
  const { colors } = useTheme();

  React.useEffect(() => {
    // Hide splash screen after a short delay
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Configure Android navigation bar for edge-to-edge
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('absolute');
      NavigationBar.setBackgroundColorAsync('#00000000');
    }
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <MainAppNavigator />
    </View>
  );
}
