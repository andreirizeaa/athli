import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { X } from 'lucide-react-native';

interface DeleteAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({ isVisible, onClose, onConfirm }: DeleteAccountModalProps) {
  const [isAcknowledgementStep, setIsAcknowledgementStep] = React.useState(false);
  const [hasAcknowledged, setHasAcknowledged] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isInitialDelay, setIsInitialDelay] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const fadeOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!isVisible) {
      setIsAcknowledgementStep(false);
      setHasAcknowledged(false);
      setIsDeleting(false);
      setIsInitialDelay(false);
    }
  }, [isVisible]);

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

  // Handle initial 1-second delay when user acknowledges (before final delete button)
  React.useEffect(() => {
    if (hasAcknowledged) {
      setIsInitialDelay(true);
      const timer = setTimeout(() => {
        setIsInitialDelay(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAcknowledged]);

  const handleAcknowledge = () => {
    hapticFeedback.selection();
    setHasAcknowledged(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      hapticFeedback.success();
    } catch {
      hapticFeedback.error();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={shouldRender} transparent onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                hapticFeedback.selection();
                onClose();
              }}
            >
              <X size={20} color="#000000" />
            </TouchableOpacity>

            <View style={styles.contentContainer}>
              {/* Title */}
              <Text style={styles.title}>{i18n.t('settings.deleteAccountTitle')}</Text>

              {/* Message */}
              {isAcknowledgementStep ? (
                <Text style={styles.message}>
                  {i18n.t('settings.deleteAccountSubscriptionWarning')}
                </Text>
              ) : (
                <Text style={styles.message}>{i18n.t('settings.deleteAccountMessage')}</Text>
              )}
            </View>

            {/* Action buttons - stick to bottom */}
            {isAcknowledgementStep ? (
              <View style={styles.acknowledgeContainer}>
                <TouchableOpacity
                  style={[
                    styles.acknowledgeButton,
                    hasAcknowledged && styles.deleteButton,
                    hasAcknowledged && isInitialDelay && styles.disabledButton,
                  ]}
                  onPress={hasAcknowledged ? handleDelete : handleAcknowledge}
                  activeOpacity={0.8}
                  disabled={isDeleting || (hasAcknowledged && isInitialDelay)}
                >
                  {hasAcknowledged && isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.acknowledgeButtonText,
                        hasAcknowledged && styles.deleteButtonText,
                      ]}
                    >
                      {hasAcknowledged
                        ? i18n.t('settings.deleteAccountButton')
                        : i18n.t('settings.iAcknowledge')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonOutlined]}
                  onPress={() => {
                    hapticFeedback.selection();
                    onClose();
                  }}
                >
                  <Text style={styles.buttonOutlinedText}>{i18n.t('settings.no')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setIsAcknowledgementStep(true);
                  }}
                >
                  <Text style={styles.buttonPrimaryText}>{i18n.t('settings.yes')}</Text>
                </TouchableOpacity>
              </View>
            )}
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
    height: 280,
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
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'left',
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 22,
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
  acknowledgeContainer: {
    marginTop: 4,
  },
  acknowledgeButton: {
    width: '100%',
    height: 60,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acknowledgeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: '#fb2c36',
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
