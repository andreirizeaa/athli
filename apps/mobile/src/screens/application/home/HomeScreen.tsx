import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FormAILogo } from '../../../components/ui/FormAILogo';
import { LiftCard } from '../../../components/ui/LiftCard';
import { StreakModal } from '../../../components/ui/modals/StreakModal';
import { SwipeableAccuracyCard } from '../../../components/ui/swipeables/SwipeableAccuracyCard';
import { SwipeableCalendar } from '../../../components/ui/swipeables/SwipeableCalendar';
import { ILiftData, useLiftData } from '../../../context/LiftDataContext';
import { useLoadingLifts } from '../../../context/LoadingLiftsContext';
import { useSelectedDate } from '../../../context/SelectedDateContext';
import { useTutorialTarget } from '../../../context/TutorialContext';
import { useUserCheckIns } from '../../../context/UserCheckInsContext';
import { identify, track } from '../../../services/analytics';
import { getUserId } from '../../../services/storageService';
import { LoadingLiftData } from '../../../types/Lifts.d';
import { hapticFeedback } from '../../../utils/haptic';

// Type guard for loading lifts
function isLoadingLift(x: ILiftData | LoadingLiftData): x is LoadingLiftData {
  return 'status' in x;
}

// Helper function to parse 12-hour format time strings (e.g., "9:56 AM", "2:45 PM")
function parseTimeString(timeString: string): number {
  try {
    // Create a date object for today with the parsed time
    const today = new Date();
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, minutes);
    return date.getTime();
  } catch (error) {
    // Fallback to current time if parsing fails
    return Date.now();
  }
}

// Helper function to track permission requests
function trackPermission(type: string, granted: boolean, stepId: string, error?: string) {
  track('Permissions', {
    permission_type: type,
    step_id: stepId,
    step_index: 0, // Home screen
    granted: granted,
    error: error || null,
  });
}

