import { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference, useColorScheme } from '@/stores';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';

const darkBackground = require('@/assets/backgrounds/dark.png');
const lightBackground = require('@/assets/backgrounds/light.png');

type ScreenWrapperProps = {
  children: ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  blurIntensity?: number;
  blurHeight?: number;
  overlay?: ReactNode;
  hideStatusBarBlur?: boolean;
  scrollEnabled?: boolean;
};

export const ScreenWrapper = ({
  children,
  scrollable = true,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  blurIntensity = 15,
  blurHeight = 50,
  overlay,
  hideStatusBarBlur = false,
  scrollEnabled = true,
}: ScreenWrapperProps) => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const backgroundImage = colorScheme === 'dark' ? darkBackground : lightBackground;

  if (scrollable) {
    return (
      <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
        <View
          style={[
            styles.safeArea,
            {
              paddingBottom: 0,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              { paddingBottom: insets.bottom },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            scrollEnabled={scrollEnabled}
            keyboardDismissMode="on-drag"
          >
            <View style={{ height: insets.top }} />
            {children}
          </ScrollView>
          {overlay}
          {!hideStatusBarBlur && <StatusBarBlur intensity={blurIntensity} blurHeight={blurHeight} />}
        </View>
      </ImageBackground>
    );
  }

  // Static layout (no ScrollView)
  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {children}
      </View>
      {overlay}
      {!hideStatusBarBlur && <StatusBarBlur intensity={blurIntensity} blurHeight={blurHeight} />}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
