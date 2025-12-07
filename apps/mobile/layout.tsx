import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
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

  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <MainAppNavigator />
      </View>
    </SafeAreaProvider>
  );
}
