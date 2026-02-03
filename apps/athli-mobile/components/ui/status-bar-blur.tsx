import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/stores';

type StatusBarBlurProps = {
  intensity?: number;
  blurHeight?: number;
  largeHeader?: boolean;
};

export const StatusBarBlur = ({
  intensity = 5,
  blurHeight = 0,
  largeHeader = false,
}: StatusBarBlurProps) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  // Total height is just the status bar height
  const totalHeight = insets.top + blurHeight;

  const defaultColors = colorScheme === 'dark'
    ? ['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0)']
    : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0)'];
  const defaultLocations = [0, 0.2, 0.4, 0.65, 0.85, 1];

  const largeHeaderColors = colorScheme === 'dark'
    ? ['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0)']
    : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0)'];
  const largeHeaderLocations = [0, 0.3, 0.55, 0.8, 1];

  return (
    <LinearGradient
      colors={largeHeader ? largeHeaderColors : defaultColors}
      locations={largeHeader ? largeHeaderLocations : defaultLocations}
      style={[
        styles.gradient,
        {
          height: totalHeight,
          top: Platform.OS === 'ios' ? 0 : -insets.top,
        },
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