// Helper function to request tracking permission safely
async function requestTrackingPermissionSafe() {
  if (Platform.OS !== 'ios') {
    // track/skip gracefully on non-iOS platforms
    trackPermission('tracking_transparency', false, 'home');

    // Always identify user for analytics
    const userId = await getUserId();
    if (userId) {
      identify(userId);
    }

    return { status: 'unavailable' };
  }

  try {
    // Check existing status first
    const { status: existing } = await getTrackingPermissionsAsync();
    if (existing === 'granted' || existing === 'denied') {
      const granted = existing === 'granted';
      trackPermission('tracking_transparency', granted, 'home');

      // Always identify user for analytics
      const userId = await getUserId();
      if (userId) {
        identify(userId);
      }

      return { status: existing };
    }

    // Only prompt if still 'not-determined'
    const result = await requestTrackingPermissionsAsync();
    const granted = result.status === 'granted';
    trackPermission('tracking_transparency', granted, 'home');

    // Always identify user for analytics
    const userId = await getUserId();
    if (userId) {
      identify(userId);
    }

    return result;
  } catch (error) {
    // Never crash the UI
    console.warn('ATT request failed:', error);
    trackPermission(
      'tracking_transparency',
      false,
      'home',
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Always identify user for analytics even if permission request fails
    const userId = await getUserId();
    if (userId) {
      identify(userId);
    }

    return { status: 'unavailable' };
  }
}

import LottieView from 'lottie-react-native';
import { FileVideoCamera } from 'lucide-react-native';
import i18n from '../../../utils/i18n';

interface HomeScreenProps {
  onShowFeedback: (liftData: ILiftData) => void;
  onShowFeedbackSlideshow: () => void;
  onShowLibrary: () => void;
  onShowShare: () => void;
  onTriggerAddOptions: () => void;
  onNavigateToPerformance: () => void;
}

export function HomeScreen({
  onShowFeedback,
  onShowFeedbackSlideshow,
  onShowLibrary,
  onShowShare,
  onTriggerAddOptions,
  onNavigateToPerformance,
}: HomeScreenProps) {
  const {
    loadingLifts,
    showStreakModal,
    closeStreakModal,
    handleStreakModalContinue,
    removeLift: removeLoadingLift,
    setHomeActive,
  } = useLoadingLifts();
  const {
    liftData,
    getLiftsByDate,
    refreshLifts,
    removeLift,
    invalidateAndRefetch: invalidateLifts,
  } = useLiftData();
  const { currentStreak, invalidateAndRefetch: invalidateCheckIns } = useUserCheckIns();
  const { selectedDate, setSelectedDate } = useSelectedDate();

  // Fire card popup state - manual trigger for fire card press
  const [isFirePopupVisible, setIsFirePopupVisible] = useState(false);

  // Accuracy card swipe state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Confetti animation state
  const [showConfetti, setShowConfetti] = useState(false);

  // Tracking permission state
  const [hasRequestedTrackingPermission, setHasRequestedTrackingPermission] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ScrollView ref for gesture handling
  const scrollViewRef = useRef<ScrollView>(null);

  // Tutorial target ref for the "see all lifts" button
  const { ref: seeAllLiftsRef } = useTutorialTarget('home_see_all_lifts');

  // Lifts for the selected date from LiftDataContext only
  const liftsForSelectedDate: ILiftData[] = getLiftsByDate(selectedDate);

  // Combined lifts for seamless transition - loading lifts + final lifts (excluding duplicates)
  const combinedLiftsForDay = useMemo(() => {
    // loading lifts are already filtered by selected date in context
    const loading = loadingLifts;

    // Stable keys: never replace the completed loading card with final ILiftData
    const completedFinalIds = new Set(
      loading.filter((l) => l.status === 'completed' && l.finalData?.id).map((l) => l.finalData!.id)
    );

    // Show all loading cards (including completed-with-finalData)
    const loadingCards = loading;

    // Only add final ILiftData that don't have a completed twin
    const additionalFinals = liftsForSelectedDate.filter((l) => !completedFinalIds.has(l.id));

    // Combine all lifts
    const allLifts = [...loadingCards, ...additionalFinals];

    // Sort by time - earliest first (top), latest last (bottom)
    return allLifts.sort((a, b) => {
      let aTime: number;
      let bTime: number;

      if (isLoadingLift(a)) {
        // For loading lifts, use enqueuedAt or fallback to id timestamp
        aTime = a.enqueuedAt ?? parseInt(a.id.split('-')[0]);
      } else {
        // For final lifts, parse 12-hour format liftTime (e.g., "9:56 AM", "2:45 PM")
        aTime = parseTimeString(a.liftTime);
      }

      if (isLoadingLift(b)) {
        // For loading lifts, use enqueuedAt or fallback to id timestamp
        bTime = b.enqueuedAt ?? parseInt(b.id.split('-')[0]);
      } else {
        // For final lifts, parse 12-hour format liftTime (e.g., "9:56 AM", "2:45 PM")
        bTime = parseTimeString(b.liftTime);
      }

      return aTime - bTime; // Ascending order (earliest first)
    });
  }, [loadingLifts, liftsForSelectedDate]);

  // Calculate average accuracy for the selected date
  const averageAccuracy = useMemo(() => {
    return liftsForSelectedDate.length > 0
      ? Math.round(
          liftsForSelectedDate.reduce((sum, lift) => sum + lift.analysis.accuracy, 0) /
            liftsForSelectedDate.length
        )
      : 0;
  }, [liftsForSelectedDate]);

  // Calculate average accuracy for all lifts across all dates
  const allTimeAverageAccuracy = useMemo(() => {
    return liftData.length > 0
      ? Math.round(
          liftData.reduce((sum, lift) => sum + lift.analysis.accuracy, 0) / liftData.length
        )
      : 0;
  }, [liftData]);

  // Format selected date with i18n support
  const formatSelectedDate = useCallback(() => {
    const day = selectedDate.getDate();
    const monthIndex = selectedDate.getMonth();

    // Get month names from i18n
    const monthKeys = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    const month = i18n.t(`home.dateFormat.months.${monthKeys[monthIndex]}`);

    // Get "lifts" text from i18n
    const liftsText = i18n.t('home.dateFormat.lifts');

    // For languages that don't use ordinal suffixes, just use the day number
    // For English, we'll keep the ordinal suffixes for now, but this can be made more flexible
    const currentLanguage = i18n.locale;

    if (currentLanguage === 'en') {
      // English ordinal suffixes
      let suffix = 'th';
      if (day === 1 || day === 21 || day === 31) suffix = 'st';
      else if (day === 2 || day === 22) suffix = 'nd';
      else if (day === 3 || day === 23) suffix = 'rd';
      return `${day}${suffix} ${month} ${liftsText}`;
    } else {
      // For other languages, just use day number
      return `${day} ${month} ${liftsText}`;
    }
  }, [selectedDate]);

  // Different data for each card
  const cardData = useMemo(
    () => [
      {
        percentage: averageAccuracy,
        label:
          liftsForSelectedDate.length > 0
            ? i18n.t('home.dailyAccuracyLevel')
            : i18n.t('home.noLiftsToday'),
      },
      { percentage: allTimeAverageAccuracy, label: i18n.t('home.allTimeAccuracy') },
    ],
    [averageAccuracy, allTimeAverageAccuracy, liftsForSelectedDate.length]
  );

  // Animation values for each lift card - recreate when lifts change
  const liftAnimations = useRef<RNAnimated.Value[]>([]);
  const fadeAnimations = useRef<RNAnimated.Value[]>([]);

  // Update animation arrays when lifts change
  useEffect(() => {
    const newLiftAnimations = liftsForSelectedDate.map(() => new RNAnimated.Value(0));
    const newFadeAnimations = liftsForSelectedDate.map(() => new RNAnimated.Value(0));

    liftAnimations.current = newLiftAnimations;
    fadeAnimations.current = newFadeAnimations;
  }, [liftsForSelectedDate]);

  // Animate lift cards when lifts change
  useEffect(() => {
    if (liftsForSelectedDate.length === 0) return;

    const animations = liftsForSelectedDate.map((_, index) => {
      return RNAnimated.parallel([
        RNAnimated.timing(liftAnimations.current[index], {
          toValue: 1,
          duration: 300,
          delay: index * 50, // Stagger the animations
          useNativeDriver: true,
        }),
        RNAnimated.timing(fadeAnimations.current[index], {
          toValue: 1,
          duration: 250,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]);
    });

    RNAnimated.parallel(animations).start();
  }, [liftsForSelectedDate]); // Re-run when lifts change

  const handleLiftPress = useCallback(
    (liftId: string) => {
      hapticFeedback.selection();
      // Track home screen clicks for lift card
      track('Home screen clicks', { event: 'Lift card' });
      // First try from final lists
      const lift =
        liftsForSelectedDate.find((l) => l.id === liftId) || liftData.find((l) => l.id === liftId);
      if (lift) {
        onShowFeedback(lift);
        return;
      }
      // Fallback: if pressed from a completed loading card that hasn't synced to final list yet
      const completedLoading = loadingLifts.find(
        (l) => l.status === 'completed' && l.finalData?.id === liftId
      );
      if (completedLoading?.finalData) {
        onShowFeedback(completedLoading.finalData);
      }
    },
    [liftsForSelectedDate, liftData, loadingLifts, onShowFeedback]
  );

  const handleLibraryPress = useCallback(() => {
    hapticFeedback.selection();
    // Track home screen clicks for library
    track('Home screen clicks', { event: 'Library' });
    onShowLibrary();
  }, [onShowLibrary]);

  const handleNoLiftsPress = useCallback(() => {
    hapticFeedback.selection();
    // Track home screen clicks for no lifts
    track('Home screen clicks', { event: 'No lifts' });
    onTriggerAddOptions();
  }, [onTriggerAddOptions]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      hapticFeedback.selection();
      // Track home screen clicks for calendar day
      track('Home screen clicks', { event: 'Calendar Day' });
      setSelectedDate(date);
    },
    [setSelectedDate]
  );

  const handleFireCardPress = useCallback(() => {
    hapticFeedback.selection();
    // Track home screen clicks for streaks
    track('Home screen clicks', { event: 'Streaks' });
    // This will show the manual fire popup (different from streak-triggered popup)
    setIsFirePopupVisible(true);
  }, []);

  const handleFirePopupClose = useCallback(() => {
    hapticFeedback.selection();
    setIsFirePopupVisible(false);
  }, []);

  const handleCalendarSwipe = useCallback(() => {
    // Track home screen clicks for calendar swipe
    track('Home screen clicks', { event: 'Calendar Swipe' });
  }, []);

  const handleAccuracyCardSwipe = useCallback((index: number) => {
    setCurrentCardIndex(index);
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([invalidateLifts?.(), invalidateCheckIns?.()]);
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  }, [invalidateLifts, invalidateCheckIns]);

  // Note: Removed refreshLifts() call as it was causing lifts to disappear when reopening home screen
  // The LiftDataContext will fetch data naturally when it mounts

  // Request tracking permission on first load
  useEffect(() => {
    if (!hasRequestedTrackingPermission) {
      setHasRequestedTrackingPermission(true);
      requestTrackingPermissionSafe();
    }
  }, [hasRequestedTrackingPermission]);

  // Track Home screen focus to control streak modal triggering
  useFocusEffect(
    React.useCallback(() => {
      setHomeActive?.(true);

      // Track screen view
      track('Screen viewed', { screen_name: 'Home' });

      // Check if tutorial just completed and show confetti after home screen renders
      if ((global as any).__tutorialJustCompleted) {
        // Small delay to ensure home screen renders fully before showing confetti
        setTimeout(() => {
          setShowConfetti(true);
          // Auto-hide confetti after 3 seconds
          setTimeout(() => {
            setShowConfetti(false);
          }, 3000);
        }, 100);
        // Clear the flag immediately
        (global as any).__tutorialJustCompleted = false;
      }

      // Check for pending navigation date from notifications
      if ((global as any).pendingNavigationDate) {
        const date = (global as any).pendingNavigationDate;
        delete (global as any).pendingNavigationDate;
        setSelectedDate(date);
      }

      return () => setHomeActive?.(false);
    }, [setHomeActive, setSelectedDate])
  );

  // Expose showFirstLiftDetails function globally for tutorial
  useEffect(() => {
    (global as any).showFirstLiftDetails = () => {
      // Find the first lift in the current date's lifts, or fall back to any lift
      const firstLift =
        liftsForSelectedDate.length > 0
          ? liftsForSelectedDate[0]
          : liftData.length > 0
            ? liftData[0]
            : null;

      if (firstLift) {
        hapticFeedback.selection();
        onShowFeedback(firstLift);
      }
    };

    return () => {
      (global as any).showFirstLiftDetails = undefined;
    };
  }, [liftsForSelectedDate, liftData, onShowFeedback]);

  // Expose navigateToLibrary function globally for tutorial
  useEffect(() => {
    (global as any).navigateToLibrary = () => {
      hapticFeedback.selection();
      onShowLibrary();
    };

    // Expose function to trigger confetti animation when tutorial completes
    (global as any).showTutorialCompletionConfetti = () => {
      setShowConfetti(true);
      // Auto-hide confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    };

    // Expose function to navigate to specific date from push notifications
    (global as any).setHomeDateFromNotification = (date: Date) => {
      setSelectedDate(date);
    };

    return () => {
      (global as any).navigateToLibrary = undefined;
      (global as any).showTutorialCompletionConfetti = undefined;
      (global as any).setHomeDateFromNotification = undefined;
    };
  }, [onShowLibrary, setSelectedDate]);

  // Render function for unified FlashList
  const renderLiftItem = useCallback(
    ({ item }: { item: any }) => (
      <LiftCard
        lift={item}
        onPress={handleLiftPress}
        showDate={false} // always show time instead of date
      />
    ),
    [handleLiftPress]
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <FormAILogo iconSize={40} containerStyle={styles.logoContainer} />
          <Pressable
            style={({ pressed }) => [styles.streakBadge, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleFireCardPress}
          >
            <Image
              source={require('../../../../assets/icons/fire.png')}
              style={styles.streakBadgeIcon}
              contentFit="contain"
            />
            <Text style={styles.streakBadgeText}>{currentStreak}</Text>
          </Pressable>
        </View>

        {/* Swipeable Calendar */}
        <SwipeableCalendar onDateSelect={handleDateSelect} onSwipe={handleCalendarSwipe} />

        {/* Swipeable Accuracy Card */}
        <SwipeableAccuracyCard
          cardData={cardData}
          currentCardIndex={currentCardIndex}
          onCardIndexChange={handleAccuracyCardSwipe}
        />

        {/* Spacer to push content to bottom */}
        <View style={styles.spacer} />

        <View style={styles.bottomContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{formatSelectedDate()}</Text>
            <Pressable
              ref={seeAllLiftsRef}
              style={({ pressed }) => [styles.seeAllPill, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleLibraryPress}
            >
              <Text style={styles.seeAllText}>{i18n.t('home.seeAll')}</Text>
              <FileVideoCamera size={16} color="#8E8E93" />
            </Pressable>
          </View>
          <View style={styles.liftsScrollView}>
            {/* Show unified list of loading and final lifts */}
            {combinedLiftsForDay.length > 0 ? (
              <FlashList
                data={combinedLiftsForDay}
                renderItem={renderLiftItem}
                keyExtractor={(item) => item.id}
                getItemType={(item) => (isLoadingLift(item) ? 'loading' : 'final')}
                estimatedItemSize={146}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                extraData={combinedLiftsForDay}
              />
            ) : (
              <LiftCard lift={null} isNoLiftsCard={true} onNoLiftsPress={handleNoLiftsPress} />
            )}
          </View>
        </View>

        {/* Streak-triggered Fire Card Popup */}
        <StreakModal
          visible={showStreakModal}
          currentStreak={currentStreak}
          onClose={handleStreakModalContinue}
        />

        {/* Manual Fire Card Popup */}
        <StreakModal
          visible={isFirePopupVisible}
          currentStreak={currentStreak}
          onClose={handleFirePopupClose}
        />

        {/* Tutorial Completion Confetti Animation */}
        {showConfetti && (
          <View style={styles.confettiContainer}>
            <LottieView
              source={require('../../../../assets/animations/confetti.json')}
              autoPlay
              loop={false}
              speed={0.7}
              style={styles.confettiAnimation}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginBottom: -62,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 0,
  },
  logoText: {
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
  },
  streakBadgeIcon: {
    width: 18,
    height: 18,
  },
  streakBadgeText: {
    marginLeft: 2,
    fontSize: 18,
    marginTop: 2,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'SF Pro Display',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SF Pro Display',
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    fontFamily: 'SF Pro Text',
    marginRight: 2,
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  spacer: {
    flex: 1,
  },
  bottomContent: {
    backgroundColor: 'transparent',
  },
  liftsScrollView: {
    backgroundColor: 'transparent',
    paddingBottom: 54,
  },
  liftsScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  loadingLiftsContainer: {
    paddingHorizontal: 20,
  },
  // Confetti animation styles
  confettiContainer: {
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
    width: 900,
    height: 900,
  },
});
