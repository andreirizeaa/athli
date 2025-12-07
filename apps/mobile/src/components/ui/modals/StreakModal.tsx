import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { StreakCalendar } from '../StreakCalendar';
import { FormAILogo } from '../FormAILogo';

interface StreakModalProps {
  visible: boolean;
  currentStreak: number;
  onClose: () => void;
}

export function StreakModal({ visible, currentStreak, onClose }: StreakModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const streakTextTranslateY = useRef(new Animated.Value(50)).current;
  const streakTextOpacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);
  const fadeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      fadeOpacity.setValue(0);
      Animated.timing(fadeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      // Start the pulsing animation when modal becomes visible - faster pulses for 10 seconds
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 300, // Faster pulse - 300ms instead of 600ms
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300, // Faster pulse - 300ms instead of 600ms
            useNativeDriver: true,
          }),
        ]),
        { iterations: 16 } // Run for 10 seconds (9.6s animation + 0.4s buffer)
      );

      // Animate streak text floating in
      const streakTextAnimation = Animated.parallel([
        Animated.timing(streakTextTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(streakTextOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);

      pulseAnimation.start();
      streakTextAnimation.start();

      // Stop animation after 10 seconds
      const timer = setTimeout(() => {
        pulseAnimation.stop();
        pulseAnim.setValue(1);
      }, 3000);

      return () => {
        clearTimeout(timer);
        pulseAnimation.stop();
        streakTextAnimation.stop();
      };
    } else {
      // Reset animations when modal closes
      Animated.timing(fadeOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setShouldRender(false);
        }
      );
      pulseAnim.setValue(1);
      streakTextTranslateY.setValue(50);
      streakTextOpacity.setValue(0);
    }
  }, [visible, pulseAnim, streakTextTranslateY, streakTextOpacity, fadeOpacity]);

  const handleClose = () => {
    hapticFeedback.selection();
    onClose();
  };

  const handleContinue = () => {
    hapticFeedback.selection();
    onClose();
  };

  return (
    <Modal visible={shouldRender} transparent onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header with FormAI logo and streak pill */}
            <View style={styles.modalHeader}>
              <FormAILogo
                iconSize={24}
                containerStyle={styles.modalLogoContainer}
                textStyle={styles.modalLogoText}
              />
              <View style={styles.streakBadge}>
                <Image
                  source={require('../../../../assets/icons/fire.png')}
                  style={styles.streakBadgeIcon}
                  contentFit="contain"
                />
                <Text style={styles.streakBadgeText}>{currentStreak}</Text>
              </View>
            </View>

            {/* Large centered fire icon */}
            <View style={styles.fireModalContent}>
              <Animated.View
                style={[
                  styles.fireIconContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Image
                  source={require('../../../../assets/icons/fire.png')}
                  style={styles.fireModalIcon}
                  contentFit="contain"
                />
              </Animated.View>
            </View>

            {/* Streak text */}
            <Animated.View
              style={[
                styles.streakTextContainer,
                {
                  transform: [{ translateY: streakTextTranslateY }],
                  opacity: streakTextOpacity,
                },
              ]}
            >
              <Text style={styles.streakText}>
                {currentStreak === 0
                  ? i18n.t('home.zeroDayStreak')
                  : i18n.t('home.dayStreak', { count: currentStreak })}
              </Text>
            </Animated.View>

            {/* Streak Calendar */}
            <StreakCalendar />

            {/* Message */}
            <Text style={styles.message}>
              {currentStreak === 0 ? i18n.t('home.noStreakMessage') : i18n.t('home.onFireMessage')}
            </Text>

            {/* Action button */}
            <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
              <Text style={styles.buttonText}>{i18n.t('home.continue')}</Text>
            </TouchableOpacity>
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalLogoContainer: {
    marginBottom: 0,
  },
  modalLogoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SF Pro Display',
    marginBottom: 0,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  streakBadgeIcon: {
    width: 18,
    height: 18,
  },
  streakBadgeText: {
    marginLeft: 2,
    marginTop: 2,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'SF Pro Display',
  },
  fireModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 32,
  },
  fireIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireModalIcon: {
    width: 118,
    height: 118,
  },
  streakTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ed694a',
    fontFamily: 'SF Pro Display',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: -16,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 28,
    backgroundColor: '#ed694a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'SF Pro Display',
  },
});
