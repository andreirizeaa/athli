import React, { useState } from 'react';
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
import { track } from '../../../services/analytics';

interface DuplicateVideoModalProps {
  isVisible: boolean;
  onClose: () => void;
  onViewAnalysis: () => Promise<void> | void;
  onSelectNewVideo: () => Promise<void> | void;
  isProcessing?: boolean; // New prop to distinguish between completed and processing duplicates
}

export function DuplicateVideoModal({
  isVisible,
  onClose,
  onViewAnalysis,
  onSelectNewVideo,
  isProcessing = false,
}: DuplicateVideoModalProps) {
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const fadeOpacity = React.useRef(new Animated.Value(0)).current;

  // Track when modal appears
  React.useEffect(() => {
    if (isVisible) {
      track('Add analysis', { event: 'Duplicate' });
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

  const handleViewAnalysis = async () => {
    hapticFeedback.selection();
    // Track add analysis clicks for duplicate view existing
    track('Add analysis', { event: 'Duplicate, view existing' });
    setIsLoadingAnalysis(true);
    try {
      await onViewAnalysis();
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleSelectNewVideo = async () => {
    hapticFeedback.selection();
    // Track add analysis clicks for duplicate select new
    track('Add analysis', { event: 'Duplicate, select new' });
    onClose();
    // Call onSelectNewVideo immediately after closing the modal
    try {
      await onSelectNewVideo();
    } catch (_) {}
  };

  const handleClose = () => {
    hapticFeedback.selection();
    setIsLoadingAnalysis(false);
    onClose();
  };

  // Reset loading state when modal closes
  React.useEffect(() => {
    if (!isVisible) {
      setIsLoadingAnalysis(false);
    }
  }, [isVisible]);

  return (
    <Modal visible={shouldRender} transparent onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={20} color="#000000" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>
              {isProcessing
                ? i18n.t('upload.duplicateVideoProcessing')
                : i18n.t('upload.duplicateVideo')}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {isProcessing
                ? i18n.t('upload.duplicateVideoProcessingMessage')
                : i18n.t('upload.duplicateVideoMessage')}
            </Text>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              {isProcessing ? (
                // For processing duplicates, only show "Select New Video" button (full width)
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, styles.buttonFullWidth]}
                  onPress={handleSelectNewVideo}
                >
                  <Text style={styles.buttonPrimaryText}>{i18n.t('upload.selectNewVideo')}</Text>
                </TouchableOpacity>
              ) : (
                // For completed duplicates, show both buttons
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonOutlined]}
                    onPress={handleSelectNewVideo}
                  >
                    <Text style={styles.buttonOutlinedText}>{i18n.t('upload.selectNewVideo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonPrimary,
                      isLoadingAnalysis && styles.buttonDisabled,
                    ]}
                    onPress={handleViewAnalysis}
                    disabled={isLoadingAnalysis}
                  >
                    {isLoadingAnalysis ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonPrimaryText}>{i18n.t('upload.viewAnalysis')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonFullWidth: {
    flex: 1,
  },
});
