import { X } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReanimatedAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';

interface AnimatedHowItWorksItemProps {
  children: React.ReactNode;
  delay: number;
}

function AnimatedHowItWorksItem({ children, delay }: AnimatedHowItWorksItemProps) {
  const translateY = useSharedValue(delay === 0 ? 0 : 30);
  const opacity = useSharedValue(delay === 0 ? 1 : 0);

  React.useEffect(() => {
    // If delay is 0, don't animate - show immediately
    if (delay === 0) return;

    // Animate in with a staggered delay
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.6,
      })
    );

    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 25,
        stiffness: 200,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return <ReanimatedAnimated.View style={animatedStyle}>{children}</ReanimatedAnimated.View>;
}

interface HowItWorksScreenProps {
  onClose: () => void;
}

export function HowItWorksScreen({ onClose }: HowItWorksScreenProps) {
  const handleClose = () => {
    hapticFeedback.selection();
    onClose();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('feedback.howItWorks')}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
            <X size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          <View style={styles.howItWorksContainer}>
            <View style={styles.howItWorksItems}>
              <AnimatedHowItWorksItem delay={0}>
                <View style={styles.howItWorksItem}>
                  <View style={styles.howItWorksIcon}>
                    <Text style={styles.howItWorksNumber}>1</Text>
                  </View>
                  <View style={styles.howItWorksContent}>
                    <Text style={styles.howItWorksText}>{i18n.t('feedback.step1')}</Text>
                  </View>
                </View>
              </AnimatedHowItWorksItem>

              <AnimatedHowItWorksItem delay={100}>
                <View style={styles.howItWorksItem}>
                  <View style={styles.howItWorksIcon}>
                    <Text style={styles.howItWorksNumber}>2</Text>
                  </View>
                  <View style={styles.howItWorksContent}>
                    <Text style={styles.howItWorksText}>{i18n.t('feedback.step2')}</Text>
                  </View>
                </View>
              </AnimatedHowItWorksItem>

              <AnimatedHowItWorksItem delay={200}>
                <View style={styles.howItWorksItem}>
                  <View style={styles.howItWorksIcon}>
                    <Text style={styles.howItWorksNumber}>3</Text>
                  </View>
                  <View style={styles.howItWorksContent}>
                    <Text style={styles.howItWorksText}>{i18n.t('feedback.step3')}</Text>
                  </View>
                </View>
              </AnimatedHowItWorksItem>

              <AnimatedHowItWorksItem delay={300}>
                <View style={styles.howItWorksItem}>
                  <View style={styles.howItWorksIcon}>
                    <Text style={styles.howItWorksNumber}>4</Text>
                  </View>
                  <View style={styles.howItWorksContent}>
                    <Text style={styles.howItWorksText}>{i18n.t('feedback.step4')}</Text>
                  </View>
                </View>
              </AnimatedHowItWorksItem>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  howItWorksContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  howItWorksItems: {
    width: '100%',
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 44,
  },
  howItWorksIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  howItWorksNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  howItWorksContent: {
    flex: 1,
  },
  howItWorksText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    lineHeight: 24,
  },
});
