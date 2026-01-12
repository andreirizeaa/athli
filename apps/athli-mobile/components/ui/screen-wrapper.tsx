import { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '@/stores';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';

type ScreenWrapperProps = {
  children: ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  blurIntensity?: number;
  blurHeight?: number;
  overlay?: ReactNode;
  hideStatusBarBlur?: boolean;
};

export const ScreenWrapper = ({
  children,
  scrollable = true,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  blurIntensity = 5,
  blurHeight = 0,
  overlay,
  hideStatusBarBlur = false,
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
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          >
            <View style={{ height: insets.top }} />
            {children}
          </ScrollView>
          {overlay}
          {!hideStatusBarBlur && <StatusBarBlur intensity={blurIntensity} blurHeight={blurHeight} />}
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
