import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Alert,
  ActivityIndicator,
  Keyboard,
  Linking,
} from 'react-native';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { showAlert } from '../../services/alertService';
import { openAppSettings } from '../../utils/openAppSettings';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as StoreReview from 'expo-store-review';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { validateReferralCode } from '../../services/referralService';
import { OnboardingLayout } from '../../components/layout/OnboardingLayout';
import { AnimatedOptionButton } from '../../components/ui/buttons/AnimatedOptionButton';
import { useOnboarding } from '../../context/OnboardingContext';
import { useLanguage } from '../../context/LanguageContext';
import { OnboardingData } from '../../types/onboarding';
import i18n from '../../utils/i18n';
import { hapticFeedback } from '../../utils/haptic';
import { LANGUAGES } from '../../constants/languages';
import { appColors } from '../../constants/appColorScheme';
import { CreateAccountScreen } from '../auth/CreateAccountScreen';
import { PermissionContainer } from '../../components/ui/PermissionContainer';
import LottieView from 'lottie-react-native';
import {
  BicepsFlexed,
  User,
  ShieldPlus,
  Bike,
  HeartPulse,
  AudioWaveform,
  ChartNoAxesColumnDecreasing,
  BookCopy,
  ShieldOff,
  BatteryLow,
  Ellipsis,
  Sprout,
  Shrub,
  TreePine,
  ChartNoAxesCombined,
  Hospital,
  Dumbbell,
  ShieldCheck,
  ChartNoAxesColumnIncreasing,
  ClockArrowUp,
  BatteryWarning,
  BatteryMedium,
  BatteryFull,
  PartyPopper,
  Weight,
  Scale,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Users,
  CircleCheck,
  Trophy,
  X,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { SingleDotIcon, SixDotsIcon, ThreeDotsIcon } from '../../components/icons/icons';
import { Line } from 'react-native-svg';
import { track } from '../../services/analytics';
import { setUserId } from '../../services/storageService';
import { fetchUserById } from '../../services/userService';
import { registerAndSaveExpoPushToken } from '../../services/push';
import { usePurchases } from '../../context/PurchasesContext';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingUnifiedScreenProps {}

interface AnimatedInfoCardProps {
  children: React.ReactNode;
  delay: number;
}

function AnimatedInfoCard({ children, delay }: AnimatedInfoCardProps) {
  const translateY = useSharedValue(delay === 0 ? 0 : 30);
  const opacity = useSharedValue(delay === 0 ? 1 : 0);

  useEffect(() => {
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

function AnimatedProgressTrackingImage() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Animate in with a nice scale and fade effect
    scale.value = withDelay(
      100,
      withSpring(1, {
        damping: 15,
        stiffness: 150,
        mass: 0.8,
      })
    );

    opacity.value = withDelay(
      100,
      withSpring(1, {
        damping: 20,
        stiffness: 200,
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.progressTrackingContainer}>
      <ReanimatedAnimated.View style={[styles.progressTrackingImage, animatedStyle]}>
        <Image
          source={require('../../../assets/onboarding/progress_tracking.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </ReanimatedAnimated.View>
    </View>
  );
}

function AnimatedGraphContainer({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    // Animate in with a staggered delay similar to AnimatedOptionButton
    translateY.value = withDelay(
      200,
      withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.6,
      })
    );

    opacity.value = withDelay(
      200,
      withSpring(1, {
        damping: 25,
        stiffness: 200,
      })
    );

    scale.value = withDelay(
      200,
      withSpring(1, {
        damping: 20,
        stiffness: 150,
        mass: 0.8,
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <ReanimatedAnimated.View style={[styles.graphContainer, animatedStyle]}>
      {children}
    </ReanimatedAnimated.View>
  );
}

interface StepOption<V> {
  value: V;
  label: string;
  description?: string;
  iconImage?: any; // ImageSourcePropType
  iconWidth?: number; // Custom icon width
  iconHeight?: number; // Custom icon height
  icon?: React.ReactNode; // Lucide icon component
}

type OptionsStepConfig<K extends keyof OnboardingData> = {
  type: 'options';
  id: string;
  title: string;
  subtitle?: string;
  preferenceKey: K;
  options: Array<StepOption<OnboardingData[K]>>;
};

interface MeasurementsStepConfig {
  type: 'measurements';
  id: string;
  title: string;
  subtitle?: string;
}

interface RatingStepConfig {
  type: 'rating';
  id: string;
  title: string;
  subtitle?: string;
}

interface ReferralStepConfig {
  type: 'referral';
  id: string;
  title: string;
  subtitle?: string;
}

interface CreateAccountStepConfig {
  type: 'saveProgress';
  id: string;
  title: string;
  subtitle?: string;
}

interface AllDoneStepConfig {
  type: 'allDone';
  id: string;
  title: string;
  subtitle?: string;
}

interface InfoStepConfig {
  type: 'info';
  id: string;
  title: string;
  subtitle?: string;
}

interface InjuryChanceInfoStepConfig {
  type: 'injuryChanceInfo';
  id: string;
  title: string;
  subtitle?: string;
}

interface PerfectFormGoalMessageStepConfig {
  type: 'perfectFormGoalMessage';
  id: string;
  title: string;
  subtitle?: string;
}

interface GraphStepConfig {
  type: 'graph';
  id: string;
  title: string;
  subtitle?: string;
}

interface GymChallengeInfoStepConfig {
  type: 'gymChallengeInfo';
  id: string;
  title: string;
  subtitle?: string;
}

interface NotificationPermissionStepConfig {
  type: 'notificationPermission';
  id: string;
  title: string;
  subtitle?: string;
}

interface CameraPermissionStepConfig {
  type: 'cameraPermission';
  id: string;
  title: string;
  subtitle?: string;
}

interface ProgressTrackingStepConfig {
  type: 'progressTracking';
  id: string;
  title: string;
  subtitle?: string;
}

type StepConfig =
  | OptionsStepConfig<keyof OnboardingData>
  | MeasurementsStepConfig
  | RatingStepConfig
  | ReferralStepConfig
  | CreateAccountStepConfig
  | AllDoneStepConfig
  | InfoStepConfig
  | InjuryChanceInfoStepConfig
  | PerfectFormGoalMessageStepConfig
  | GraphStepConfig
  | GymChallengeInfoStepConfig
  | NotificationPermissionStepConfig
  | CameraPermissionStepConfig
  | ProgressTrackingStepConfig;

export function OnboardingUnifiedScreen({}: OnboardingUnifiedScreenProps) {
  const navigation = useNavigation();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const { setLanguage, currentLanguage } = useLanguage();
  const { logIn } = usePurchases();

  // Global icon configuration
  const iconSize = 24;
  const iconColor = appColors.onboarding.button.inactive.iconColor;

  // Permission status states
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined'
  >('undetermined');
  const [canAskNotificationAgain, setCanAskNotificationAgain] = useState(true);

  const steps: ReadonlyArray<StepConfig> = useMemo(() => {
    const baseSteps: StepConfig[] = [
      {
        type: 'options',
        id: 'language',
        title: i18n.t('onboarding.language.title'),
        subtitle: i18n.t('onboarding.language.subtitle'),
        preferenceKey: 'language',
        options: LANGUAGES.map((lang) => ({
          value: lang.code,
          label: `${lang.nativeName} ${lang.flag}`,
        })),
      },
      {
        type: 'options',
        id: 'units',
        title: i18n.t('onboarding.units.title'),
        subtitle: i18n.t('onboarding.units.subtitle'),
        preferenceKey: 'unitSystem',
        options: [
          {
            value: 'metric',
            label: i18n.t('onboarding.units.metric'),
            description: i18n.t('onboarding.units.metricDescription'),
          },
          {
            value: 'imperial',
            label: i18n.t('onboarding.units.imperial'),
            description: i18n.t('onboarding.units.imperialDescription'),
          },
        ],
      },
      {
        type: 'rating',
        id: 'rating',
        title: i18n.t('onboarding.rating.title'),
      },
      {
        type: 'options',
        id: 'gender',
        title: i18n.t('onboarding.gender.title'),
        subtitle: i18n.t('onboarding.gender.subtitle'),
        preferenceKey: 'gender',
        options: [
          { value: 'male', label: i18n.t('onboarding.gender.male') },
          { value: 'female', label: i18n.t('onboarding.gender.female') },
        ],
      },
      {
        type: 'options',
        id: 'trainingReason',
        title: i18n.t('onboarding.trainingReason.title'),
        subtitle: i18n.t('onboarding.trainingReason.subtitle'),
        preferenceKey: 'trainingReason',
        options: [
          {
            value: 'build_strength',
            label: i18n.t('onboarding.trainingReason.buildStrength'),
            icon: <BicepsFlexed size={iconSize} color={iconColor} />,
          },
          {
            value: 'improve_physique',
            label: i18n.t('onboarding.trainingReason.improvePhysique'),
            icon: <User size={iconSize} color={iconColor} />,
          },
          {
            value: 'prevent_injury',
            label: i18n.t('onboarding.trainingReason.preventInjury'),
            icon: <ShieldPlus size={iconSize} color={iconColor} />,
          },
          {
            value: 'train_for_sport',
            label: i18n.t('onboarding.trainingReason.trainForSport'),
            icon: <Bike size={iconSize} color={iconColor} />,
          },
          {
            value: 'stay_active_healthy',
            label: i18n.t('onboarding.trainingReason.stayActiveHealthy'),
            icon: <HeartPulse size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'injuryChanceInfo',
        id: 'trainSafer',
        title: i18n.t('onboarding.trainSafer.title'),
      },
      {
        type: 'options',
        id: 'gymChallenge',
        title: i18n.t('onboarding.gymChallenge.title'),
        subtitle: i18n.t('onboarding.gymChallenge.subtitle'),
        preferenceKey: 'gymChallenge',
        options: [
          {
            value: 'unsure_form',
            label: i18n.t('onboarding.gymChallenge.unsureForm'),
            icon: <AudioWaveform size={iconSize} color={iconColor} />,
          },
          {
            value: 'no_results',
            label: i18n.t('onboarding.gymChallenge.noResults'),
            icon: <ChartNoAxesColumnDecreasing size={iconSize} color={iconColor} />,
          },
          {
            value: 'worried_injury',
            label: i18n.t('onboarding.gymChallenge.worriedInjury'),
            icon: <ShieldOff size={iconSize} color={iconColor} />,
          },
          {
            value: 'struggling_motivation',
            label: i18n.t('onboarding.gymChallenge.strugglingMotivation'),
            icon: <BatteryLow size={iconSize} color={iconColor} />,
          },
          {
            value: 'other',
            label: i18n.t('onboarding.gymChallenge.other'),
            icon: <Ellipsis size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'gymChallengeInfo',
        id: 'gymChallengeInfo',
        title: '',
        subtitle: '',
      },
      {
        type: 'options',
        id: 'workouts',
        title: i18n.t('onboarding.workouts.title'),
        subtitle: i18n.t('onboarding.workouts.subtitle'),
        preferenceKey: 'workoutsPerWeek',
        options: [
          {
            value: '0-2',
            label: i18n.t('onboarding.workouts.zeroToTwo'),
            description: i18n.t('onboarding.workouts.zeroToTwoDescription'),
            icon: <SingleDotIcon height={iconSize} width={iconSize} color={iconColor} />,
          },
          {
            value: '3-5',
            label: i18n.t('onboarding.workouts.threeToFive'),
            description: i18n.t('onboarding.workouts.threeToFiveDescription'),
            icon: <ThreeDotsIcon height={iconSize} width={iconSize} color={iconColor} />,
          },
          {
            value: '6+',
            label: i18n.t('onboarding.workouts.SixPlus'),
            description: i18n.t('onboarding.workouts.SixPlusDescription'),
            icon: <SixDotsIcon height={iconSize} width={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'options',
        id: 'lifterType',
        title: i18n.t('onboarding.lifterType.title'),
        subtitle: i18n.t('onboarding.lifterType.subtitle'),
        preferenceKey: 'lifterType',
        options: [
          {
            value: 'beginner',
            label: i18n.t('onboarding.lifterType.beginner'),
            icon: <Sprout size={iconSize} color={iconColor} />,
          },
          {
            value: 'intermediate',
            label: i18n.t('onboarding.lifterType.intermediate'),
            icon: <Shrub size={iconSize} color={iconColor} />,
          },
          {
            value: 'advanced',
            label: i18n.t('onboarding.lifterType.advanced'),
            icon: <TreePine size={iconSize} color={iconColor} />,
          },
          {
            value: 'returning_after_break',
            label: i18n.t('onboarding.lifterType.returningAfterBreak'),
            icon: <ChartNoAxesCombined size={iconSize} color={iconColor} />,
          },
          {
            value: 'injury_rehab',
            label: i18n.t('onboarding.lifterType.injuryRehab'),
            icon: <Hospital size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'progressTracking',
        id: 'progressTracking',
        title: i18n.t('onboarding.progressTracking.title'),
        subtitle: i18n.t('onboarding.progressTracking.subtitle'),
      },
      {
        type: 'options',
        id: 'perfectFormGoal',
        title: i18n.t('onboarding.perfectFormGoal.title'),
        subtitle: i18n.t('onboarding.perfectFormGoal.subtitle'),
        preferenceKey: 'perfectFormGoal',
        options: [
          {
            value: 'lift_heavier_safely',
            label: i18n.t('onboarding.perfectFormGoal.liftHeavierSafely'),
            icon: <Dumbbell size={iconSize} color={iconColor} />,
          },
          {
            value: 'build_muscle_efficiently',
            label: i18n.t('onboarding.perfectFormGoal.buildMuscleEfficiently'),
            icon: <BicepsFlexed size={iconSize} color={iconColor} />,
          },
          {
            value: 'avoid_injuries',
            label: i18n.t('onboarding.perfectFormGoal.avoidInjuries'),
            icon: <ShieldCheck size={iconSize} color={iconColor} />,
          },
          {
            value: 'boost_confidence',
            label: i18n.t('onboarding.perfectFormGoal.boostConfidence'),
            icon: <ChartNoAxesColumnIncreasing size={iconSize} color={iconColor} />,
          },
          {
            value: 'train_longer_without_setbacks',
            label: i18n.t('onboarding.perfectFormGoal.trainLongerWithoutSetbacks'),
            icon: <ClockArrowUp size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'perfectFormGoalMessage',
        id: 'perfectFormGoalMessage',
        title: '',
        subtitle: '',
      },
      // {
      //   type: 'cameraPermission',
      //   id: 'cameraPermission',
      //   title: i18n.t('onboarding.cameraPermission.title'),
      //   subtitle: '',
      // },
      {
        type: 'options',
        id: 'formConfidence',
        title: i18n.t('onboarding.formConfidence.title'),
        subtitle: i18n.t('onboarding.formConfidence.subtitle'),
        preferenceKey: 'formConfidence',
        options: [
          {
            value: '0-25',
            label: i18n.t('onboarding.formConfidence.zeroToTwentyFive'),
            icon: <BatteryWarning size={iconSize} color={iconColor} />,
          },
          {
            value: '25-50',
            label: i18n.t('onboarding.formConfidence.twentyFiveToFifty'),
            icon: <BatteryLow size={iconSize} color={iconColor} />,
          },
          {
            value: '50-75',
            label: i18n.t('onboarding.formConfidence.fiftyToSeventyFive'),
            icon: <BatteryMedium size={iconSize} color={iconColor} />,
          },
          {
            value: '75-100',
            label: i18n.t('onboarding.formConfidence.seventyFiveToHundred'),
            icon: <BatteryFull size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'options',
        id: 'threeMonthGoal',
        title: i18n.t('onboarding.threeMonthGoal.title'),
        subtitle: i18n.t('onboarding.threeMonthGoal.subtitle'),
        preferenceKey: 'threeMonthGoal',
        options: [
          {
            value: 'lifting_heavier',
            label: i18n.t('onboarding.threeMonthGoal.liftingHeavier'),
            icon: <Weight size={iconSize} color={iconColor} />,
          },
          {
            value: 'looking_leaner',
            label: i18n.t('onboarding.threeMonthGoal.lookingLeaner'),
            icon: <Scale size={iconSize} color={iconColor} />,
          },
          {
            value: 'feeling_stronger_injury_free',
            label: i18n.t('onboarding.threeMonthGoal.feelingStrongerInjuryFree'),
            icon: <BicepsFlexed size={iconSize} color={iconColor} />,
          },
          {
            value: 'more_consistent',
            label: i18n.t('onboarding.threeMonthGoal.moreConsistent'),
            icon: <TrendingUp size={iconSize} color={iconColor} />,
          },
          {
            value: 'more_confident',
            label: i18n.t('onboarding.threeMonthGoal.moreConfident'),
            icon: <PartyPopper size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'graph',
        id: 'potentialGraph',
        title: i18n.t('onboarding.potentialGraph.title'),
        subtitle: '',
      },
      {
        type: 'options',
        id: 'personalTrainer',
        title: i18n.t('onboarding.personalTrainer.title'),
        subtitle: i18n.t('onboarding.personalTrainer.subtitle'),
        preferenceKey: 'hasPersonalTrainer',
        options: [
          {
            value: true,
            label: i18n.t('onboarding.personalTrainer.yes'),
            icon: <ThumbsUp size={iconSize} color={iconColor} />,
          },
          {
            value: false,
            label: i18n.t('onboarding.personalTrainer.no'),
            icon: <ThumbsDown size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'injuryChanceInfo',
        id: 'costComparison',
        title: i18n.t('onboarding.costComparison.title'),
      },
      {
        type: 'measurements',
        id: 'measurements',
        title: i18n.t('onboarding.measurements.title'),
        subtitle: i18n.t('onboarding.measurements.subtitle'),
      },
      {
        type: 'options',
        id: 'ageRange',
        title: i18n.t('onboarding.ageRange.title'),
        subtitle: i18n.t('onboarding.ageRange.subtitle'),
        preferenceKey: 'ageRange',
        options: [
          { value: '18-24', label: i18n.t('onboarding.ageRange.ageRanges.18-24') },
          { value: '25-34', label: i18n.t('onboarding.ageRange.ageRanges.25-34') },
          { value: '35-44', label: i18n.t('onboarding.ageRange.ageRanges.35-44') },
          { value: '45-54', label: i18n.t('onboarding.ageRange.ageRanges.45-54') },
          { value: '55-64', label: i18n.t('onboarding.ageRange.ageRanges.55-64') },
          { value: '65+', label: i18n.t('onboarding.ageRange.ageRanges.65+') },
        ],
      },
      {
        type: 'options',
        id: 'discoverySource',
        title: i18n.t('onboarding.discovery.title'),
        subtitle: i18n.t('onboarding.discovery.subtitle'),
        preferenceKey: 'discoverySource',
        options: [
          {
            value: 'instagram',
            label: i18n.t('onboarding.discovery.instagram'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/instagram.png'),
          },
          {
            value: 'tiktok',
            label: i18n.t('onboarding.discovery.tiktok'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/tiktok.png'),
          },
          {
            value: 'facebook',
            label: i18n.t('onboarding.discovery.facebook'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/facebook.png'),
          },
          {
            value: 'twitter',
            label: i18n.t('onboarding.discovery.twitter'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/x.png'),
          },
          {
            value: 'google',
            label: i18n.t('onboarding.discovery.google'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/google.png'),
          },
          {
            value: 'appStore',
            label: i18n.t('onboarding.discovery.appStore'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/appstore.png'),
          },
          {
            value: 'playStore',
            label: i18n.t('onboarding.discovery.playStore'),
            iconHeight: 30,
            iconWidth: 30,
            iconImage: require('../../../assets/icons/playstore.png'),
          },
          {
            value: 'friends',
            label: i18n.t('onboarding.discovery.friends'),
            icon: <Users size={iconSize} color={iconColor} />,
          },
          {
            value: 'other',
            label: i18n.t('onboarding.discovery.other'),
            icon: <BookCopy size={iconSize} color={iconColor} />,
          },
        ],
      },
      {
        type: 'referral',
        id: 'referralCode',
        title: i18n.t('onboarding.referralCode.title'),
        subtitle: i18n.t('onboarding.referralCode.subtitle'),
      },
      // Notification permission step - only show if we can ask for permission again
      ...(canAskNotificationAgain && notificationPermissionStatus !== 'granted'
        ? [
            {
              type: 'notificationPermission' as const,
              id: 'notificationPermission',
              title: i18n.t('onboarding.notificationPermission.title'),
              subtitle: '',
            },
          ]
        : []),
      {
        type: 'allDone',
        id: 'allDone',
        title: i18n.t('onboarding.allDone.title'),
        subtitle: '',
      },
    ];

    // Only add saveProgress step if userId is null (user hasn't signed in yet)
    if (onboardingData.userId === null) {
      baseSteps.push({
        type: 'saveProgress',
        id: 'saveProgress',
        title: i18n.t('onboarding.saveProgress.title'),
        subtitle: '',
      });
    }

    return baseSteps;
  }, [i18n.locale, onboardingData.userId, notificationPermissionStatus, canAskNotificationAgain]);

  const totalSteps = steps.length;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];

  // Generate unique session ID for analytics tracking
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Track the most recent selection for analytics (before it's saved to context)
  const [currentStepSelection, setCurrentStepSelection] = useState<any>(null);

  // Local state for referral step
  const [referralCode, setReferralCode] = useState(onboardingData.referralCode || '');
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralError, setReferralError] = useState(false);
  const [applyButtonLoading, setApplyButtonLoading] = useState(false);

  // Loading states for permission requests
  const [notificationPermissionLoading, setNotificationPermissionLoading] = useState(false);
  const [notificationDontAllowLoading, setNotificationDontAllowLoading] = useState(false);

  // Animation values for info step
  const percentageBoxHeight = useMemo(() => new Animated.Value(0), []);
  const formaiBoxHeight = useMemo(() => new Animated.Value(0), []);

  // Animation values for bar opacity
  const percentageBoxOpacity = useMemo(() => new Animated.Value(0), []);
  const formaiBoxOpacity = useMemo(() => new Animated.Value(0), []);

  // Animation values for text inside the bars
  const percentageTextOpacity = useMemo(() => new Animated.Value(0), []);
  const formaiTextOpacity = useMemo(() => new Animated.Value(0), []);

  // Animation value for description text
  const descriptionOpacity = useMemo(() => new Animated.Value(0), []);

  // Animation value for graph subtitle
  const graphSubtitleOpacity = useMemo(() => new Animated.Value(0), []);

  // Animation value for finger icon
  const fingerTranslateY = useMemo(() => new Animated.Value(0), []);

  // State for confetti animation delay
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAllDoneConfetti, setShowAllDoneConfetti] = useState(false);

  // State for rating delay
  const [ratingButtonDisabled, setRatingButtonDisabled] = useState(false);
  const ratingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync onboarding language with current language from AsyncStorage
  useEffect(() => {
    if (currentLanguage && onboardingData.language !== currentLanguage) {
      updateOnboardingData('language', currentLanguage);
    }
  }, [currentLanguage, onboardingData.language, updateOnboardingData]);

  // Check permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check notification permission
        const notificationStatus = await Notifications.getPermissionsAsync();
        setNotificationPermissionStatus(notificationStatus.granted ? 'granted' : 'denied');
        setCanAskNotificationAgain((notificationStatus as any)?.canAskAgain !== false);
      } catch (error) {
        console.warn('Error checking permissions:', error);
      }
    };

    checkPermissions();
  }, []);

  // Auto-advance when permission status changes and current step becomes invalid
  useEffect(() => {
    if (!currentStep) return;

    // If current step is notification permission and permission is granted or we can't ask again, advance to next step
    if (
      currentStep.type === 'notificationPermission' &&
      (notificationPermissionStatus === 'granted' || !canAskNotificationAgain)
    ) {
      // Use setTimeout to ensure state updates are processed before navigation
      setTimeout(() => {
        handleNext();
      }, 100);
    }
  }, [notificationPermissionStatus, currentStep, canAskNotificationAgain]);

  // Reset loading states when moving to a new step
  useEffect(() => {
    if (currentStep?.type !== 'notificationPermission') {
      setNotificationPermissionLoading(false);
      setNotificationDontAllowLoading(false);
    }
  }, [currentStep]);

  // Helpers for measurements
  const isMetric = onboardingData.unitSystem === 'metric';
  const heightOptions = Array.from({ length: 151 }, (_, i) => 100 + i); // 100-250 cm
  const feetOptions = Array.from({ length: 8 }, (_, i) => 1 + i); // 1-8 feet
  const inchesOptions = Array.from({ length: 12 }, (_, i) => i); // 0-11 inches
  const weightOptions = isMetric
    ? Array.from({ length: 211 }, (_, i) => 40 + i) // 40-250 kg
    : Array.from({ length: 468 }, (_, i) => 88 + i); // 88-555 lbs (equivalent to 40-250 kg)

  // Repeated picker logic (20 repeats with middle selected by default)
  const repeats = 20;
  const middleRepeatIndex = Math.floor(repeats / 2);

  function getCurrentHeight() {
    if (!onboardingData.metricHeight)
      return isMetric ? 170 : { feet: 5, inches: 7, totalInches: 67 };
    if (isMetric) return onboardingData.metricHeight;
    const totalInches = Math.round(onboardingData.metricHeight / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { feet, inches, totalInches };
  }

  function getCurrentWeight() {
    if (!onboardingData.metricWeight) return isMetric ? 60 : 130;
    if (isMetric) return onboardingData.metricWeight;
    return onboardingData.metricWeight / 0.453592;
  }

  function handleHeightSelect(height: number) {
    updateOnboardingData('metricHeight', isMetric ? height : height * 2.54);
  }

  function handleFeetSelect(feet: number) {
    const currentHeight = onboardingData.metricHeight || 170;
    const totalInches = Math.round(currentHeight / 2.54);
    const currentInches = totalInches % 12;
    const newTotalInches = feet * 12 + currentInches;
    updateOnboardingData('metricHeight', newTotalInches * 2.54);
  }

  function handleInchesSelect(inches: number) {
    const currentHeight = onboardingData.metricHeight || 170;
    const totalInches = Math.round(currentHeight / 2.54);
    const currentFeet = Math.floor(totalInches / 12);
    const newTotalInches = currentFeet * 12 + inches;
    updateOnboardingData('metricHeight', newTotalInches * 2.54);
  }

  function handleWeightSelect(weight: number) {
    updateOnboardingData('metricWeight', isMetric ? weight : weight * 0.453592);
  }

  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.id === 'trainSafer' || currentStep.id === 'costComparison') {
      // Reset all animation values
      percentageBoxHeight.setValue(0);
      formaiBoxHeight.setValue(0);
      percentageBoxOpacity.setValue(0);
      formaiBoxOpacity.setValue(0);
      percentageTextOpacity.setValue(0);
      formaiTextOpacity.setValue(0);
      descriptionOpacity.setValue(0);

      // Start animation sequence after 50ms delay
      setTimeout(() => {
        // Step 1: Animate boxes growing from 0 height with opacity
        Animated.parallel([
          Animated.timing(percentageBoxHeight, {
            toValue: 150,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(formaiBoxHeight, {
            toValue: 50,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(percentageBoxOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(formaiBoxOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Step 2: After containers animate, show the text values
          Animated.parallel([
            Animated.timing(percentageTextOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(formaiTextOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Step 3: After text values appear, animate description
            Animated.timing(descriptionOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start();
          });
        });
      }, 50);
    } else {
      // Reset animation values when leaving info step
      percentageBoxHeight.setValue(0);
      formaiBoxHeight.setValue(0);
      percentageBoxOpacity.setValue(0);
      formaiBoxOpacity.setValue(0);
      percentageTextOpacity.setValue(0);
      formaiTextOpacity.setValue(0);
      descriptionOpacity.setValue(0);
    }
  }, [
    currentStep,
    percentageBoxHeight,
    formaiBoxHeight,
    percentageBoxOpacity,
    formaiBoxOpacity,
    percentageTextOpacity,
    formaiTextOpacity,
    descriptionOpacity,
  ]);

  // Finger animation effect
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.type === 'notificationPermission' || currentStep.type === 'cameraPermission') {
      const startFingerAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(fingerTranslateY, {
              toValue: -15,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(fingerTranslateY, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      startFingerAnimation();
    } else {
      // Reset animation when leaving permission steps
      fingerTranslateY.setValue(0);
    }
  }, [currentStep, fingerTranslateY]);

  // Graph subtitle animation effect
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.type === 'graph') {
      // Reset and animate subtitle with delay
      graphSubtitleOpacity.setValue(0);

      setTimeout(() => {
        Animated.timing(graphSubtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 800); // Delay to show after graph animation starts
    } else {
      // Reset when leaving graph step
      graphSubtitleOpacity.setValue(0);
    }
  }, [currentStep, graphSubtitleOpacity]);

  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.type === 'allDone') {
      hapticFeedback.success();
    }
  }, [currentStep]);

  // Confetti animation delay effect
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.type === 'perfectFormGoalMessage') {
      // Reset confetti state when entering the step
      setShowConfetti(false);

      // Start confetti animation instantly when screen shows
      setShowConfetti(true);
    } else if (currentStep.type === 'allDone') {
      // Reset allDone confetti state when entering the step
      setShowAllDoneConfetti(false);

      // Start confetti animation after 100ms delay
      const timer = setTimeout(() => {
        setShowAllDoneConfetti(true);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // Hide confetti when leaving the steps
      setShowConfetti(false);
      setShowAllDoneConfetti(false);
    }
  }, [currentStep]);

  // Rating step delay effect - disable button for 3 seconds
  useEffect(() => {
    if (!currentStep || currentStep.type !== 'rating') {
      return;
    }

    const checkAndApplyDelay = async () => {
      try {
        // Check if we've already shown the delay in this session
        const delayShown = await AsyncStorage.getItem('rating_delay_shown');

        if (!delayShown) {
          // Mark that we've shown the delay
          await AsyncStorage.setItem('rating_delay_shown', 'true');

          // Disable the button
          setRatingButtonDisabled(true);

          // Enable the button after 3 seconds
          ratingTimerRef.current = setTimeout(() => {
            setRatingButtonDisabled(false);
          }, 1500);
        } else {
          // Already shown, keep button enabled
          setRatingButtonDisabled(false);
        }
      } catch (error) {
        // If there's an error, just enable the button
        setRatingButtonDisabled(false);
      }
    };

    checkAndApplyDelay();

    // Cleanup function to clear timer if component unmounts
    return () => {
      if (ratingTimerRef.current) {
        clearTimeout(ratingTimerRef.current);
        ratingTimerRef.current = null;
      }
    };
  }, [currentStep]);

  // Analytics tracking
  useEffect(() => {
    // Track onboarding start on component mount
    track('Onboarding Started', {
      session_id: sessionId,
      total_steps: totalSteps,
    });
  }, [sessionId, totalSteps]);

  // Reset selection tracking when moving to a new step
  useEffect(() => {
    // Clear the selection when moving to a new step
    setCurrentStepSelection(null);
  }, [currentStepIndex]);

  // Auto-select default options only for language and units steps
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.type === 'options') {
      const step = currentStep as OptionsStepConfig<keyof OnboardingData>;
      const currentValue = onboardingData[step.preferenceKey as keyof OnboardingData] as any;

      // Only auto-select if no value is currently set and it's language or units step
      if (
        (currentValue === null || currentValue === undefined || currentValue === '') &&
        (step.preferenceKey === 'language' || step.preferenceKey === 'unitSystem')
      ) {
        if (step.preferenceKey === 'language') {
          // Select English (first option) for language
          const englishOption = step.options.find((option) => option.value === 'en');
          if (englishOption && typeof englishOption.value === 'string') {
            updateOnboardingData(step.preferenceKey as any, englishOption.value);
            setCurrentStepSelection(englishOption.value);
            setLanguage(englishOption.value);
          }
        } else if (step.preferenceKey === 'unitSystem') {
          // Select metric (first option) for units
          const metricOption = step.options.find((option) => option.value === 'metric');
          if (metricOption) {
            updateOnboardingData(step.preferenceKey as any, metricOption.value);
            setCurrentStepSelection(metricOption.value);
          }
        }
      }
    }
  }, [currentStepIndex, currentStep, onboardingData, updateOnboardingData, setLanguage]);

  function getPerfectFormGoalMessage() {
    const goal = onboardingData.perfectFormGoal;
    switch (goal) {
      case 'lift_heavier_safely':
        return {
          highlighted: i18n.t('onboarding.perfectFormGoalMessage.highlighted.liftHeavierSafely'),
          rest: i18n.t('onboarding.perfectFormGoalMessage.rest'),
        };
      case 'build_muscle_efficiently':
        return {
          highlighted: i18n.t(
            'onboarding.perfectFormGoalMessage.highlighted.buildMuscleEfficiently'
          ),
          rest: i18n.t('onboarding.perfectFormGoalMessage.restRealistic'),
        };
      case 'avoid_injuries':
        return {
          highlighted: i18n.t('onboarding.perfectFormGoalMessage.highlighted.avoidInjuries'),
          rest: i18n.t('onboarding.perfectFormGoalMessage.restFantastic'),
        };
      case 'boost_confidence':
        return {
          highlighted: i18n.t('onboarding.perfectFormGoalMessage.highlighted.boostConfidence'),
          rest: i18n.t('onboarding.perfectFormGoalMessage.restAfter'),
        };
      case 'train_longer_without_setbacks':
        return {
          highlighted: i18n.t(
            'onboarding.perfectFormGoalMessage.highlighted.trainLongerWithoutSetbacks'
          ),
          rest: i18n.t('onboarding.perfectFormGoalMessage.restNormal'),
        };
      default:
        return {
          highlighted: i18n.t('onboarding.perfectFormGoalMessage.highlighted.default'),
          rest: i18n.t('onboarding.perfectFormGoalMessage.restAchievable'),
        };
    }
  }

  function getGymChallengeInfo() {
    const challenge = onboardingData.gymChallenge;
    switch (challenge) {
      case 'no_results':
        return {
          headline: i18n.t('onboarding.gymChallengeInfo.noResults.headline'),
          message: i18n.t('onboarding.gymChallengeInfo.noResults.message'),
          howWeGetYouThere: i18n.t(
            'onboarding.gymChallengeInfo.noResults.howWeGetYouThere'
          ) as string[],
        };
      case 'unsure_form':
        return {
          headline: i18n.t('onboarding.gymChallengeInfo.unsureForm.headline'),
          message: i18n.t('onboarding.gymChallengeInfo.unsureForm.message'),
          howWeGetYouThere: i18n.t(
            'onboarding.gymChallengeInfo.unsureForm.howWeGetYouThere'
          ) as string[],
        };
      case 'worried_injury':
        return {
          headline: i18n.t('onboarding.gymChallengeInfo.worriedInjury.headline'),
          message: i18n.t('onboarding.gymChallengeInfo.worriedInjury.message'),
          howWeGetYouThere: i18n.t(
            'onboarding.gymChallengeInfo.worriedInjury.howWeGetYouThere'
          ) as string[],
        };
      case 'struggling_motivation':
        return {
          headline: i18n.t('onboarding.gymChallengeInfo.strugglingMotivation.headline'),
          message: i18n.t('onboarding.gymChallengeInfo.strugglingMotivation.message'),
          howWeGetYouThere: i18n.t(
            'onboarding.gymChallengeInfo.strugglingMotivation.howWeGetYouThere'
          ) as string[],
        };
      case 'other':
        return {
          headline: i18n.t('onboarding.gymChallengeInfo.other.headline'),
          message: i18n.t('onboarding.gymChallengeInfo.other.message'),
          howWeGetYouThere: i18n.t(
            'onboarding.gymChallengeInfo.other.howWeGetYouThere'
          ) as string[],
        };
      default:
        return {
          headline: i18n.t('onboarding.gymChallengeInfo.other.headline'),
          message: i18n.t('onboarding.gymChallengeInfo.other.message'),
          howWeGetYouThere: i18n.t(
            'onboarding.gymChallengeInfo.other.howWeGetYouThere'
          ) as string[],
        };
    }
  }

  function handleSelectOptionStep(value: any) {
    hapticFeedback.selection();
    const step = currentStep as OptionsStepConfig<keyof OnboardingData>;
    updateOnboardingData(step.preferenceKey as any, value);

    // Store the current selection for analytics tracking
    setCurrentStepSelection(value);

    // Track option selection
    track('Onboarding Option Selected', {
      session_id: sessionId,
      step_id: step.id,
      step_type: step.type,
      step_index: currentStepIndex,
      preference_key: step.preferenceKey,
      selected_value: value,
      total_steps: totalSteps,
    });

    if (step.preferenceKey === 'language' && typeof value === 'string') {
      setLanguage(value);
    }
  }

  function trackPermission(type: string, granted: boolean, stepId: string, error?: string) {
    track('Permissions', {
      session_id: sessionId,
      step_id: stepId,
      step_index: currentStepIndex,
      permission_type: type,
      granted: granted,
      error: error || null,
    });
  }

  // Robust camera permission request with pre-check and Settings fallback
  async function requestCameraPermissionAndProceed(onSuccess: () => void): Promise<void> {
    try {
      const { Camera } = await import('expo-camera');
      const current = await Camera.getCameraPermissionsAsync();
      if (current.granted) {
        trackPermission('camera', true, 'cameraPermission');
        hapticFeedback.success();
        onSuccess();
        return;
      }

      const result = await Camera.requestCameraPermissionsAsync();
      trackPermission('camera', result.granted, 'cameraPermission');

      if (result.granted) {
        hapticFeedback.success();
        onSuccess();
        return;
      }

      if (result.canAskAgain === false) {
        hapticFeedback.selection();
        try {
          await Linking.openSettings();
          return;
        } catch (_) {
          try {
            await openAppSettings();
            return;
          } catch (__) {
            showAlert(
              'Camera permission needed',
              'Please enable Camera access for Form AI in Settings to continue.'
            );
            return;
          }
        }
      }

      // Denied but can ask again – show explanation; keep CTA enabled to retry
      showAlert(
        'Camera permission required',
        'We need Camera access to record your workout videos for analysis.'
      );
    } catch (error) {
      trackPermission(
        'camera',
        false,
        'cameraPermission',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async function handleRateFormAI() {
    hapticFeedback.selection();
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      }
      updateOnboardingData('hasRated', true);
      // Navigate to next screen after rating dialog
      handleNext();
    } catch (e) {
      updateOnboardingData('hasRated', true);
      // Navigate to next screen even if rating fails
      handleNext();
    }
  }

  async function handleApplyReferralCode() {
    if (!referralCode.trim()) return;

    setApplyButtonLoading(true);
    setReferralError(false);

    try {
      const result = await validateReferralCode(referralCode.trim().toUpperCase());

      if (result.isValid && result.referralCode) {
        // Valid referral code found - update context and navigate to next step
        hapticFeedback.success();
        updateOnboardingData('referralCode', referralCode.trim().toUpperCase());

        // Track successful referral code entry
        track('Onboarding Referral Code Entered', {
          session_id: sessionId,
          step_id: currentStep.id,
          step_index: currentStepIndex,
          referral_code: referralCode.trim().toUpperCase(),
          success: true,
        });

        // Navigate to next step
        setCurrentStepIndex((i) => i + 1);
      } else {
        // Invalid referral code - show alert and reset state
        hapticFeedback.error();
        Alert.alert(
          'Invalid Referral Code',
          'The referral code you entered is not valid. Please check and try again.'
        );
        setReferralError(true);
      }
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to validate referral code. Please try again.');
      setReferralError(true);
    } finally {
      setApplyButtonLoading(false);
    }
  }

  async function handleDirectAccountCreation() {
    // Navigate to AccountLoading screen immediately to show loading state
    navigation.navigate('AccountLoading' as never);

    try {
      // Get the current user from Supabase auth
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user?.id) {
        showAlert('Error', 'Unable to get user information. Please try again.');
        return;
      }

      // Check if user already exists in the database
      const { user: existingUser } = await fetchUserById(user.id);
      if (existingUser) {
        // User already exists, just log them in and navigate to main app
        await logIn(user.id);

        // Track sign in completion for existing user
        track('Sign In Completed', {
          signin_method: 'onboarding_completion',
          user_id: user.id,
        });

        try {
          // Register Expo push token for existing user
          await registerAndSaveExpoPushToken(user.id);
          // AccountLoading screen will handle the next navigation via its onComplete
        } catch (error) {
          showAlert(
            'Error',
            'An error occurred while signing in. Please try again.',
            undefined,
            'ONBOARDING_EXISTING_USER_ERROR',
            error
          );
        }
        return;
      }

      // New user - proceed with onboarding setup
      const signInMethod = user?.app_metadata?.provider || 'onboarding_completion';

      const profilePicture: string | null =
        (user?.user_metadata?.avatar_url as string | undefined) ??
        (user?.user_metadata?.picture as string | undefined) ??
        null;

      const updatedData = {
        ...onboardingData,
        signInMethod: signInMethod,
        onboardingCompleted: true,
        walkthroughCompleted: false,
        userId: user.id,
        profilePicture: profilePicture,
      };

      updateOnboardingData('signInMethod', signInMethod);
      updateOnboardingData('onboardingCompleted', true);
      updateOnboardingData('walkthroughCompleted', false);
      updateOnboardingData('userId', user.id);
      updateOnboardingData('profilePicture', profilePicture);

      await logIn(user.id);

      // Track signup completion
      track('Signup Completed', {
        signup_method: signInMethod,
        user_id: user.id,
      });

      try {
        // Register Expo push token and persist onboarding data
        await registerAndSaveExpoPushToken(user.id);
        const { saveOnboardingProgress } = await import('../../services/onboardingService');
        await saveOnboardingProgress(updatedData);
        // AccountLoading screen will handle the next navigation via its onComplete
      } catch (persistError) {
        showAlert(
          'Error',
          'An error occurred while setting up your account. Please try again.',
          undefined,
          'ONBOARDING_DIRECT_ACCOUNT_CREATION_ERROR',
          persistError
        );
      }
    } catch (error) {
      showAlert(
        'Error',
        'An error occurred while creating your account. Please try again.',
        undefined,
        'ONBOARDING_DIRECT_ACCOUNT_CREATION_ERROR',
        error
      );
    }
  }

  function handleNext() {
    const isLast = currentStepIndex === totalSteps - 1;

    // Get selected value for this step if applicable
    const getSelectedValueForStep = () => {
      if (currentStep.type === 'options') {
        // Use the current selection if available, otherwise fall back to saved data
        return currentStepSelection !== null
          ? currentStepSelection
          : onboardingData[(currentStep as OptionsStepConfig<keyof OnboardingData>).preferenceKey];
      } else if (currentStep.type === 'measurements') {
        if (currentStep.id === 'height') {
          return onboardingData.metricHeight;
        } else if (currentStep.id === 'weight') {
          return onboardingData.metricWeight;
        }
      } else if (currentStep.type === 'referral') {
        // Only return referral code if it was successfully applied (stored in context)
        return onboardingData.referralCode;
      }
      return null;
    };

    // Track step completion before moving to next step
    const trackingData: any = {
      session_id: sessionId,
      step_id: currentStep.id,
      step_type: currentStep.type,
      step_index: currentStepIndex,
      step_title: currentStep.title,
      total_steps: totalSteps,
      is_last_step: isLast,
    };

    const selectedValue = getSelectedValueForStep();
    if (selectedValue !== null) {
      trackingData.selected_value = selectedValue;
    }

    track('Onboarding Step Completed', trackingData);

    // Track referral step skipped (no code applied)
    if (currentStep.type === 'referral' && !onboardingData.referralCode) {
      track('Onboarding Referral Code Skipped', {
        session_id: sessionId,
        step_id: currentStep.id,
        step_index: currentStepIndex,
        referral_code: null,
        success: true,
      });
    }

    if (!isLast) {
      hapticFeedback.selection();
      setCurrentStepIndex((i) => i + 1);
      return;
    }

    // Track onboarding completion
    track('Onboarding Completed', {
      session_id: sessionId,
      total_steps: totalSteps,
      final_step_type: currentStep.type,
    });

    // When finished, check if it's the allDone step
    if (currentStep.type === 'allDone') {
      // Check if userId is not null (user signed in but onboarding not complete)
      if (onboardingData.userId !== null) {
        // Skip create account screen and directly execute account creation logic
        handleDirectAccountCreation();
      } else {
        // User hasn't signed in yet, navigate to payment
        navigation.navigate('Payment' as never);
      }
    } else if (currentStep.type === 'saveProgress') {
      // Navigate to payment screens
      navigation.navigate('Payment' as never);
    } else {
      // Continue the original flow
      navigation.navigate('AllDone' as never);
    }
  }

  function handleBack() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
      return;
    }
    // Navigate back to previous screen in stack
    navigation.goBack();
  }

  // Safety check: if currentStep is undefined (e.g., steps array changed during re-render), return null
  if (!currentStep) {
    return null;
  }

  // Compute next disabled based on step type
  let nextDisabled = false;
  let nextLoading = false;
  if (currentStep.type === 'options') {
    const step = currentStep as OptionsStepConfig<keyof OnboardingData>;
    const selectedValue = onboardingData[step.preferenceKey as keyof OnboardingData] as any;
    nextDisabled = selectedValue === null || selectedValue === undefined || selectedValue === '';
  } else if (currentStep.type === 'measurements') {
    nextDisabled = !onboardingData.metricHeight || !onboardingData.metricWeight;
  } else if (currentStep.type === 'rating') {
    nextDisabled = ratingButtonDisabled; // disable for 3 seconds, then enable
  } else if (currentStep.type === 'info') {
    nextDisabled = false; // always enabled for info step
  } else if (currentStep.type === 'gymChallengeInfo') {
    nextDisabled = false; // always enabled for gym challenge info step
  } else if (currentStep.type === 'cameraPermission') {
    nextDisabled = false; // always enabled for camera permission step
  } else if (currentStep.type === 'notificationPermission') {
    nextDisabled = false; // always enabled for notification permission step
  } else if (currentStep.type === 'progressTracking') {
    nextDisabled = false; // always enabled for progress tracking step
  } else if (currentStep.type === 'referral') {
    nextLoading = referralValidating || applyButtonLoading; // show loading while validating or applying
  } else if (currentStep.type === 'allDone') {
    nextDisabled = false; // always enabled for allDone step
  }

  const nextHandler = handleNext;
  const nextLabel = i18n.t('next');

  return (
    <OnboardingLayout
      title={currentStep.title}
      subtitle={currentStep.subtitle}
      currentStep={currentStepIndex + 1}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={nextHandler}
      nextTitle={nextLabel}
      nextDisabled={nextDisabled}
      nextLoading={nextLoading}
      hideNextButton={
        currentStep.type === 'saveProgress' ||
        currentStep.type === 'notificationPermission' ||
        currentStep.type === 'cameraPermission'
      }
      hideTitle={
        currentStep.type === 'notificationPermission' || currentStep.type === 'cameraPermission'
      }
    >
      {currentStep.id === 'trainSafer' && (
        <View style={styles.infoStepContainer}>
          <LinearGradient
            colors={appColors.onboarding.comparison.gradient.colors}
            locations={appColors.onboarding.comparison.gradient.locations}
            start={appColors.onboarding.comparison.gradient.start}
            end={appColors.onboarding.comparison.gradient.end}
            style={styles.comparisonCard}
          >
            <View style={styles.comparisonRow}>
              {/* Without FormAI */}
              <View style={styles.comparisonSection}>
                <View style={styles.whiteBoxContainer}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: appColors.onboarding.comparison.sectionTitle },
                    ]}
                  >
                    {i18n.t('onboarding.trainSafer.withoutFormAI')}
                  </Text>
                  <Animated.View
                    style={[
                      styles.percentageBox,
                      {
                        backgroundColor: appColors.onboarding.comparison.percentageBox.background,
                        height: percentageBoxHeight,
                        opacity: percentageBoxOpacity,
                      },
                    ]}
                  >
                    <Animated.Text
                      style={[
                        styles.percentageText,
                        {
                          color: appColors.onboarding.comparison.percentageBox.text,
                          opacity: percentageTextOpacity,
                        },
                      ]}
                    >
                      60%
                    </Animated.Text>
                  </Animated.View>
                </View>
              </View>

              {/* With FormAI */}
              <View style={styles.comparisonSection}>
                <View style={styles.whiteBoxContainer}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: appColors.onboarding.comparison.sectionTitle },
                    ]}
                  >
                    {i18n.t('onboarding.trainSafer.withFormAI')}
                  </Text>
                  <Animated.View
                    style={[
                      styles.formaiBox,
                      {
                        backgroundColor: appColors.onboarding.comparison.formaiBox.background,
                        height: formaiBoxHeight,
                        opacity: formaiBoxOpacity,
                      },
                    ]}
                  >
                    <Animated.Text
                      style={[
                        styles.formaiText,
                        {
                          color: appColors.onboarding.comparison.formaiBox.text,
                          opacity: formaiTextOpacity,
                        },
                      ]}
                    >
                      3x less
                    </Animated.Text>
                  </Animated.View>
                </View>
              </View>
            </View>

            <Animated.Text
              style={[
                styles.description,
                { color: appColors.onboarding.comparison.description, opacity: descriptionOpacity },
              ]}
            >
              {i18n.t('onboarding.trainSafer.description')}
            </Animated.Text>
          </LinearGradient>
        </View>
      )}

      {currentStep.id === 'costComparison' && (
        <View style={styles.infoStepContainer}>
          <LinearGradient
            colors={appColors.onboarding.comparison.gradient.colors}
            locations={appColors.onboarding.comparison.gradient.locations}
            start={appColors.onboarding.comparison.gradient.start}
            end={appColors.onboarding.comparison.gradient.end}
            style={styles.comparisonCard}
          >
            <View style={styles.comparisonRow}>
              {/* Personal Trainer */}
              <View style={styles.comparisonSection}>
                <View style={styles.whiteBoxContainer}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: appColors.onboarding.comparison.sectionTitle },
                    ]}
                  >
                    {i18n.t('onboarding.costComparison.personalTrainer')}
                  </Text>
                  <Animated.View
                    style={[
                      styles.percentageBox,
                      {
                        backgroundColor: appColors.onboarding.comparison.percentageBox.background,
                        height: percentageBoxHeight,
                        opacity: percentageBoxOpacity,
                      },
                    ]}
                  >
                    <Animated.Text
                      style={[
                        styles.percentageText,
                        {
                          color: appColors.onboarding.comparison.percentageBox.text,
                          opacity: percentageTextOpacity,
                        },
                      ]}
                    >
                      $5000+/yr
                    </Animated.Text>
                  </Animated.View>
                </View>
              </View>

              {/* With FormAI */}
              <View style={styles.comparisonSection}>
                <View style={styles.whiteBoxContainer}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: appColors.onboarding.comparison.sectionTitle },
                    ]}
                  >
                    {i18n.t('onboarding.costComparison.withFormAI')}
                  </Text>
                  <Animated.View
                    style={[
                      styles.formaiBox,
                      {
                        backgroundColor: appColors.onboarding.comparison.formaiBox.background,
                        height: formaiBoxHeight,
                        opacity: formaiBoxOpacity,
                      },
                    ]}
                  >
                    <Animated.Text
                      style={[
                        styles.formaiText,
                        {
                          color: appColors.onboarding.comparison.formaiBox.text,
                          opacity: formaiTextOpacity,
                        },
                      ]}
                    >
                      {i18n.t('onboarding.costComparison.costLess')}
                    </Animated.Text>
                  </Animated.View>
                </View>
              </View>
            </View>

            <Animated.Text
              style={[
                styles.description,
                { color: appColors.onboarding.comparison.description, opacity: descriptionOpacity },
              ]}
            >
              {i18n.t('onboarding.costComparison.description')}
            </Animated.Text>
          </LinearGradient>

          {/* Source text */}
          <View style={styles.sourceContainer}>
            <TouchableOpacity
              onPress={async () => {
                hapticFeedback.selection();
                try {
                  await Linking.openURL('https://www.thumbtack.com/p/personal-trainer-cost');
                } catch (error) {
                  console.warn('Failed to open source link:', error);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.sourceText, { color: appColors.onboarding.comparison.source.text }]}
              >
                Source
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentStep.type === 'perfectFormGoalMessage' && (
        <View style={styles.perfectFormGoalMessageContainer}>
          {/* Confetti animation positioned behind content */}
          {showConfetti && (
            <View style={[styles.animationContainer, { marginTop: -60 }]}>
              <LottieView
                source={require('../../../assets/animations/confetti.json')}
                autoPlay
                loop={false}
                speed={0.7}
                style={styles.confettiAnimation}
              />
            </View>
          )}

          <View style={styles.perfectFormGoalMessageContent}>
            <Text
              style={[
                styles.perfectFormGoalMessageTitle,
                { color: appColors.onboarding.perfectFormGoalMessage.title },
              ]}
            >
              <Text
                style={[
                  styles.highlightedText,
                  { color: appColors.onboarding.perfectFormGoalMessage.highlightedText },
                ]}
              >
                {getPerfectFormGoalMessage().highlighted}
              </Text>
              {getPerfectFormGoalMessage().rest}
            </Text>
            <Text
              style={[
                styles.perfectFormGoalMessageSubtitle,
                { color: appColors.onboarding.perfectFormGoalMessage.subtitle },
              ]}
            >
              {i18n.t('onboarding.perfectFormGoalMessage.subtitle')}
            </Text>
          </View>
        </View>
      )}

      {currentStep.type === 'gymChallengeInfo' && (
        <ScrollView
          style={styles.gymChallengeInfoContainer}
          contentContainerStyle={styles.gymChallengeInfoContent}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical={false}
        >
          {/* Main card with headline and message */}
          <LinearGradient
            colors={appColors.onboarding.gymChallengeInfo.gradient.colors}
            locations={appColors.onboarding.gymChallengeInfo.gradient.locations}
            start={appColors.onboarding.gymChallengeInfo.gradient.start}
            end={appColors.onboarding.gymChallengeInfo.gradient.end}
            style={styles.gymChallengeInfoCard}
          >
            <Text
              style={[
                styles.gymChallengeInfoHeadline,
                { color: appColors.onboarding.gymChallengeInfo.headline },
              ]}
            >
              {getGymChallengeInfo().headline}
            </Text>
            <Text
              style={[
                styles.gymChallengeInfoMessage,
                { color: appColors.onboarding.gymChallengeInfo.message },
              ]}
            >
              {getGymChallengeInfo().message}
            </Text>
          </LinearGradient>

          {/* How we get you there section */}
          <Text
            style={[
              styles.howWeGetYouThereTitle,
              { color: appColors.onboarding.gymChallengeInfo.howWeGetYouThereTitle },
            ]}
          >
            {i18n.t('onboarding.gymChallengeInfo.howWeGetYouThereTitle')}:
          </Text>

          {/* How we get you there items */}
          {getGymChallengeInfo().howWeGetYouThere.map((item: string, index: number) => (
            <AnimatedInfoCard key={index} delay={index * 100}>
              <View
                style={[
                  styles.howWeGetYouThereCard,
                  {
                    backgroundColor: appColors.onboarding.gymChallengeInfo.card.background,
                    borderColor: appColors.onboarding.gymChallengeInfo.card.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.howWeGetYouThereIcon,
                    { backgroundColor: appColors.onboarding.gymChallengeInfo.card.iconBackground },
                  ]}
                >
                  <Text
                    style={[
                      styles.howWeGetYouThereNumber,
                      { color: appColors.onboarding.gymChallengeInfo.card.iconText },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.howWeGetYouThereItem,
                    { color: appColors.onboarding.gymChallengeInfo.card.text },
                  ]}
                >
                  {item}
                </Text>
              </View>
            </AnimatedInfoCard>
          ))}
        </ScrollView>
      )}

      {currentStep.type === 'graph' && (
        <AnimatedGraphContainer>
          <LinearGradient
            colors={appColors.onboarding.graph.gradient.colors}
            locations={appColors.onboarding.graph.gradient.locations}
            start={appColors.onboarding.graph.gradient.start}
            end={appColors.onboarding.graph.gradient.end}
            style={styles.graphGradient}
          >
            <View style={styles.titleContainer}>
              <Text style={[styles.graphTitle, { color: appColors.onboarding.graph.title }]}>
                {i18n.t('onboarding.potentialGraph.chartTitle')}
              </Text>
            </View>
            <LineChart
              data={{
                labels: [
                  i18n.t('onboarding.potentialGraph.dayLabels.day3'),
                  '',
                  i18n.t('onboarding.potentialGraph.dayLabels.day14'),
                  '',
                  i18n.t('onboarding.potentialGraph.dayLabels.day30'),
                ],
                datasets: [
                  {
                    key: 'main-dataset',
                    data: [20, 25, 30, 58, 85],
                    color: () => '#000000',
                    strokeWidth: 3,
                  },
                  {
                    key: 'transparent-start',
                    data: [10],
                    withDots: false,
                    color: () => 'transparent',
                    strokeWidth: 0,
                  },
                  {
                    key: 'transparent-end',
                    data: [81],
                    withDots: false,
                    color: () => 'transparent',
                    strokeWidth: 0,
                  },
                ],
              }}
              fromZero={false}
              width={400}
              height={200}
              withHorizontalLabels={false}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundGradientFrom: appColors.onboarding.graph.chart.background,
                backgroundGradientTo: appColors.onboarding.graph.chart.background,
                backgroundGradientFromOpacity: 0,
                backgroundGradientToOpacity: 0,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: () => appColors.onboarding.graph.chart.labelColor,
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: '800',
                },
                style: {
                  borderRadius: 16,
                  paddingVertical: 40,
                  marginLeft: 20,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: appColors.onboarding.graph.chart.dotColor,
                  fill: appColors.onboarding.graph.chart.background,
                },
                fillShadowGradient: '#ffb86a',
                fillShadowGradientOpacity: 0.6,
                fillShadowGradientFrom: '#ffb86a',
                fillShadowGradientTo: '#e2e8f0',
              }}
              decorator={({ width, height }: { width: number; height: number }) => {
                const lineWidth = width * 0.7; // 70% of chart width
                const startX = (width - lineWidth) / 2; // center horizontally
                return (
                  <Line
                    key="decorator-line"
                    x1={startX}
                    y1={height - 34} // increased bottom margin
                    x2={startX + lineWidth}
                    y2={height - 34}
                    stroke="black"
                    strokeWidth="1"
                  />
                );
              }}
              renderDotContent={({ x, y, index }) => {
                // Check if this is the last data point (index 4 for the 5th data point)
                if (index === 4) {
                  return (
                    <View
                      key={`trophy-dot-${index}`}
                      style={[styles.customTrophyDot, { left: x - 18, top: y - 18 }]}
                    >
                      <View
                        style={[
                          styles.trophyDotBackground,
                          {
                            backgroundColor: appColors.onboarding.graph.chart.trophyBackground,
                            borderColor: appColors.onboarding.graph.chart.trophyBorder,
                          },
                        ]}
                      >
                        <Trophy size={20} color="#FFFFFF" />
                      </View>
                    </View>
                  );
                }
                return null;
              }}
              bezier
              style={styles.chart}
            />
            <Animated.Text
              style={[
                styles.graphSubtitle,
                { color: appColors.onboarding.graph.subtitle, opacity: graphSubtitleOpacity },
              ]}
            >
              {i18n.t('onboarding.potentialGraph.subtitle')}
            </Animated.Text>
          </LinearGradient>
        </AnimatedGraphContainer>
      )}

      {currentStep.type === 'options' &&
        (currentStep.id === 'language' ? (
          <FlatList
            data={(currentStep as OptionsStepConfig<keyof OnboardingData>).options}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item, index }) => {
              const selectedValue = onboardingData['language'] as any;
              return (
                <AnimatedOptionButton
                  onPress={() => handleSelectOptionStep(item.value)}
                  isSelected={selectedValue === item.value}
                  delay={index * 100}
                  hasIcon={!!(item.icon || item.iconImage)}
                >
                  <View
                    style={
                      currentStep.id === 'language' ||
                      currentStep.id === 'units' ||
                      currentStep.id === 'gender' ||
                      currentStep.id === 'ageRange'
                        ? styles.optionContentRowCentered
                        : styles.optionContentRow
                    }
                  >
                    {item.icon ? (
                      <View
                        style={[
                          styles.optionIconContainer,
                          {
                            backgroundColor:
                              selectedValue === item.value
                                ? appColors.onboarding.button.active.iconBackground
                                : appColors.onboarding.button.inactive.iconBackground,
                          },
                        ]}
                      >
                        {React.cloneElement(item.icon as React.ReactElement<any>, {
                          color:
                            selectedValue === item.value
                              ? appColors.onboarding.button.active.iconColor
                              : appColors.onboarding.button.inactive.iconColor,
                        })}
                      </View>
                    ) : item.iconImage ? (
                      <View
                        style={[
                          styles.optionIconContainer,
                          {
                            backgroundColor:
                              selectedValue === item.value
                                ? appColors.onboarding.button.active.iconBackground
                                : appColors.onboarding.button.inactive.iconBackground,
                          },
                        ]}
                      >
                        <Image
                          source={item.iconImage}
                          style={
                            [
                              styles.optionIconImage,
                              item.iconWidth ? { width: item.iconWidth } : undefined,
                              item.iconHeight ? { height: item.iconHeight } : undefined,
                            ] as any
                          }
                          contentFit="contain"
                        />
                      </View>
                    ) : null}
                    <View
                      style={
                        currentStep.id === 'language' ||
                        currentStep.id === 'units' ||
                        currentStep.id === 'gender' ||
                        currentStep.id === 'ageRange'
                          ? styles.optionTextContainerCentered
                          : styles.optionTextContainer
                      }
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color:
                              selectedValue === item.value
                                ? appColors.onboarding.button.active.text
                                : appColors.onboarding.button.inactive.text,
                            fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </View>
                </AnimatedOptionButton>
              );
            }}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator
            removeClippedSubviews
            windowSize={10}
            initialNumToRender={16}
            maxToRenderPerBatch={20}
            updateCellsBatchingPeriod={16}
            indicatorStyle={'black'}
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator
            persistentScrollbar
            scrollIndicatorInsets={{ right: 1 }}
            indicatorStyle={'black'}
            bounces
            alwaysBounceVertical={false}
            nestedScrollEnabled
          >
            {(currentStep as OptionsStepConfig<keyof OnboardingData>).options.map(
              (option, index) => {
                const step = currentStep as OptionsStepConfig<keyof OnboardingData>;
                const selectedValue = onboardingData[
                  step.preferenceKey as keyof OnboardingData
                ] as any;
                return (
                  <AnimatedOptionButton
                    key={String(option.value)}
                    onPress={() => handleSelectOptionStep(option.value)}
                    isSelected={selectedValue === option.value}
                    delay={index * 100}
                    style={option.description ? styles.optionWithDescription : undefined}
                    hasIcon={!!(option.icon || option.iconImage)}
                  >
                    <View
                      style={
                        currentStep.id === 'language' ||
                        currentStep.id === 'units' ||
                        currentStep.id === 'gender' ||
                        currentStep.id === 'ageRange'
                          ? styles.optionContentRowCentered
                          : styles.optionContentRow
                      }
                    >
                      {option.icon ? (
                        <View
                          style={[
                            styles.optionIconContainer,
                            {
                              backgroundColor:
                                selectedValue === option.value
                                  ? appColors.onboarding.button.active.iconBackground
                                  : appColors.onboarding.button.inactive.iconBackground,
                            },
                          ]}
                        >
                          {React.cloneElement(option.icon as React.ReactElement<any>, {
                            color:
                              selectedValue === option.value
                                ? appColors.onboarding.button.active.iconColor
                                : appColors.onboarding.button.inactive.iconColor,
                          })}
                        </View>
                      ) : option.iconImage ? (
                        <View
                          style={[
                            styles.optionIconContainer,
                            {
                              backgroundColor:
                                selectedValue === option.value
                                  ? appColors.onboarding.button.active.iconBackground
                                  : appColors.onboarding.button.inactive.iconBackground,
                            },
                          ]}
                        >
                          <Image
                            source={option.iconImage}
                            style={
                              [
                                styles.optionIconImage,
                                option.iconWidth ? { width: option.iconWidth } : undefined,
                                option.iconHeight ? { height: option.iconHeight } : undefined,
                              ] as any
                            }
                            contentFit="contain"
                          />
                        </View>
                      ) : null}
                      <View
                        style={
                          currentStep.id === 'language' ||
                          currentStep.id === 'units' ||
                          currentStep.id === 'gender' ||
                          currentStep.id === 'ageRange'
                            ? styles.optionTextContainerCentered
                            : styles.optionTextContainer
                        }
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color:
                                selectedValue === option.value
                                  ? appColors.onboarding.button.active.text
                                  : appColors.onboarding.button.inactive.text,
                              fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text
                            style={[
                              styles.optionDescription,
                              {
                                color:
                                  selectedValue === option.value
                                    ? appColors.onboarding.button.active.text
                                    : appColors.onboarding.button.inactive.text,
                              },
                            ]}
                          >
                            {option.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </AnimatedOptionButton>
                );
              }
            )}
          </ScrollView>
        ))}

      {currentStep.type === 'measurements' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.measurementsContentContainer}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical={false}
        >
          <View style={styles.measurementsRow}>
            <View style={styles.measurePickerSection}>
              <Text
                style={[
                  styles.pickerLabel,
                  { color: appColors.onboarding.measurements.pickerLabel },
                ]}
              >
                {i18n.t('onboarding.measurements.height')}
              </Text>
              <View style={styles.pickerWrapper}>
                {isMetric ? (
                  <Picker
                    selectedValue={(() => {
                      const current = getCurrentHeight() as number;
                      const base = 100;
                      const len = heightOptions.length;
                      const idx = Math.max(0, Math.min(len - 1, current - base));
                      return middleRepeatIndex * len + idx;
                    })()}
                    onValueChange={(value) => {
                      const len = heightOptions.length;
                      const optionIndex = Number(value) % len;
                      const selected = heightOptions[optionIndex];
                      handleHeightSelect(selected);
                    }}
                    style={[
                      styles.picker,
                      { color: appColors.onboarding.measurements.picker.text },
                    ]}
                    itemStyle={
                      Platform.OS === 'ios'
                        ? { color: appColors.onboarding.measurements.picker.itemText, fontSize: 14 }
                        : undefined
                    }
                    dropdownIconColor={appColors.onboarding.measurements.picker.dropdownIcon}
                  >
                    {Array.from(
                      { length: repeats * heightOptions.length },
                      (_, i) => heightOptions[i % heightOptions.length]
                    ).map((height, index) => (
                      <Picker.Item
                        key={`h-${index}`}
                        label={`${height} ${i18n.t('onboarding.measurements.cm')}`}
                        value={index}
                        color={appColors.onboarding.measurements.picker.itemText}
                      />
                    ))}
                  </Picker>
                ) : (
                  <View style={styles.imperialPickersContainer}>
                    <View style={styles.imperialPickerWrapper}>
                      <Picker
                        selectedValue={(() => {
                          const { feet } = getCurrentHeight() as { feet: number; inches: number };
                          const base = 1;
                          const len = feetOptions.length;
                          const idx = Math.max(0, Math.min(len - 1, feet - base));
                          return middleRepeatIndex * len + idx;
                        })()}
                        onValueChange={(value) => {
                          const len = feetOptions.length;
                          const optionIndex = Number(value) % len;
                          const selected = feetOptions[optionIndex];
                          handleFeetSelect(selected);
                        }}
                        style={[
                          styles.imperialPicker,
                          { color: appColors.onboarding.measurements.picker.text },
                        ]}
                        itemStyle={
                          Platform.OS === 'ios'
                            ? {
                                color: appColors.onboarding.measurements.picker.itemText,
                                fontSize: 14,
                              }
                            : undefined
                        }
                        dropdownIconColor={appColors.onboarding.measurements.picker.dropdownIcon}
                      >
                        {Array.from(
                          { length: repeats * feetOptions.length },
                          (_, i) => feetOptions[i % feetOptions.length]
                        ).map((feet, index) => (
                          <Picker.Item
                            key={`f-${index}`}
                            label={`${feet} ft`}
                            value={index}
                            color={appColors.onboarding.measurements.picker.itemText}
                          />
                        ))}
                      </Picker>
                    </View>
                    <View style={styles.imperialPickerWrapper}>
                      <Picker
                        selectedValue={(() => {
                          const { inches } = getCurrentHeight() as { feet: number; inches: number };
                          const base = 0;
                          const len = inchesOptions.length;
                          const idx = Math.max(0, Math.min(len - 1, inches - base));
                          return middleRepeatIndex * len + idx;
                        })()}
                        onValueChange={(value) => {
                          const len = inchesOptions.length;
                          const optionIndex = Number(value) % len;
                          const selected = inchesOptions[optionIndex];
                          handleInchesSelect(selected);
                        }}
                        style={[
                          styles.imperialPicker,
                          { color: appColors.onboarding.measurements.picker.text },
                        ]}
                        itemStyle={
                          Platform.OS === 'ios'
                            ? {
                                color: appColors.onboarding.measurements.picker.itemText,
                                fontSize: 14,
                              }
                            : undefined
                        }
                        dropdownIconColor={appColors.onboarding.measurements.picker.dropdownIcon}
                      >
                        {Array.from(
                          { length: repeats * inchesOptions.length },
                          (_, i) => inchesOptions[i % inchesOptions.length]
                        ).map((inches, index) => (
                          <Picker.Item
                            key={`i-${index}`}
                            label={`${inches} in`}
                            value={index}
                            color={appColors.onboarding.measurements.picker.itemText}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.measurePickerSection}>
              <Text
                style={[
                  styles.pickerLabel,
                  { color: appColors.onboarding.measurements.pickerLabel },
                ]}
              >
                {i18n.t('onboarding.measurements.weight')}
              </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={(() => {
                    const current = getCurrentWeight();
                    const base = isMetric ? 40 : 90;
                    const len = weightOptions.length;
                    const idx = Math.max(0, Math.min(len - 1, Math.round(current) - base));
                    return middleRepeatIndex * len + idx;
                  })()}
                  onValueChange={(value) => {
                    const len = weightOptions.length;
                    const optionIndex = Number(value) % len;
                    const selected = weightOptions[optionIndex];
                    handleWeightSelect(selected);
                  }}
                  style={[styles.picker, { color: appColors.onboarding.measurements.picker.text }]}
                  itemStyle={
                    Platform.OS === 'ios'
                      ? { color: appColors.onboarding.measurements.picker.itemText, fontSize: 14 }
                      : undefined
                  }
                  dropdownIconColor={appColors.onboarding.measurements.picker.dropdownIcon}
                >
                  {Array.from(
                    { length: repeats * weightOptions.length },
                    (_, i) => weightOptions[i % weightOptions.length]
                  ).map((weight, index) => (
                    <Picker.Item
                      key={`w-${index}`}
                      label={`${weight} ${isMetric ? i18n.t('onboarding.measurements.kg') : i18n.t('onboarding.measurements.lbs')}`}
                      value={index}
                      color={appColors.onboarding.measurements.picker.itemText}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {currentStep.type === 'rating' && (
        <ScrollView
          style={styles.ratingContainer}
          contentContainerStyle={styles.ratingContentContainer}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical={false}
          onScrollBeginDrag={() => {
            // Enable button immediately when user starts scrolling
            if (ratingTimerRef.current) {
              clearTimeout(ratingTimerRef.current);
              ratingTimerRef.current = null;
            }
            setRatingButtonDisabled(false);
          }}
        >
          {/* Rating Card */}
          <View style={styles.ratingCard}>
            {/* Left Feather */}
            <View style={styles.featherContainer}>
              <Image
                source={require('../../../assets/ratings/award-feather-left.svg')}
                style={styles.featherIcon}
                contentFit="contain"
              />
            </View>

            {/* Center Content */}
            <View style={styles.ratingCenter}>
              <Image
                source={require('../../../assets/ratings/5-stars.svg')}
                style={styles.starsIcon}
                contentFit="contain"
              />
            </View>

            {/* Right Feather */}
            <View style={styles.featherContainer}>
              <Image
                source={require('../../../assets/ratings/award-feather-right.svg')}
                style={styles.featherIcon}
                contentFit="contain"
              />
            </View>
          </View>

          <View style={styles.ratingMiddleTextContainer}>
            <Text style={styles.ratingMiddleText}>{i18n.t('onboarding.rating.middleText')}</Text>
          </View>

          {/* Overlapping Profile Images */}
          <View style={styles.profileImagesContainer}>
            <View style={[styles.profileImageWrapper, { zIndex: 0 }]}>
              <Image
                source={require('../../../assets/ratings/arian.png')}
                style={styles.profileImageCircle}
                contentFit="cover"
              />
            </View>
            <View style={[styles.profileImageWrapper, { zIndex: 1, marginLeft: -14 }]}>
              <Image
                source={require('../../../assets/ratings/catie.png')}
                style={styles.profileImageCircle}
                contentFit="cover"
              />
            </View>
            <View style={[styles.profileImageWrapper, { zIndex: 2, marginLeft: -14 }]}>
              <Image
                source={require('../../../assets/ratings/amit.png')}
                style={styles.profileImageCircle}
                contentFit="cover"
              />
            </View>
            <View style={[styles.profileImageWrapper, { zIndex: 3, marginLeft: -14 }]}>
              <Image
                source={require('../../../assets/ratings/sami.png')}
                style={styles.profileImageCircle}
                contentFit="cover"
              />
            </View>
          </View>

          {/* Testimonial Cards */}
          <AnimatedInfoCard delay={50}>
            <View style={styles.testimonialBoxOuter}>
              <LinearGradient
                colors={['#e2e8f0', '#f5f3ff']}
                locations={[0, 0.3]}
                style={styles.testimonialGradient}
                start={{ x: 0.6, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.testimonialHeader}>
                  <View style={styles.testimonialProfileImageWrapper}>
                    <Image
                      source={require('../../../assets/ratings/catie.png')}
                      style={styles.profileImageInner}
                      contentFit="cover"
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.nameStarsRow}>
                      <Text style={[styles.userName, { color: '#000000' }]}>Catie Mc Nama</Text>
                      <Image
                        source={require('../../../assets/ratings/5-stars.svg')}
                        style={styles.testimonialStarsIcon}
                        contentFit="contain"
                      />
                    </View>
                  </View>
                </View>
                <Text style={[styles.testimonialText, { color: '#000000' }]}>
                  As a gym girl that also dances I love this app. It lets me push harder in the gym
                  without the fear of injuring myself and not being able to compete.
                </Text>
              </LinearGradient>
            </View>
          </AnimatedInfoCard>

          {/* Second Testimonial */}
          <AnimatedInfoCard delay={100}>
            <View style={styles.testimonialBoxOuter}>
              <LinearGradient
                colors={['#e2e8f0', '#f5f3ff']}
                locations={[0, 0.3]}
                style={styles.testimonialGradient}
                start={{ x: 0.6, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.testimonialHeader}>
                  <View style={styles.testimonialProfileImageWrapper}>
                    <Image
                      source={require('../../../assets/ratings/kiril.png')}
                      style={styles.profileImageInner}
                      contentFit="cover"
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.nameStarsRow}>
                      <Text style={[styles.userName, { color: '#000000' }]}>Kiril D</Text>
                      <Image
                        source={require('../../../assets/ratings/5-stars.svg')}
                        style={styles.testimonialStarsIcon}
                        contentFit="contain"
                      />
                    </View>
                  </View>
                </View>
                <Text style={[styles.testimonialText, { color: '#000000' }]}>
                  Trying to get back into a sustainable routine is so much easier and motivating
                  with Form AI. Really helped me understand my technique and make it engaging while
                  saving $$$ on a personal trainer.
                </Text>
              </LinearGradient>
            </View>
          </AnimatedInfoCard>

          {/* Third Testimonial */}
          <AnimatedInfoCard delay={200}>
            <View style={[styles.testimonialBoxOuter, { marginBottom: 20 }]}>
              <LinearGradient
                colors={['#e2e8f0', '#f5f3ff']}
                locations={[0, 0.3]}
                style={styles.testimonialGradient}
                start={{ x: 0.6, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.testimonialHeader}>
                  <View style={styles.testimonialProfileImageWrapper}>
                    <Image
                      source={require('../../../assets/ratings/sami.png')}
                      style={styles.profileImageInner}
                      contentFit="cover"
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.nameStarsRow}>
                      <Text style={[styles.userName, { color: '#000000' }]}>Sami Syed</Text>
                      <Image
                        source={require('../../../assets/ratings/5-stars.svg')}
                        style={styles.testimonialStarsIcon}
                        contentFit="contain"
                      />
                    </View>
                  </View>
                </View>
                <Text style={[styles.testimonialText, { color: '#000000' }]}>
                  Simple way to actually understand how to improve form in the gym. Use it daily
                  now, I've noticed I'm much more aware of my technique.
                </Text>
              </LinearGradient>
            </View>
          </AnimatedInfoCard>
        </ScrollView>
      )}

      {currentStep.type === 'referral' && (
        <View style={styles.referralContainer}>
          <View style={styles.searchInputContainer}>
            <View style={styles.inputBackground}>
              <TextInput
                style={styles.searchInput}
                placeholder={i18n.t('onboarding.referralCode.placeholder')}
                placeholderTextColor="#8E8E93"
                value={referralCode}
                onChangeText={(text) => setReferralCode(text.replace(/\s/g, '').toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="ascii-capable"
                maxLength={16}
                editable={!referralValidating}
              />
              {referralCode.length > 0 && (
                <View style={styles.inputButtonsContainer}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      hapticFeedback.selection();
                      setReferralCode('');
                      setReferralError(false);
                      Keyboard.dismiss();
                    }}
                    disabled={referralValidating}
                    activeOpacity={0.7}
                  >
                    <X width={20} height={20} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.applyButton, applyButtonLoading && styles.applyButtonLoading]}
                    onPress={() => {
                      hapticFeedback.selection();
                      handleApplyReferralCode();
                    }}
                    disabled={applyButtonLoading || referralValidating}
                    activeOpacity={0.8}
                  >
                    {applyButtonLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {currentStep.type === 'allDone' && (
        <View style={styles.allDoneContainer}>
          {/* Confetti animation positioned behind content */}
          {showAllDoneConfetti && (
            <View style={styles.animationContainer}>
              <LottieView
                source={require('../../../assets/animations/confetti.json')}
                autoPlay
                loop={false}
                speed={0.7}
                style={styles.confettiAnimation}
              />
            </View>
          )}

          <View style={styles.allDoneContent}>
            {/* Header with checkmark and "All done!" text */}
            <View style={styles.header}>
              <CircleCheck size={36} color={appColors.onboarding.allDone.checkmarkColor} />
              <Text
                style={[styles.allDoneText, { color: appColors.onboarding.allDone.allDoneText }]}
              >
                {i18n.t('onboarding.allDone.allDone')}
              </Text>
            </View>

            {/* Main thank you message */}
            <Text
              style={[styles.thankYouText, { color: appColors.onboarding.allDone.thankYouText }]}
            >
              {i18n.t('onboarding.allDone.thankYou')}
            </Text>

            {/* Privacy message */}
            <Text style={[styles.privacyText, { color: appColors.onboarding.allDone.privacyText }]}>
              {i18n.t('onboarding.allDone.privacy')}
            </Text>
          </View>
        </View>
      )}

      {currentStep.type === 'progressTracking' && <AnimatedProgressTrackingImage />}

      {currentStep.type === 'saveProgress' && (
        <CreateAccountScreen
          onNext={() => {
            // Navigate to account loading screen first, then to payment
            navigation.navigate('AccountLoading' as never);
          }}
          onBack={() => {
            // Navigate to AllDone screen
            navigation.navigate('AllDone' as never);
          }}
        />
      )}

      {currentStep.type === 'notificationPermission' && (
        <PermissionContainer
          title={i18n.t('onboarding.notificationPermission.title')}
          dialogText={i18n.t('onboarding.notificationPermission.dialogText')}
          fingerTranslateY={fingerTranslateY}
          allowButtonText={i18n.t('onboarding.notificationPermission.allow')}
          dontAllowButtonText={i18n.t('onboarding.notificationPermission.dontAllow')}
          isLoading={notificationPermissionLoading}
          isDontAllowLoading={notificationDontAllowLoading}
          onDontAllow={async () => {
            setNotificationDontAllowLoading(true);

            // Set 7-second timeout for loading icon
            const loadingTimeout = setTimeout(() => {
              setNotificationDontAllowLoading(false);
            }, 5000);

            try {
              const result = await Notifications.requestPermissionsAsync();
              const granted = result.granted === true;
              const canAskAgain = (result as any)?.canAskAgain !== false ? true : false;
              setNotificationPermissionStatus(granted ? 'granted' : 'denied');
              setCanAskNotificationAgain(canAskAgain);
              trackPermission('notifications', granted, 'notificationPermission');

              // Let the auto-advance logic handle navigation
            } catch (error) {
              trackPermission(
                'notifications',
                false,
                'notificationPermission',
                error instanceof Error ? error.message : 'Unknown error'
              );
              // Let the auto-advance logic handle navigation
            } finally {
              clearTimeout(loadingTimeout);
            }
          }}
          onAllow={async () => {
            setNotificationPermissionLoading(true);

            // Set 7-second timeout for loading icon
            const loadingTimeout = setTimeout(() => {
              setNotificationPermissionLoading(false);
            }, 5000);

            try {
              const result = await Notifications.requestPermissionsAsync();
              const granted = result.granted;
              const canAskAgain = (result as any)?.canAskAgain !== false ? true : false;
              setNotificationPermissionStatus(granted ? 'granted' : 'denied');
              setCanAskNotificationAgain(canAskAgain);
              trackPermission('notifications', granted, 'notificationPermission');
              // Let the auto-advance logic handle navigation
            } catch (error) {
              trackPermission(
                'notifications',
                false,
                'notificationPermission',
                error instanceof Error ? error.message : 'Unknown error'
              );
              // Let the auto-advance logic handle navigation
            } finally {
              clearTimeout(loadingTimeout);
            }
          }}
        />
      )}

      {currentStep.type === 'cameraPermission' && (
        <PermissionContainer
          title={i18n.t('onboarding.cameraPermission.title')}
          dialogText={i18n.t('onboarding.cameraPermission.dialogText')}
          fingerTranslateY={fingerTranslateY}
          allowButtonText={i18n.t('onboarding.cameraPermission.allow')}
          dontAllowButtonText={i18n.t('onboarding.cameraPermission.dontAllow')}
          disableDontAllowButton={false}
          onDontAllow={() => {
            hapticFeedback.selection();
            Alert.alert(
              i18n.t('onboarding.cameraPermission.permissionRequired'),
              i18n.t('onboarding.cameraPermission.permissionRequiredMessage')
            );
          }}
          onAllow={async () => {
            await requestCameraPermissionAndProceed(() => handleNext());
          }}
        />
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  optionWithDescription: {
    minHeight: 80,
    justifyContent: 'center',
  },
  optionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionContentRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally
    gap: 12,
  },
  optionTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  optionTextContainerCentered: {
    flex: 1,
    alignItems: 'center', // Center text content
  },
  optionIconImage: {
    // Custom dimensions can be overridden by passing specific width/height in the options
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  optionDescription: {
    fontSize: 14,
  },
  // Measurements styles
  measurementsContentContainer: {
    marginTop: 20,
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  measurementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  measurePickerSection: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 280 : 80,
    width: '100%',
  },
  imperialPickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 30,
  },
  imperialPickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  imperialPicker: {
    height: Platform.OS === 'ios' ? 280 : 80,
    width: 90,
    minWidth: 80,
  },
  // Rating styles
  ratingContainer: {
    flexGrow: 1,
  },
  ratingContentContainer: {
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 2,
    gap: 12,
  },
  ratingCard: {
    width: '100%',
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  featherContainer: {
    flex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featherIcon: {
    width: 40,
    height: 60,
  },
  ratingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
    marginBottom: 5,
  },
  ratingNumber: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  starsIcon: {
    width: 140,
    height: 33,
  },
  ratingMiddleTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  ratingMiddleText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    width: '80%',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileImagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profileImageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  profileImageCircle: {
    width: '100%',
    height: '100%',
  },
  lottieContainer: {
    alignItems: 'center',
    marginTop: -120,
  },
  // Referral styles
  referralContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  searchInputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 60,
  },
  inputBackground: {
    width: '100%',
    height: 70,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: '#F0F0F0',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlignVertical: 'center',
    paddingVertical: 0,
  },
  inputButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80, // Fixed width to prevent shrinking
    height: 45, // Fixed height for consistency
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  applyButtonLoading: {
    opacity: 0.7,
  },
  clearButton: {
    padding: 5,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  // Testimonial styles
  testimonialBoxOuter: {
    marginTop: 4,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  testimonialGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  testimonialProfileImageWrapper: {
    width: 46,
    height: 46,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  profileImageInner: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userStars: {
    fontSize: 14,
    color: '#FFD700', // Gold color for stars
  },
  testimonialStarsIcon: {
    width: 85,
    height: 24,
  },
  testimonialText: {
    fontSize: 17,
    lineHeight: 23,
  },
  nameStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allDoneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDoneContent: {
    alignItems: 'center',
    maxWidth: 340,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  allDoneText: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  thankYouText: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  privacyText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    lineHeight: 22,
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -10,
  },
  confettiAnimation: {
    width: 700,
    height: 700,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.onboarding.button.inactive.iconBackground,
    borderRadius: 20,
  },
  // Info step styles
  infoStepContainer: {
    marginTop: -30,
    flex: 1,
    justifyContent: 'center',
  },
  whiteBackgroundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  comparisonCard: {
    borderRadius: 20,
    padding: 24,
  },
  whiteBoxContainer: {
    height: 240,
    backgroundColor: appColors.onboarding.comparison.whiteBox.background,
    borderRadius: 18,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 24,
  },
  comparisonSection: {
    flex: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    paddingTop: 10,
    width: 80,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  percentageBox: {
    width: 125,
    height: 150,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
    margin: 0,
    marginTop: 'auto',
    marginBottom: -2,
    marginHorizontal: -2,
  },
  percentageText: {
    fontSize: 20,
    fontWeight: '700',
  },
  formaiBox: {
    width: 125,
    height: 50,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    marginTop: 'auto',
    marginBottom: -2,
    marginHorizontal: -2,
  },
  formaiText: {
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sourceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  // Perfect form goal message styles
  perfectFormGoalMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  perfectFormGoalMessageContent: {
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
    zIndex: 2,
    position: 'relative',
  },
  perfectFormGoalMessageTitle: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    width: '100%',
  },
  perfectFormGoalMessageSubtitle: {
    width: '80%',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  highlightedText: {
    fontWeight: '800',
  },
  // Graph styles
  graphContainer: {
    marginTop: -40,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphGradient: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 350,
    position: 'relative',
  },
  chart: {
    borderRadius: 16,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  graphTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 16,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  graphSubtitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    lineHeight: 22,
  },
  trophyContainer: {
    position: 'absolute',
    top: '5%',
    right: '10%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  trophyIcon: {
    fontSize: 16,
  },
  customTrophyDot: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  trophyDotBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fe9a00',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Gym challenge info styles
  gymChallengeInfoContainer: {
    marginTop: -50,
    flex: 1,
  },
  gymChallengeInfoContent: {
    paddingTop: 0,
    gap: 8,
    paddingBottom: 20,
  },
  gymChallengeInfoCard: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  gymChallengeInfoHeadline: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  gymChallengeInfoMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  howWeGetYouThereTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  howWeGetYouThereCard: {
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 22,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  howWeGetYouThereIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  howWeGetYouThereNumber: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  howWeGetYouThereItem: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
  },
  // Progress tracking styles
  progressTrackingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressTrackingImage: {
    width: '100%',
    height: 450,
    maxWidth: 500,
  },
});
