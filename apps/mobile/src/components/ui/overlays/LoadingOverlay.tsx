import React from 'react';
import { View, StyleSheet, ActivityIndicator, Modal } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: 'rgba(50, 50, 50, 0.95)' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  container: {
    width: 85,
    height: 85,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
    paddingTop: 8,
    paddingBottom: 2,
  },
});
