import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Share,
  Zap,
  BicepsFlexed,
  Video,
  Flame,
  Ghost,
  Dumbbell,
} from 'lucide-react-native';
import i18n from '../../utils/i18n';
import { hapticFeedback } from '../../utils/haptic';
import { track } from '../../services/analytics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { FormAILogo } from './FormAILogo';

interface LiftData {
  liftDate: string; // DD-MM-YYYY format
  metricWeight: number;
  reps: number;
  liftType: string;
  analysis?: {
    accuracy: number;
  };
}

interface WrappedProps {
  totalVideos: number;
  totalReps: number;
  totalWeightMoved: number;
  favouriteLift: string | null;
  longestStreak: number;
  longestBreak: number;
  distinctLiftTypes: number;
  personality: string;
  unitSystem?: 'metric' | 'imperial';
  liftData?: LiftData[];
  selectedYear?: string;
}

export const Wrapped = forwardRef<any, WrappedProps>(
  (
    {
      totalVideos,
      totalReps,
      totalWeightMoved,
      favouriteLift,
      longestStreak,
      longestBreak,
      distinctLiftTypes,
      personality,
      unitSystem = 'metric',
      liftData = [],
      selectedYear,
    },
    ref
  ) => {
    // Use the selectedYear prop directly
    const currentSelectedYear = selectedYear || new Date().getFullYear().toString();
    const [showShareOverlay, setShowShareOverlay] = useState(false);
    const shareAreaRef = useRef<View>(null);

    // Helper function to get personality display text
    const getPersonalityText = (personalityType: string) => {
      switch (personalityType) {
        case 'morningBird':
          return i18n.t('performance.morningBird');
        case 'lunchMonster':
          return i18n.t('performance.lunchMonster');
        case 'nightMachine':
          return i18n.t('performance.nightMachine');
        default:
          return i18n.t('performance.morningBird');
      }
    };

    // Filter lift data by selected year
    const filteredLiftData = useMemo(() => {
      if (!liftData || !Array.isArray(liftData)) {
        return [];
      }
      if (currentSelectedYear === 'all') return liftData;
      return liftData.filter((lift) => lift.liftDate.split('-')[2] === currentSelectedYear);
    }, [liftData, currentSelectedYear]);

    // Use the props passed from parent, but calculate average accuracy from filtered data
    const filteredMetrics = useMemo(() => {
      // Calculate average accuracy from filtered data
      const validAccuracies = filteredLiftData
        .map((lift) => lift.analysis?.accuracy)
        .filter((accuracy): accuracy is number => typeof accuracy === 'number' && !isNaN(accuracy));

      const averageAccuracy =
        validAccuracies.length > 0
          ? Math.round(validAccuracies.reduce((sum, acc) => sum + acc, 0) / validAccuracies.length)
          : 0;

      return {
        totalVideos,
        totalReps,
        totalWeightMoved,
        favouriteLift,
        averageAccuracy,
      };
    }, [filteredLiftData, totalVideos, totalReps, totalWeightMoved, favouriteLift]);

    // Render function for shareable content (includes overview title, logo, year)
    const renderShareableCards = () => (
      <View style={styles.shareableBackground}>
        {/* Overview Title */}
        <Text style={styles.overviewTitle}>{i18n.t('performance.myOverview')}</Text>

        {/* Videos and Reps Row */}
        <View style={styles.statsRow}>
          {/* Videos Card */}
          <View
            style={[styles.statCard, styles.cardShadow, styles.videosCardSolid, styles.solidCard]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.videos')}</Text>
            <View style={styles.solidCardValueContainer}>
              <Text style={styles.solidCardValue}>{filteredMetrics.totalVideos || 0}</Text>
              <Video width={24} height={24} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </View>
          </View>

          {/* Reps Card */}
          <View
            style={[styles.statCard, styles.cardShadow, styles.repsCardSolid, styles.solidCard]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.reps')}</Text>
            <View style={styles.solidCardValueContainer}>
              <Text style={styles.solidCardValue}>{filteredMetrics.totalReps || 0}</Text>
            </View>
          </View>
        </View>

        {/* Total Weight and Accuracy Row */}
        <View style={styles.weightAccuracyRow}>
          {/* Total Weight Moved Card - 70% */}
          <View
            style={[
              styles.totalWeightCard,
              styles.cardShadow,
              styles.weightCard70,
              styles.totalWeightCardSolid,
              styles.solidCard,
            ]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.totalWeight')}</Text>
            <View style={styles.solidCardValueContainer}>
              <Text style={styles.solidCardValue}>
                {unitSystem === 'imperial'
                  ? Math.round((filteredMetrics.totalWeightMoved || 0) * 2.20462).toLocaleString()
                  : Math.round(filteredMetrics.totalWeightMoved || 0).toLocaleString()}{' '}
                {unitSystem === 'imperial' ? i18n.t('feedback.lbs') : i18n.t('feedback.kg')}
              </Text>
              <BicepsFlexed width={24} height={24} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </View>
          </View>

          {/* Accuracy Card - 30% */}
          <View
            style={[
              styles.accuracyCard,
              styles.cardShadow,
              styles.accuracyCard30,
              styles.accuracyCardSolid,
            ]}
          >
            <View style={styles.accuracyHeaderRow}>
              <Text style={styles.accuracyTitle}>{i18n.t('performance.accuracy')}</Text>
            </View>
            <View style={styles.accuracyValueContainer}>
              <Text style={styles.accuracyValue}>{filteredMetrics.averageAccuracy || 0}%</Text>
              <Zap width={24} height={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Lifts and Favourite Row */}
        <View style={styles.statsRow}>
          {/* Lifts Card */}
          <View
            style={[styles.statCard, styles.cardShadow, styles.liftsCardSolid, styles.solidCard]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.lifts')}</Text>
            <View style={styles.solidCardValueContainer}>
              <Text style={styles.solidCardValue}>{distinctLiftTypes || 0}</Text>
              <Dumbbell width={24} height={24} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </View>
          </View>

          {/* Favourite Exercise Card */}
          <View
            style={[
              styles.statCard,
              styles.cardShadow,
              styles.favouriteExerciseCard,
              styles.solidCard,
            ]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.favouriteExercise')}</Text>
            <View style={styles.solidCardValueContainer}>
              <View style={styles.favouriteExerciseValueWrapper}>
                <Text style={styles.solidCardValue}>
                  {filteredMetrics.favouriteLift || i18n.t('performance.noData')}
                </Text>
              </View>
              {filteredMetrics.favouriteLift && (
                <Crown
                  width={24}
                  height={24}
                  color="#FFFFFF"
                  style={{ marginLeft: 8, flexShrink: 0 }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Streak and Break Row */}
        <View style={styles.statsRow}>
          {/* {i18n.t('performance.longestStreak')} Card */}
          <View
            style={[
              styles.statCard,
              styles.cardShadow,
              styles.longestStreakCardSolid,
              styles.solidCard,
            ]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.longestStreak')}</Text>
            <View style={styles.solidCardValueContainer}>
              <Text style={styles.solidCardValue}>{longestStreak || 0}</Text>
              <Flame width={24} height={24} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </View>
          </View>

          {/* {i18n.t('performance.longestBreak')} Card */}
          <View
            style={[
              styles.statCard,
              styles.cardShadow,
              styles.longestBreakCardSolid,
              styles.solidCard,
            ]}
          >
            <Text style={styles.solidCardTitle}>{i18n.t('performance.longestBreak')}</Text>
            <View style={styles.solidCardValueContainer}>
              <Text style={styles.solidCardValue}>
                {longestBreak === 0 ? i18n.t('performance.none') : longestBreak}
              </Text>
              <Ghost width={24} height={24} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </View>
          </View>
        </View>

        {/* Personality, Logo and Year Row */}
        <View style={styles.weightAccuracyRow}>
          {/* Left side - Two horizontal cards */}
          <View style={styles.leftCardsContainer}>
            {/* Personality Card */}
            <View
              style={[
                styles.statCard,
                styles.cardShadow,
                styles.personalityCard,
                styles.personalityCardSolid,
                styles.solidCard,
              ]}
            >
              <Text style={styles.solidCardTitle}>{i18n.t('performance.personality')}</Text>
              <View style={styles.solidCardValueContainer}>
                <Text style={styles.solidCardValue}>{getPersonalityText(personality)}</Text>
              </View>
            </View>

            {/* FormAI Logo Card */}
            <View
              style={[
                styles.statCard,
                styles.cardShadow,
                styles.logoCard,
                styles.logoCardSolid,
                styles.solidCard,
              ]}
            >
              <Text style={styles.logoCardTitle}>{i18n.t('performance.thankYou')}</Text>
              <View style={styles.logoContainer}>
                <FormAILogo iconSize={32} textStyle={styles.logoTextGray} />
              </View>
            </View>
          </View>

          {/* Year Card - 35% width with vertical text */}
          <View style={[styles.accuracyCard, styles.cardShadow, styles.yearCard]}>
            <LinearGradient
              colors={['#f6339a', '#fb2c36', '#ff6900', '#fe9a00']}
              locations={[0, 0.5, 0.8, 1]}
              style={styles.yearGradientFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.yearContainer}>
                <View style={styles.verticalTextContainer}>
                  <Text style={styles.verticalYearText} numberOfLines={1}>
                    {selectedYear === 'all'
                      ? i18n.t('performance.timeRanges.allTime')
                      : selectedYear}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>
    );

    const handleShare = async () => {
      try {
        hapticFeedback.selection();
        track('Wrapped share tapped', { year: currentSelectedYear });

        setShowShareOverlay(true); // mount the hidden white version
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); // wait a frame

        const uri = await captureRef(shareAreaRef, {
          format: 'png',
          quality: 1,
          fileName: `lift-wrapped-${currentSelectedYear}`,
          result: 'tmpfile',
        });

        setShowShareOverlay(false);

        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert('Sharing not available on this device.');
          return;
        }

        await Sharing.shareAsync(uri, {
          dialogTitle: i18n.t('performance.shareWrapped') || 'Share your Wrapped',
          mimeType: 'image/png',
          UTI: 'public.png', // iOS
        });
      } catch (e: any) {
        setShowShareOverlay(false);
        Alert.alert(
          i18n.t('performance.shareError'),
          e?.message ?? i18n.t('performance.unknownError')
        );
      }
    };

    // Expose handleShare function to parent components
    useImperativeHandle(ref, () => ({
      handleShare,
    }));
    return (
      <View style={styles.container}>
        {/* Visible Cards - Now showing shareable content with white background */}
        <View style={styles.mainCardContainer}>{renderShareableCards()}</View>

        {/* Hidden white overlay used only for capture */}
        {showShareOverlay && (
          <View
            ref={shareAreaRef}
            collapsable={false}
            pointerEvents="none"
            style={styles.shareOverlay}
          >
            {renderShareableCards()}
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 50,
  },
  mainCardContainer: {
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'visible',
  },
  shareOverlay: {
    position: 'absolute',
    left: -9999, // offscreen so it won't flash
    top: 0,
    width: 390, // optional: force export size
    borderRadius: 20,
  },
  shareableBackground: {
    padding: 16,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  statCard: {
    flex: 0,
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 80,
  },
  weightAccuracyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  totalWeightCard: {
    borderRadius: 20,
    minHeight: 80,
  },
  weightCard70: {
    flex: 0.65,
  },
  accuracyCard: {
    borderRadius: 20,
    minHeight: 80,
  },
  accuracyCard30: {
    flex: 0.35,
  },
  accuracyCardSolid: {
    backgroundColor: '#fccee8',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accuracyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accuracyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
  },
  accuracyValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accuracyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  leftCardsContainer: {
    flex: 1,
    gap: 6,
  },
  personalityCard: {
    flex: 0,
    minHeight: 80,
    width: '100%',
  },
  logoCard: {
    flex: 1,
    width: '100%',
    minHeight: 80,
  },
  // Generic solid card styles
  solidCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  solidCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 8,
    textAlign: 'left',
  },
  solidCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'left',
  },
  solidCardValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  logoCardSolid: {
    backgroundColor: '#cad5e2',
  },
  logoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 8,
    textAlign: 'left',
  },
  logoTextGray: {
    color: '#000000',
    fontSize: 30,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  favouriteExerciseCard: {
    backgroundColor: '#74d4ff',
  },
  personalityCardSolid: {
    backgroundColor: '#46ecd5',
  },
  longestStreakCardSolid: {
    backgroundColor: '#ffb86a',
  },
  longestBreakCardSolid: {
    backgroundColor: '#ffa2a2',
  },
  totalWeightCardSolid: {
    backgroundColor: '#5ee9b5',
  },
  liftsCardSolid: {
    backgroundColor: '#f4a8ff',
  },
  repsCardSolid: {
    backgroundColor: '#c4b4ff',
  },
  videosCardSolid: {
    backgroundColor: '#ffd230',
  },
  logoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  favouriteExerciseValueWrapper: {
    flexBasis: '70%',
    flexGrow: 0,
    flexShrink: 1,
  },
  logoText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  logoWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearCard: {
    width: 100,
    flexShrink: 0,
    minHeight: 170,
  },
  yearContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalTextContainer: {
    transform: [{ rotate: '-90deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalYearText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'center',
  },
  yearGradientFill: {
    flex: 1,
    borderRadius: 20,
    padding: 0,
  },
  overviewTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 16,
  },
});
