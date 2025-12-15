import { View, StyleSheet } from 'react-native';
import Camera from '@/components/camera/camera';
import { DarkModeWrapper, useDarkModeTheme } from '@/components/dark-mode-wrapper';

function CameraPageContent() {
  const { colors: themeColors } = useDarkModeTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Camera />
    </View>
  );
}

export default function CameraPage() {
  return (
    <DarkModeWrapper>
      <CameraPageContent />
    </DarkModeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
