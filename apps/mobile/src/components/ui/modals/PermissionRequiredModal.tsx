import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { X } from 'lucide-react-native';
import { track } from '../../../services/analytics';

interface PermissionRequiredModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAllow: () => void;
}

export function PermissionRequiredModal({
  isVisible,
  onClose,
  onAllow,
}: PermissionRequiredModalProps) {
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const [isLoading, setIsLoading] = React.useState(false);
  const fadeOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      fadeOpacity.setValue(0);
      Animated.timing(fadeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(fadeOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setShouldRender(false);
      }
    );
  }, [isVisible, fadeOpacity]);

  // Track when modal appears
  React.useEffect(() => {
    if (isVisible) {
      track('Add analysis', { event: 'Permission required' });
    }
  }, [isVisible]);

  const handleAllow = () => {
    hapticFeedback.selection();
    setIsLoading(true);
    onClose();
    setTimeout(() => {
      try {
        onAllow();
        setIsLoading(false);
      } catch (_) {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleCancel = () => {
    hapticFeedback.selection();
    onClose();
  };

  return (
    <Modal visible={shouldRender} transparent onRequestClose={handleCancel}>
      <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleCancel}>
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
              <X size={20} color="#000000" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>{i18n.t('upload.permissionRequired')}</Text>

            {/* Message */}
            <Text style={styles.message}>{i18n.t('upload.mediaPermissionDialogText')}</Text>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonOutlined]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonOutlinedText}>{i18n.t('feedback.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleAllow}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>{i18n.t('upload.allow')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'left',
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'left',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 60,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonOutlined: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  buttonPrimary: {
    backgroundColor: '#000000',
  },
  buttonOutlinedText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  buttonPrimaryText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
