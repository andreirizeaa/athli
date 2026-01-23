import { StyleSheet, View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';
import { LinearGradient } from 'expo-linear-gradient';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';

export default function WelcomeScreen() {
  const { t } = useTranslations();
  const { colors: themeColors } = useThemePreference();
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
        </View>

        <View style={styles.footer}>
          <PressableScale
            style={[styles.button, { backgroundColor: '#FFFFFF' }]}
            onPress={handleContinuePress}
          >
            <Text style={styles.buttonText}>
              {t('general.continue')}
            </Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
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
    gap: 48,
  },
  imageContainer: {
    marginBottom: 0,
  },
  squircle: {
    width: 180,
    height: 180,
    borderRadius: 50, // Approx 25% of size for iOS feel
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle white glow shadow with elevation
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 12,
  },
  heroImage: {
    width: 200,
    height: 200,
  },
  motto: {
    ...typography.h1,
    fontSize: 56,
    lineHeight: 60,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.h6,
    fontWeight: '700',
  },
});
