import { StyleSheet, View, Text, Platform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';
import { LinearGradient } from 'expo-linear-gradient';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useTranslations, useThemePreference } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslations();
  const { colors: themeColors } = useThemePreference();
  const router = useRouter();

  const handleContinuePress = () => {
    router.push('/modals/auth/sign-in-modal');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1c1c1e', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <SquircleView
              style={styles.squircle}
              cornerSmoothing={1}
            >
              <Image
                source={require('@/assets/app-icons/splash-icon-light.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </SquircleView>
          </View>

          <Text style={styles.motto}>
            ELEVATE YOUR{'\n'}POTENTIAL.
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
