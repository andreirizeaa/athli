import { StyleSheet, View, ActivityIndicator, Modal } from 'react-native';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';

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
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: 120,
    height: 120,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
