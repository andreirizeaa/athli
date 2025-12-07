import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  Dimensions,
  InteractionManager,
  Animated,
  RefreshControl,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { SwipeableLineGraphCard } from '../../../components/ui/swipeables/SwipeableLineGraphCard';
import { StreakCalendar } from '../../../components/ui/StreakCalendar';
import { useLiftData } from '../../../context/LiftDataContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { useUserCheckIns } from '../../../context/UserCheckInsContext';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { useTutorialTarget } from '../../../context/TutorialContext';
import { CircleQuestionMark, X, MailPlus, CircleStar } from 'lucide-react-native';
import { CircularProgressChart } from '../../../components/icons/icons';
import { openMetricsFeedbackEmail } from '../../../services/emailService';
import { track } from '../../../services/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import { Wrapped } from '../../../components/ui/Wrapped';
import { LiftCard } from '../../../components/ui/LiftCard';
import { SvgXml } from 'react-native-svg';

interface PerformanceScreenProps {
  onTriggerAddOptions?: () => void;
}

interface WrappedYearCardsProps {
  liftData: any[];
  onYearPress: (year: string) => void;
}

function WrappedYearCards({ liftData, onYearPress }: WrappedYearCardsProps) {
  // Extract unique years from lift data
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();

    if (!liftData || !Array.isArray(liftData) || liftData.length === 0) {
      return [currentYear];
    }

    const years = new Set<string>();
    // Always include current year
    years.add(currentYear);

    liftData.forEach((lift) => {
      // Extract year from DD-MM-YYYY format
      const year = lift.liftDate.split('-')[2];
      if (year) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  }, [liftData]);

  return (
    <View>
      {/* All Time Option */}
      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => {
          hapticFeedback.selection();
          onYearPress('all');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <CircleStar size={26} color="#000000" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.optionTitle}>{i18n.t('performance.timeRanges.allTime')}</Text>
        </View>
      </TouchableOpacity>

      {/* Year Options */}
      {availableYears.map((year, index) => {
        const yearLifts = liftData.filter((lift) => lift.liftDate.split('-')[2] === year);
        return (
          <View key={year}>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                hapticFeedback.selection();
                onYearPress(year);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <CircleStar size={26} color="#000000" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>{year}</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

export function PerformanceScreen({ onTriggerAddOptions }: PerformanceScreenProps) {
  const { liftData, invalidateAndRefetch } = useLiftData();
  const { userDetails } = useUserDetails();
  const { currentStreak } = useUserCheckIns();
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string }>({
    title: '',
    message: '',
  });
  const [infoShouldRender, setInfoShouldRender] = useState(false);
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drive fade-in/out and mount/unmount for info modal
  useEffect(() => {
    if (infoModalVisible) {
      setInfoShouldRender(true);
      infoOpacity.setValue(0);
      Animated.timing(infoOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(infoOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setInfoShouldRender(false);
      }
    );
  }, [infoModalVisible, infoOpacity]);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Progress' });
  }, []);

  // Tutorial target registration
  const { ref: performanceMetricsRef } = useTutorialTarget('performance_metrics');
  const { ref: performanceOverWeightRef } = useTutorialTarget('performance_over_weight');
  const { ref: performanceOverTimeRef } = useTutorialTarget('performance_charts_over_time');

  // Expose scroll helpers for tutorial to bring charts into view
  React.useEffect(() => {
    (global as any).scrollToPerformanceOverWeight = () => {
      try {
        (performanceOverWeightRef as any)?.current?.measure?.(
          (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
            try {
              (scrollRef as any)?.current?.scrollTo({
                y: Math.max(0, pageY - 120),
                animated: true,
              });
            } catch {}
          }
        );
      } catch {}
    };
    // Removed scrollToPerformanceOverTime in favor of scrollToPerformanceBottom
    (global as any).scrollToPerformanceBottom = () => {
      try {
        // Scroll down by 50% of the viewport height from current offset, clamped to max
        const halfScreen = Math.max(0, Math.round(viewHeightRef.current * 0.85));
        const maxScroll = Math.max(0, contentHeightRef.current - viewHeightRef.current);
        const nextY = Math.min(maxScroll, Math.max(0, currentScrollYRef.current + halfScreen));
        (scrollRef as any)?.current?.scrollTo?.({ y: nextY, animated: true });

        // After the animated scroll, force tutorial to remeasure to get final position
        setTimeout(() => {
          try {
            InteractionManager.runAfterInteractions(() => {
              try {
                (global as any).remeasureTutorialTarget?.();
              } catch {}
            });
          } catch {
            try {
              (global as any).remeasureTutorialTarget?.();
            } catch {}
          }
        }, 700);
      } catch {}
    };
    (global as any).scrollToPerformanceTop = () => {
      try {
        (scrollRef as any)?.current?.scrollTo({ y: 0, animated: true });
      } catch {}
    };
    return () => {
      try {
        delete (global as any).scrollToPerformanceOverWeight;
      } catch {}
      // Removed cleanup for scrollToPerformanceOverTime
      try {
        delete (global as any).scrollToPerformanceBottom;
      } catch {}
      try {
        delete (global as any).scrollToPerformanceTop;
      } catch {}
    };
  }, [performanceOverWeightRef, performanceOverTimeRef]);

  // Scroll ref for gesture coordination
  const scrollRef = useRef(null);
  const streakCardRef = useRef<any>(null);
  const streakTopYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewHeightRef = useRef(0);
  const currentScrollYRef = useRef(0);

  // Memoize liftData to ensure stable reference
  const stableLiftData = useMemo(() => liftData, [liftData]);

  // Helpers: compute summary stats (moved from SwipeableSummaryCard)
  function parseDateDDMMYYYY(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // NEW: robust parser that handles DD-MM-YYYY, DD/MM/YYYY, ISO strings, and epoch seconds/ms
  function parseAnyDate(input: any): Date | null {
    if (input == null) return null;

    if (input instanceof Date && !isNaN(input.getTime())) return input;

    if (typeof input === 'number') {
      const ms = input > 1e12 ? input : input * 1000; // treat <1e12 as seconds
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof input === 'string') {
      // Prefer your custom DD-MM-YYYY first
      const d1 = parseDateDDMMYYYY(input);
      if (d1) return d1;

      // Try DD/MM/YYYY
      const m = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) {
        const [, dd, mm, yyyy] = m.map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        if (!isNaN(d.getTime())) return d;
      }

      // Fallback to native (handles ISO-8601, etc.)
      const d2 = new Date(input);
      if (!isNaN(d2.getTime())) return d2;
    }

    return null;
  }

  // UPDATED: extract from several plausible fields and parse robustly
  function getLiftDate(l: any): Date | null {
    const candidates = [
      l?.liftDate,
      l?.date,
      l?.performedAt,
      l?.createdAt,
      l?.updatedAt,
      l?.timestamp,
    ];
    for (const c of candidates) {
      const d = parseAnyDate(c);
      if (d) return d;
    }
    return null;
  }

  // Helper to determine lift type for grouping
  function getLiftType(l: any): string | null {
    const candidates = [
      l?.liftType,
      l?.exerciseName,
      l?.exercise?.name,
      l?.movementName,
      l?.liftName,
      l?.name,
      l?.type,
    ];
    const type = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
    return type ? String(type) : null;
  }

  // Percentage improvement bounded by the 0–100 scale (first -> last per type), then averaged across types.
  function calculateBoundedPctImprovementFirstToLastAvg(
    lifts: Array<{ analysis?: { accuracy?: number } }>
  ): number {
    if (!Array.isArray(lifts) || lifts.length === 0) return 0;

    // Group entries by lift type
    const byType = new Map<string, Array<{ t: number; acc: number }>>();

    for (const l of lifts) {
      const acc = typeof l?.analysis?.accuracy === 'number' ? l.analysis.accuracy : null;
      if (acc == null || Number.isNaN(acc)) continue;

      const d = getLiftDate(l);
      if (!d) continue;

      const type = getLiftType(l);
      if (!type) continue;

      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push({ t: d.getTime(), acc: Math.max(0, Math.min(100, acc)) });
    }

    if (byType.size === 0) return 0;

    const perTypePercents: number[] = [];

    byType.forEach((entries) => {
      if (!entries || entries.length < 2) return; // need earliest & latest

      entries.sort((a, b) => a.t - b.t);
      const first = entries[0].acc;
      const last = entries[entries.length - 1].acc;

      let pct: number;
      if (last >= first) {
        // Improvement relative to headroom up to 100 => capped at +100%
        const denom = Math.max(1, 100 - first); // avoid /0 at first=100
        pct = ((last - first) / denom) * 100; // 0..100
        pct = Math.min(100, Math.max(0, pct));
      } else {
        // Decline relative to room to 0 => capped at -100%
        const denom = Math.max(1, first); // avoid /0 at first=0
        pct = ((last - first) / denom) * 100; // -100..0
        pct = Math.max(-100, Math.min(0, pct));
      }

      if (Number.isFinite(pct)) perTypePercents.push(pct);
    });

    if (perTypePercents.length === 0) return 0;
    return perTypePercents.reduce((s, v) => s + v, 0) / perTypePercents.length; // signed %, [-100,+100]
  }

  const {
    averageAccuracy,
    improvementValue,
    accuracyColor,
    improvementColor,
    isImprovementNegative,
    totalVideos,
    totalReps,
    totalWeightMoved,
    favouriteLift,
  } = useMemo(() => {
    const validAccuracies = stableLiftData
      .map((l) =>
        typeof (l as any)?.analysis?.accuracy === 'number'
          ? ((l as any).analysis.accuracy as number)
          : null
      )
      .filter((v): v is number => typeof v === 'number');

    const averageAccuracyRaw =
      validAccuracies.length > 0
        ? Math.round(validAccuracies.reduce((s, v) => s + v, 0) / validAccuracies.length)
        : 0;

    const accColor =
      averageAccuracyRaw > 80 ? '#00a63e' : averageAccuracyRaw < 50 ? '#fb2c36' : '#fe9a00';

    // NEW: bounded % improvement (signed) averaged across lift types
    const improvementRaw = Math.round(
      calculateBoundedPctImprovementFirstToLastAvg(stableLiftData as any)
    );
    const isNegative = improvementRaw < 0;
    const impColor = isNegative ? '#fb2c36' : '#00a63e';

    // Calculate totals
    const videos = stableLiftData.length;
    const reps = stableLiftData.reduce((sum, lift) => sum + (lift.reps || 0), 0);
    const weightMoved = stableLiftData.reduce((sum, lift) => {
      const weight = lift.metricWeight || 0;
      const reps = lift.reps || 0;
      return sum + weight * reps;
    }, 0);

    // Calculate favourite lift (most frequent lift type)
    const liftTypeCounts = new Map<string, number>();
    stableLiftData.forEach((lift) => {
      const liftType = getLiftType(lift);
      if (liftType) {
        liftTypeCounts.set(liftType, (liftTypeCounts.get(liftType) || 0) + 1);
      }
    });

    let favouriteLiftName: string | null = null;
    let maxCount = 0;
    liftTypeCounts.forEach((count, liftType) => {
      if (count > maxCount) {
        maxCount = count;
        favouriteLiftName = liftType;
      }
    });

    return {
      averageAccuracy: Math.max(0, Math.min(100, averageAccuracyRaw)),
      improvementValue: Math.max(-100, Math.min(100, improvementRaw)), // keep signed
      accuracyColor: accColor,
      improvementColor: impColor,
      isImprovementNegative: isNegative,
      totalVideos: videos,
      totalReps: reps,
      totalWeightMoved: weightMoved,
      favouriteLift: favouriteLiftName,
    };
  }, [stableLiftData]);

  // Info handlers
  const openInfoModal = (
    key:
      | 'accuracyPerWeight'
      | 'accuracyOverTime'
      | 'accuracy'
      | 'improvement'
      | 'videos'
      | 'reps'
      | 'totalWeight'
  ) => {
    hapticFeedback.selection();

    // Track progress screen clicks only for the metric cards (not the chart cards)
    switch (key) {
      case 'accuracy':
        track('Progress screen clicks', { event: 'Accuracy info' });
        break;
      case 'improvement':
        track('Progress screen clicks', { event: 'Improvement info' });
        break;
      case 'videos':
        track('Progress screen clicks', { event: 'Videos info' });
        break;
      case 'reps':
        track('Progress screen clicks', { event: 'Reps info' });
        break;
      case 'totalWeight':
        track('Progress screen clicks', { event: 'Total weight info' });
        break;
      // Note: accuracyPerWeight and accuracyOverTime are now tracked in SwipeableLineGraphCard
    }

    let title = '';
    let message = '';
    switch (key) {
      case 'accuracyPerWeight':
        title = i18n.t('performance.info.accuracyPerWeight.title');
        message = i18n.t('performance.info.accuracyPerWeight.message');
        break;
      case 'accuracyOverTime':
        title = i18n.t('performance.info.accuracyOverTime.title');
        message = i18n.t('performance.info.accuracyOverTime.message');
        break;
      case 'accuracy':
        title = i18n.t('performance.info.accuracy.title');
        message = i18n.t('performance.info.accuracy.message');
        break;
      case 'improvement':
        title = i18n.t('performance.info.improvement.title');
        message = i18n.t('performance.info.improvement.message');
        break;
      case 'videos':
        title = i18n.t('performance.info.videos.title');
        message = i18n.t('performance.info.videos.message');
        break;
      case 'reps':
        title = i18n.t('performance.info.reps.title');
        message = i18n.t('performance.info.reps.message');
        break;
      case 'totalWeight':
        title = i18n.t('performance.info.totalWeight.title');
        message = i18n.t('performance.info.totalWeight.message');
        break;
    }
    setInfoModalContent({ title, message });
    setInfoModalVisible(true);
  };
  const closeInfoModal = () => {
    hapticFeedback.selection();
    setInfoModalVisible(false);
  };

  const handleMetricsFeedbackPress = async () => {
    hapticFeedback.selection();
    track('Progress screen clicks', { event: 'More features' });
    await openMetricsFeedbackEmail();
  };

  // Pull-to-refresh handler (lifts only)
  const handleRefresh = React.useCallback(async () => {
    try {
      setIsRefreshing(true);
      await invalidateAndRefetch();
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  }, [invalidateAndRefetch]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        nestedScrollEnabled
        directionalLockEnabled
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onLayout={(e) => {
          try {
            viewHeightRef.current = e.nativeEvent.layout.height;
          } catch {}
        }}
        onContentSizeChange={(w, h) => {
          try {
            contentHeightRef.current = h;
          } catch {}
        }}
        onScroll={(e) => {
          try {
            currentScrollYRef.current = e.nativeEvent.contentOffset.y;
          } catch {}
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{i18n.t('performance.title')}</Text>

          {/* Metric Cards Row: Accuracy | Improvement */}
          <View style={styles.metricsRow} ref={performanceMetricsRef}>
            {/* Accuracy Card */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeaderRow}>
                <Text style={styles.metricTitle}>{i18n.t('performance.accuracy')}</Text>
                <TouchableOpacity
                  onPress={() => openInfoModal('accuracy')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Show accuracy information"
                  style={styles.metricTitleIcon}
                >
                  <CircleQuestionMark width={20} height={20} color="#000000" />
                </TouchableOpacity>
              </View>
              <View style={styles.progressWrapper}>
                <CircularProgressChart
                  width={100}
                  height={100}
                  percentage={Math.max(0, Math.min(100, averageAccuracy))}
                  progressColor={accuracyColor}
                  backgroundColor="#E5E5E5"
                  strokeWidth={10}
                  radius={40}
                  clockwise={true}
                />
                <Text style={styles.progressText} accessibilityLabel="Accuracy value">
                  {`${averageAccuracy}%`}
                </Text>
              </View>
            </View>

            {/* Improvement Card */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeaderRow}>
                <Text style={styles.metricTitle}>{i18n.t('performance.trend')}</Text>
                <TouchableOpacity
                  onPress={() => openInfoModal('improvement')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Show improvement information"
                  style={styles.metricTitleIcon}
                >
                  <CircleQuestionMark width={20} height={20} color="#000000" />
                </TouchableOpacity>
              </View>
              <View style={styles.progressWrapper}>
                <CircularProgressChart
                  width={100}
                  height={100}
                  percentage={Math.max(0, Math.min(100, Math.abs(improvementValue)))}
                  progressColor={improvementColor}
                  backgroundColor="#E5E5E5"
                  strokeWidth={10}
                  radius={40}
                  clockwise={!isImprovementNegative}
                />
                <Text style={styles.progressText} accessibilityLabel="Improvement value">
                  {`${improvementValue}%`}
                </Text>
              </View>
            </View>
          </View>

          {/* Performance Cards */}
          <SwipeableLineGraphCard
            ref={performanceOverWeightRef}
            cardData={stableLiftData}
            onTriggerAddOptions={onTriggerAddOptions}
            hasNoLifts={stableLiftData.length === 0}
            chartType="accuracyPerWeight"
            unitPreference={userDetails?.unitSystem ?? 'metric'}
            onInfoPress={() => openInfoModal('accuracyPerWeight')}
            externalScrollGestureRef={scrollRef}
          />

          {/* Accuracy Over Time Cards */}
          <SwipeableLineGraphCard
            ref={performanceOverTimeRef}
            cardData={stableLiftData}
            hasNoLifts={stableLiftData.length === 0}
            chartType="accuracyOverTime"
            unitPreference={userDetails?.unitSystem ?? 'metric'}
            onInfoPress={() => openInfoModal('accuracyOverTime')}
            externalScrollGestureRef={scrollRef}
          />

          {/* Streak Calendar Card */}
          <View
            style={styles.streakCardContainer}
            ref={streakCardRef}
            onLayout={(e) => {
              try {
                streakTopYRef.current = e.nativeEvent.layout.y;
              } catch {}
            }}
          >
            <View style={styles.streakCard}>
              {/* Streak Badge */}
              <View style={styles.streakBadgeContainer}>
                <View style={styles.streakBadge}>
                  <Image
                    source={require('../../../../assets/icons/fire.png')}
                    style={styles.streakBadgeIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.streakBadgeText}>{currentStreak}</Text>
                </View>
              </View>

              {/* Calendar */}
              <View style={styles.streakCalendarWrapper}>
                <StreakCalendar />
              </View>
            </View>
          </View>

          {/* Wrapped Section */}
          <View style={styles.wrappedSection}>
            <View style={styles.card}>
              <Text style={styles.wrappedTitle}>{i18n.t('performance.wrapped')}</Text>
              {stableLiftData.length === 0 ? (
                <Text style={styles.notAvailableText}>{i18n.t('performance.notAvailable')}</Text>
              ) : (
                <WrappedYearCards
                  liftData={stableLiftData}
                  onYearPress={(year) => {
                    // Navigate to wrapped details screen
                    if ((global as any).navigateToWrappedDetails) {
                      (global as any).navigateToWrappedDetails(year);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Metrics Feedback Card */}
          <View style={styles.metricsFeedbackCard}>
            <TouchableOpacity
              style={styles.metricsFeedbackRow}
              onPress={handleMetricsFeedbackPress}
              activeOpacity={0.7}
            >
              <View style={styles.metricsFeedbackIconContainer}>
                <MailPlus size={26} color="#000000" />
              </View>
              <View style={styles.metricsFeedbackTextContainer}>
                <Text style={styles.metricsFeedbackTitle}>
                  {i18n.t('performance.metricsFeedback.title')}
                </Text>
                <Text style={styles.metricsFeedbackSubtitle}>
                  {i18n.t('performance.metricsFeedback.subtitle')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal visible={infoShouldRender} transparent onRequestClose={closeInfoModal}>
        <Animated.View style={{ flex: 1, opacity: infoOpacity }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeInfoModal}>
            <TouchableOpacity
              style={styles.infoModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.infoTitle}>{infoModalContent.title}</Text>
              <Text style={styles.infoMessage}>{infoModalContent.message}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeInfoModal}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>{i18n.t('close')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    marginBottom: -30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  closeButton: {
    width: '100%',
    height: 60,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  performanceCardContent: {
    alignItems: 'center',
  },
  performanceCardHeader: {},
  performanceCardLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 12,
  },
  metricTitleIcon: {
    marginLeft: 4,
    marginBottom: 10,
  },
  progressWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressText: {
    position: 'absolute',
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  infoModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'left',
  },
  infoMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 20,
  },
  streakCardContainer: {
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  streakCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 20,
    padding: 16,
  },
  streakBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 26,
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
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  streakCalendarWrapper: {
    alignItems: 'center',
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
  },
  statHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 12,
    flex: 1,
    flexShrink: 0,
  },
  statTitleIcon: {
    marginLeft: 4,
    marginBottom: 10,
    flexShrink: 0,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    alignSelf: 'flex-start',
  },
  metricsFeedbackCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    marginBottom: 50,
  },
  metricsFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsFeedbackIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  metricsFeedbackTextContainer: {
    flex: 1,
  },
  metricsFeedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  metricsFeedbackSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  wrappedSection: {},
  wrappedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 16,
    marginTop: 0,
    paddingLeft: 4,
  },
  yearCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 0,
  },
  yearCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  yearCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  yearCardIcon: {
    marginTop: -2, // Slight upward adjustment to align with text baseline
  },
  yearCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 4,
  },
  yearCardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  notAvailableText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'left',
    marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
});
