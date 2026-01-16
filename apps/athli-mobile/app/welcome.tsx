import { StyleSheet, View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';
import { useEffect, useRef } from 'react';

import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';

export default function WelcomeScreen() {
  const { t } = useTranslations();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStartedPress = () => {
    // TODO: Navigate to get started flow
  };

  const handleSignInPress = () => {
    router.push('/modals/auth/sign-in-modal');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.appName}>ATHLI</Text>
          <Text style={styles.tagline}>
            {t('welcome.title')}
          </Text>
        </Animated.View>

        {/* Button Section */}
        <Animated.View
          style={[
            styles.buttonContainer,
            { opacity: fadeAnim },
          ]}
        >
          <PressableScale
            style={styles.filledButton}
            onPress={handleGetStartedPress}
          >
            <Text style={styles.filledButtonText}>
              {t('welcome.getStarted')}
            </Text>
          </PressableScale>

          <PressableScale
            style={styles.outlinedButton}
            onPress={handleSignInPress}
          >
            <Text style={styles.outlinedButtonText}>
              {t('welcome.alreadyHaveAccount')}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 50,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  appName: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
    color: '#000000',
    marginBottom: 16,
  },
  tagline: {
    ...typography.h5,
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'center',
    color: '#666666',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  buttonContainer: {
    gap: 12,
    paddingHorizontal: 24,
  },
  filledButton: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  filledButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  outlinedButton: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  outlinedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.3,
  },
});
