import { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '@/contexts/useColorScheme';
import { StatusBarBlur } from '@/components/status-bar-blur';

type ScreenWrapperProps = {
  children: ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  blurIntensity?: number;
  blurHeight?: number;
  overlay?: ReactNode;
};

export const ScreenWrapper = ({
  children,
  scrollable = true,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  blurIntensity = 5,
  blurHeight = 0,
  overlay,
}: ScreenWrapperProps) => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();

  if (scrollable) {
    return (
      <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
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
              { paddingTop: insets.top + 16 },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          >
            {children}
          </ScrollView>
          {overlay}
          <StatusBarBlur intensity={blurIntensity} blurHeight={blurHeight} />
        </View>
      </View>
    );
  }

  // Static layout (no ScrollView)
  return (
    <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 16,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
          },
        ]}
      >
        {children}
      </View>
      {overlay}
      <StatusBarBlur intensity={blurIntensity} blurHeight={blurHeight} />
    </View>
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
