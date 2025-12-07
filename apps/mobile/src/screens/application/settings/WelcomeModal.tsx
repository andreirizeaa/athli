import React from 'react';
import { View, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { OrangeGradientButton } from '../../../components/ui/buttons/OrangeGradientButton';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { track } from '../../../services/analytics';

interface WelcomeModalProps {
  isVisible: boolean;
  onGetStarted: () => void;
}

export function WelcomeModal({ isVisible, onGetStarted }: WelcomeModalProps) {
  const confettiRef = React.useRef<LottieView>(null as any);

  React.useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      try {
        confettiRef.current?.reset?.();
        confettiRef.current?.play?.();
      } catch {}
    }, 50);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleGetStarted = () => {
    track('Tutorials', { data: 'welcome' });

    hapticFeedback.success();
    onGetStarted();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        {/* Full-screen confetti behind the modal */}
        <View style={styles.fullscreenConfettiContainer} pointerEvents="none">
          <LottieView
            source={require('../../../../assets/animations/confetti.json')}
            autoPlay={false}
            loop={false}
            resizeMode="cover"
            ref={confettiRef}
            style={{ width: 700, height: 700 }}
          />
        </View>
        <View style={[styles.modalContainer, { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.title, { color: '#000000' }]}>{i18n.t('welcome.modal.title')}</Text>
          <Text style={[styles.message, { color: '#000000' }]}>
            {i18n.t('welcome.modal.message')}
          </Text>

          <View style={styles.footer}>
            <OrangeGradientButton
              title={i18n.t('welcome.modal.ctaButton')}
              onPress={handleGetStarted}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'left',
  },
  footer: {
    marginTop: 8,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0, // Behind the text and button content
  },
  confetti: {
    width: '150%',
    height: '150%',
  },
  fullscreenConfettiContainer: {
    position: 'absolute',
    top: 0,
    left: -16,
    right: -16,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
});
