import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { useTutorialTarget } from '../../../context/TutorialContext';
import { Upload, Video } from 'lucide-react-native';
import { track } from '../../../services/analytics';

interface AddOptionsProps {
  isVisible: boolean;
  onUploadPress: () => void;
  onRecordPress: () => void;
  onClose: () => void;
}

export function AddOptions({ isVisible, onUploadPress, onRecordPress, onClose }: AddOptionsProps) {
  const { ref: uploadButtonRef } = useTutorialTarget('add_options_upload');
  const [shouldRender, setShouldRender] = React.useState(isVisible);
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

  if (!shouldRender) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeOpacity }]}>
      <TouchableOpacity
        style={styles.darkOverlay}
        onPress={() => {
          onClose();
        }}
        activeOpacity={1}
      >
        <View style={styles.cardsContainer}>
          {/* Upload Video Card */}
          <TouchableOpacity
            ref={uploadButtonRef}
            style={styles.card}
            onPress={() => {
              hapticFeedback.selection();
              // Track add analysis clicks for upload
              track('Add analysis', { event: 'Upload' });
              onUploadPress();
            }}
          >
            <View style={styles.iconContainer}>
              <Upload width={32} height={32} color="currentColor" />
            </View>
            <Text style={styles.cardTitle}>{i18n.t('add.uploadVideo')}</Text>
          </TouchableOpacity>

          {/* Record Video Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              hapticFeedback.selection();
              // Track add analysis clicks for record
              track('Add analysis', { event: 'Record' });
              onRecordPress();
            }}
          >
            <View style={styles.iconContainer}>
              <Video width={32} height={32} color="currentColor" />
            </View>
            <Text style={styles.cardTitle}>{i18n.t('add.recordVideo')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 120,
    paddingRight: 40,
  },
  cardsContainer: {
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
