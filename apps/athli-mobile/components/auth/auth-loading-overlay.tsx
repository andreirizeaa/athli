import { StyleSheet, View, ActivityIndicator, Modal } from 'react-native';
import { useThemePreference } from '@/stores';

type AuthLoadingOverlayProps = {
  visible: boolean;
};

export const AuthLoadingOverlay = ({ visible }: AuthLoadingOverlayProps) => {
  const { colors: themeColors } = useThemePreference();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: themeColors.surface },
          ]}
        >
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
