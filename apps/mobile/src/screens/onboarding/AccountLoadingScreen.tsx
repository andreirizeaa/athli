import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useUserDetails } from '../../context/UserDetailsContext';
import { appColors } from '../../constants/appColorScheme';

interface AccountLoadingScreenProps {
  onComplete: () => void | Promise<void>;
}

export function AccountLoadingScreen({ onComplete }: AccountLoadingScreenProps) {
  const { isUserDetailsLoaded } = useUserDetails();

  useEffect(() => {
    let hasCompleted = false;

    // Timer to ensure we don't wait forever - complete after 2 seconds regardless
    const maxTimer = setTimeout(async () => {
      if (!hasCompleted) {
        hasCompleted = true;
        await onComplete();
      }
    }, 2000);

    // If user details load before 2 seconds, still wait for the full 2 seconds for UX
    if (isUserDetailsLoaded) {
      const uiTimer = setTimeout(async () => {
        if (!hasCompleted) {
          hasCompleted = true;
          await onComplete();
        }
      }, 2000);

      return () => {
        clearTimeout(maxTimer);
        clearTimeout(uiTimer);
      };
    }

    return () => clearTimeout(maxTimer);
  }, [onComplete, isUserDetailsLoaded]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <LottieView
          speed={1}
          source={require('../../../assets/animations/loading.json')}
          autoPlay
          style={styles.lottieAnimation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.general.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 500,
    height: 500,
  },
});
