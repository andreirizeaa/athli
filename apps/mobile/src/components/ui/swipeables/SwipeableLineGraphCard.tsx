import React, { useState, useMemo, useCallback, useRef, useTransition, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { LineChart } from 'react-native-chart-kit';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { hapticFeedback } from '../../../utils/haptic';
import { formatWeightForDisplay } from '../../../utils/unitConversions';
import { CircleQuestionMark } from 'lucide-react-native';
import i18n from '../../../utils/i18n';
import { track } from '../../../services/analytics';

// Use integers to avoid floating rounding drift
const { width: RAW_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(RAW_W);
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.9);
const CARD_HEIGHT = 320;
const ITEM_WIDTH = SCREEN_WIDTH;

type Lift = {
  liftType: string;
  metricWeight: number;
  liftDate: string; // "DD-MM-YYYY"
  analysis: { accuracy: number };
};

type TimeRange = '90d' | '6m' | '1y' | 'all';

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: (opacity?: number) => string;
    strokeWidth: number;
  }>;
}

interface ProcessedCardData {
  title: string;
  subtitle: string;
  chartData: ChartData;
  liftCount: number;
}

interface SwipeableLineGraphCardProps {
  cardData: Lift[];
  onTriggerAddOptions?: () => void;
  hasNoLifts?: boolean;
  chartType?: 'accuracyPerWeight' | 'accuracyOverTime';
  unitPreference?: 'metric' | 'imperial';
  onInfoPress?: () => void;
  externalScrollGestureRef?: React.RefObject<any>;
}

const parseLiftDate = (dateStr: string) => {
  const [d, m, y] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Calculate linear regression for line of best fit
const calculateLinearRegression = (dataPoints: number[]) => {
  const n = dataPoints.length;
  if (n < 2) return dataPoints;

  // Calculate x values (indices) and y values (data points)
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = dataPoints;

  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Generate line of best fit points
  return xValues.map((x) => slope * x + intercept);
};

const getThresholdForRange = (range: TimeRange) => {
  const now = new Date();
  if (range === '90d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
  if (range === '6m') return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  if (range === '1y') return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return null; // all
};

// Memoized chart configuration to prevent recreation on every render
const chartConfig = {
  fillShadowGradientFrom: '#000',
  fillShadowGradientTo: '#ffffff',
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
  labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
  propsForDots: {
    r: '2',
    strokeWidth: '2',
    stroke: '#000',
    fill: '#000',
  },
  propsForBackgroundLines: {
    strokeDasharray: '2,2',
  },
  formatXLabel: (val: string) => val,
  formatYLabel: (val: string) => `${val}%`,
};

// Simple LRU cache to prevent memory creep
class LRU<K, V> {
  private map = new Map<K, V>();
  constructor(private cap = 50) {}
  get(k: K) {
    const v = this.map.get(k);
    if (v !== undefined) {
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }
  set(k: K, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.cap) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
  }
}

// Memoized regression cache with LRU
const regressionCache = new LRU<string, number[]>(60);

const getRegression = (key: string, points: number[]) => {
  const k = key + '|' + points.join(',');
  const cached = regressionCache.get(k);
  if (cached) return cached;
  const line = calculateLinearRegression(points);
  regressionCache.set(k, line);
  return line;
};

// Evenly sample exactly N indices from a list of length L (including endpoints)
function createEvenlySpacedIndices(total: number, desiredCount: number) {
  const count = Math.min(desiredCount, total);
  if (count <= 0) return [] as number[];
  if (count === 1) return [0];
  const lastIndex = total - 1;
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i * lastIndex) / (count - 1));
    if (indices.length === 0 || idx > indices[indices.length - 1]) {
      indices.push(idx);
    } else {
      indices.push(indices[indices.length - 1] + 1);
    }
  }
  // Clamp to ensure we never exceed bounds and end at lastIndex
  for (let i = indices.length - 1; i >= 0; i--) {
    const maxAllowed = lastIndex - (indices.length - 1 - i);
    if (indices[i] > maxAllowed) indices[i] = maxAllowed;
  }
  return indices;
}

// Memoized Chart Page Component with lazy rendering
const ChartPage = React.memo(
  function ChartPage({
    item,
    onInfoPress,
    shouldRender,
    cardWidth,
    chartType,
  }: {
    item: ProcessedCardData;
    onInfoPress?: () => void;
    shouldRender: boolean;
    cardWidth: number;
    chartType: 'accuracyPerWeight' | 'accuracyOverTime';
  }) {
    const isPlaceholder = item.title === 'Loading...';
    const dataLength = item.chartData?.datasets?.[0]?.data?.length || 0;
    const shouldUseBezier = dataLength <= 25;
    const shouldUseShadow = dataLength <= 25;

    return (
      <View style={styles.page}>
        <View
          style={[styles.performanceCard, { width: cardWidth }]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <View style={styles.performanceCardContent}>
            <View style={styles.performanceCardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.titleRow}>
                  <Text style={styles.performanceCardLabel}>{item.title}</Text>
                </View>
                <Text style={styles.performanceCardSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.rightSection}>
                {!isPlaceholder && (
                  <TouchableOpacity
                    onPress={() => {
                      // Track progress screen clicks
                      const eventName = chartType === 'accuracyPerWeight' ? 'AW info' : 'AT info';
                      track('Progress screen clicks', { event: eventName });
                      onInfoPress?.();
                    }}
                    activeOpacity={0.7}
                    style={styles.titleIcon}
                  >
                    <CircleQuestionMark width={20} height={20} color="#000" />
                  </TouchableOpacity>
                )}
                {item.liftCount > 0 && (
                  <View style={styles.liftCountPill}>
                    <Text style={styles.liftCountText}>
                      {`${item.liftCount} lift${item.liftCount === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.chartContainer}>
              {shouldRender ? (
                <LineChart
                  data={item.chartData}
                  width={cardWidth - 20}
                  height={180}
                  chartConfig={chartConfig}
                  bezier={shouldUseBezier}
                  style={styles.chart}
                  withDots={false}
                  withShadow={shouldUseShadow}
                  withInnerLines
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines
                  yAxisSuffix="%"
                />
              ) : (
                // Super lightweight placeholder
                <View
                  style={[
                    styles.chart,
                    {
                      width: cardWidth - 20,
                      height: 180,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={{ color: '#8E8E93' }}>
                    {i18n.t('performance.chartTitles.loading')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  },
  (a, b) =>
    a.shouldRender === b.shouldRender &&
    a.item.title === b.item.title &&
    a.item.subtitle === b.item.subtitle &&
    a.item.chartData?.datasets?.[0]?.data === b.item.chartData?.datasets?.[0]?.data &&
    a.chartType === b.chartType
);

// Memoized Pagination Component
const Pagination = React.memo(function Pagination({
  count,
  active,
}: {
  count: number;
  active: number;
}) {
  return (
    <View style={styles.paginationContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === active ? styles.paginationDotActive : styles.paginationDotInactive,
          ]}
        />
      ))}
    </View>
  );
});

// Memoized Segmented Control Component
const SegmentedControl = React.memo(function SegmentedControl({
  timeRange,
  onTimeRangeChange,
  chartType,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  chartType: 'accuracyPerWeight' | 'accuracyOverTime';
}) {
  const Segments = [
    { label: i18n.t('performance.timeRanges.ninetyDays'), value: '90d' as TimeRange },
    { label: i18n.t('performance.timeRanges.sixMonths'), value: '6m' as TimeRange },
    { label: i18n.t('performance.timeRanges.oneYear'), value: '1y' as TimeRange },
    { label: i18n.t('performance.timeRanges.allTime'), value: 'all' as TimeRange },
  ];

  const activeIndex = Segments.findIndex((seg) => seg.value === timeRange);

  // Measure container width so segment width matches the actual layout
  const [containerW, setContainerW] = useState(0);
  const PADDING = 4; // must match styles.segmented padding
  const GAP = 2; // must match styles.segment marginHorizontal total effect (1 left + 1 right)
  const SEG_COUNT = Segments.length;

  // width available inside the rounded container after its horizontal padding
  const innerW = Math.max(0, containerW - PADDING * 2);
  // each segment gets equal width; subtract total gaps between segments
  const segmentWidth = SEG_COUNT > 0 ? Math.floor((innerW - GAP * (SEG_COUNT - 1)) / SEG_COUNT) : 0;

  const animatedIndex = useSharedValue(activeIndex);
  useEffect(() => {
    animatedIndex.value = withTiming(activeIndex, { duration: 200 });
  }, [activeIndex, animatedIndex]);

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    // translate starts at left padding and moves one segmentWidth + GAP per index
    const translateX = PADDING + animatedIndex.value * (segmentWidth + GAP);
    return {
      transform: [{ translateX }],
      width: segmentWidth,
    };
  }, [segmentWidth]);

  return (
    <View style={styles.segmentedWrapper}>
      <View style={styles.segmented} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.segmentBackground, animatedBackgroundStyle]} />
        {Segments.map((seg) => {
          const active = timeRange === seg.value;
          return (
            <TouchableOpacity
              key={seg.value}
              style={[styles.segment, styles.segmentTouchable]}
              activeOpacity={0.9}
              onPress={() => {
                if (!active) {
                  hapticFeedback.selection();
                  const segmentValue =
                    seg.value === '90d'
                      ? '90 days'
                      : seg.value === '6m'
                        ? '6 months'
                        : seg.value === '1y'
                          ? '1 year'
                          : 'all time';
                  const cardType = chartType === 'accuracyPerWeight' ? 'AW' : 'AT';
                  track('Progress screen clicks', { event: `${cardType} ${segmentValue}` });
                  onTimeRangeChange(seg.value);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

export const SwipeableLineGraphCard = React.forwardRef<any, SwipeableLineGraphCardProps>(
  function SwipeableLineGraphCard(
    {
      cardData,
      onTriggerAddOptions,
      hasNoLifts = false,
      chartType = 'accuracyPerWeight',
      unitPreference = 'metric',
      onInfoPress,
      externalScrollGestureRef,
    },
    _ref
  ) {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [timeRange, _setTimeRange] = useState<TimeRange>('90d');

    // Defer heavy recompute on range switch
    const [isPending, startTransition] = useTransition();
    const setTimeRange = useCallback((r: TimeRange) => {
      startTransition(() => _setTimeRange(r));
    }, []);

    // Filter cardData by selected time range
    const rangedCardData = useMemo(() => {
      const threshold = getThresholdForRange(timeRange);
      if (!threshold) return cardData;
      return cardData.filter((lift) => parseLiftDate(lift.liftDate) >= threshold);
    }, [cardData, timeRange]);

    // Build processed cards from filtered data
    const processedCardData: ProcessedCardData[] = useMemo(() => {
      if (!rangedCardData || rangedCardData.length === 0) {
        // Return a placeholder card when there's no data
        return [
          {
            title:
              chartType === 'accuracyPerWeight'
                ? i18n.t('performance.chartTitles.accuracyPerWeight')
                : i18n.t('performance.chartTitles.accuracyOverTime'),
            subtitle: i18n.t('performance.chartTitles.noDataAvailable'),
            chartData: {
              labels: [''],
              datasets: [
                {
                  data: [0],
                  color: () => '#000000',
                  strokeWidth: 1.5,
                },
              ],
            },
            liftCount: 0,
          },
        ];
      }

      const uniqueLiftTypes = [...new Set(rangedCardData.map((lift) => lift.liftType))];

      if (chartType === 'accuracyPerWeight') {
        const cards = uniqueLiftTypes.map((liftType) => {
          const liftsOfType = rangedCardData.filter((lift) => lift.liftType === liftType);

          // Group lifts by weight and calculate average accuracy for each weight
          const weightGroups = liftsOfType.reduce(
            (acc: Record<number, { totalAccuracy: number; count: number }>, lift) => {
              const weight = lift.metricWeight;
              if (!acc[weight]) {
                acc[weight] = { totalAccuracy: 0, count: 0 };
              }
              acc[weight].totalAccuracy += lift.analysis.accuracy;
              acc[weight].count += 1;
              return acc;
            },
            {}
          );

          // Convert to array of { weight, averageAccuracy } and sort by weight
          const weightAccuracyData = Object.entries(weightGroups)
            .map(([weight, data]) => ({
              weight: parseFloat(weight),
              averageAccuracy: data.totalAccuracy / data.count,
            }))
            .sort((a, b) => a.weight - b.weight);

          let chartLabels: string[];
          let chartDataPoints: number[];

          if (weightAccuracyData.length <= 25) {
            // If 25 or fewer unique weights, use all of them
            const targetLastPos = unitPreference === 'imperial' ? 23 : 24;
            chartLabels = weightAccuracyData.map((data, idx) => {
              const position = idx + 1; // Convert to 1-based indexing
              if (
                position === 1 ||
                position === 9 ||
                position === 16 ||
                position === targetLastPos
              ) {
                if (position === targetLastPos && idx !== weightAccuracyData.length - 1) {
                  // Last label slot (23 for imperial, 24 for metric) shows the final weight
                  return formatWeightForDisplay(
                    weightAccuracyData[weightAccuracyData.length - 1].weight,
                    unitPreference
                  );
                }
                return formatWeightForDisplay(data.weight, unitPreference);
              }
              return '';
            });
            chartDataPoints = weightAccuracyData.map((data) => data.averageAccuracy);
          } else {
            // If more than 25 unique weights, select exactly 25 evenly spaced points
            const selectedIndicesArray = createEvenlySpacedIndices(weightAccuracyData.length, 25);
            chartDataPoints = selectedIndicesArray.map(
              (index) => weightAccuracyData[index].averageAccuracy
            );

            // For labels, only show positions 1, 9, 16, and the last slot (23 for imperial, 24 for metric)
            chartLabels = selectedIndicesArray.map((index, labelIndex) => {
              const position = labelIndex + 1; // Convert to 1-based indexing
              const targetLastPos = unitPreference === 'imperial' ? 23 : 24;
              if (
                position === 1 ||
                position === 9 ||
                position === 16 ||
                position === targetLastPos
              ) {
                if (position === targetLastPos) {
                  // The last label slot shows the final weight
                  return formatWeightForDisplay(
                    weightAccuracyData[weightAccuracyData.length - 1].weight,
                    unitPreference
                  );
                }
                return formatWeightForDisplay(weightAccuracyData[index].weight, unitPreference);
              }
              return '';
            });
          }

          // Calculate line of best fit using cached regression
          const lineOfBestFit = getRegression(`weight-${liftType}`, chartDataPoints);

          const chartData: ChartData = {
            labels: chartLabels,
            datasets: [
              {
                data: chartDataPoints,
                color: () => '#000000',
                strokeWidth: 1.5,
              },
              {
                data: lineOfBestFit,
                color: () => '#ffb86a',
                strokeWidth: 2,
              },
            ],
          };

          return {
            title: i18n.t('performance.chartTitles.accuracyPerWeight'),
            subtitle: liftType,
            chartData,
            liftCount: liftsOfType.length,
          };
        });

        // Sort cards by lift count (descending) so the card with most lifts appears first
        return cards.sort((a, b) => b.liftCount - a.liftCount);
      } else {
        const cards = uniqueLiftTypes.map((liftType) => {
          const liftsOfType = rangedCardData.filter((lift) => lift.liftType === liftType);

          const liftsByDate = liftsOfType.reduce((acc: Record<string, Lift[]>, lift: Lift) => {
            const date = lift.liftDate;
            if (!acc[date]) acc[date] = [];
            acc[date].push(lift);
            return acc;
          }, {});

          const averagedLifts = Object.entries(liftsByDate)
            .map(([date, lifts]) => {
              const avg =
                lifts.reduce(
                  (sum, l) =>
                    sum + (typeof l.analysis?.accuracy === 'number' ? l.analysis.accuracy : 0),
                  0
                ) / lifts.length;
              return { date, averageAccuracy: avg };
            })
            .sort((a, b) => parseLiftDate(a.date).getTime() - parseLiftDate(b.date).getTime());

          const formatDate = (dateString: string) => {
            const d = parseLiftDate(dateString);
            return d.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          };

          let chartLabels: string[];
          let chartDataPoints: number[];

          if (averagedLifts.length <= 25) {
            // If 25 or fewer unique dates, use all points.
            // Show anchors corresponding to 1, 11, 22 of a 25-slot grid.
            const total = averagedLifts.length;
            const firstIndex = 0;
            const lastIndex = total - 1;
            const midIndexRaw = Math.floor(lastIndex * (10 / 24));
            const midIndex = total >= 3 ? Math.max(1, Math.min(lastIndex - 1, midIndexRaw)) : -1;
            const pos22IndexRaw = Math.floor(lastIndex * (21 / 24));
            const pos22Index =
              total >= 2 ? Math.max(1, Math.min(lastIndex - 1, pos22IndexRaw)) : -1;

            const labels = Array<string>(total).fill('');
            labels[firstIndex] = formatDate(averagedLifts[firstIndex].date);
            if (midIndex >= 0) labels[midIndex] = formatDate(averagedLifts[midIndex].date);
            if (pos22Index >= 0) labels[pos22Index] = formatDate(averagedLifts[lastIndex].date);

            chartLabels = labels;
            chartDataPoints = averagedLifts.map((lift) => lift.averageAccuracy);
          } else {
            // If more than 25 data points, select exactly 25 evenly spaced points
            const selectedIndicesArray = createEvenlySpacedIndices(averagedLifts.length, 25);
            chartDataPoints = selectedIndicesArray.map(
              (index) => averagedLifts[index].averageAccuracy
            );

            // For labels, only show positions 1, 11, 22 (1-based indexing), empty strings elsewhere
            // Note: position 22 should show the value for the last data point (position 25)
            chartLabels = selectedIndicesArray.map((index, labelIndex) => {
              const position = labelIndex + 1; // Convert to 1-based indexing
              if (position === 1 || position === 11 || position === 22) {
                if (position === 22) {
                  // Position 22 should show the last data point's date
                  return formatDate(averagedLifts[averagedLifts.length - 1].date);
                }
                return formatDate(averagedLifts[index].date);
              }
              return '';
            });
          }

          // Calculate line of best fit using cached regression
          const lineOfBestFit = getRegression(`time-${liftType}`, chartDataPoints);

          const chartData: ChartData = {
            labels: chartLabels,
            datasets: [
              {
                data: chartDataPoints,
                color: () => '#000000',
                strokeWidth: 1.5,
              },
              {
                data: lineOfBestFit,
                color: () => '#ffb86a',
                strokeWidth: 2,
              },
            ],
          };

          return {
            title: i18n.t('performance.chartTitles.accuracyOverTime'),
            subtitle: liftType,
            chartData,
            liftCount: liftsOfType.length,
          };
        });

        // Sort cards by lift count (descending) so the card with most lifts appears first
        return cards.sort((a, b) => b.liftCount - a.liftCount);
      }
    }, [rangedCardData, chartType, unitPreference]);

    // Guard: if no data (initially or empty), don't mount FlashList
    const isEmpty = !processedCardData || processedCardData.length === 0;

    // Render window: only mount charts near current index
    const shouldRenderIndex = useCallback(
      (index: number) => Math.abs(index - currentCardIndex) <= 1,
      [currentCardIndex]
    );

    const renderItem = useCallback(
      ({ item, index }: ListRenderItemInfo<ProcessedCardData>) => {
        const visible = shouldRenderIndex(index);
        return (
          <View style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
            <ChartPage
              item={item}
              onInfoPress={onInfoPress}
              shouldRender={visible}
              cardWidth={CARD_WIDTH} // pass explicit width
              chartType={chartType}
            />
          </View>
        );
      },
      [onInfoPress, shouldRenderIndex, chartType]
    );

    const onScroll = useCallback(
      (e: any) => {
        const x = e?.nativeEvent?.contentOffset?.x || 0;
        // center-based snap avoids rounding drift
        const idx = Math.max(
          0,
          Math.min(
            Math.floor((x + ITEM_WIDTH / 2) / ITEM_WIDTH),
            (processedCardData.length || 1) - 1
          )
        );
        if (idx !== currentCardIndex) {
          // Track progress screen clicks for card swipes
          const cardType = chartType === 'accuracyPerWeight' ? 'AW' : 'AT';
          track('Progress screen clicks', { event: `${cardType} card swiped` });
          setCurrentCardIndex(idx);
        }
      },
      [currentCardIndex, processedCardData.length, chartType]
    );

    const onMomentumScrollEnd = useCallback(
      (e: any) => {
        const x = e?.nativeEvent?.contentOffset?.x || 0;
        const idx = Math.max(
          0,
          Math.min(Math.round(x / ITEM_WIDTH), (processedCardData.length || 1) - 1)
        );
        if (idx !== currentCardIndex) {
          // Track progress screen clicks for card swipes (momentum scroll end)
          const cardType = chartType === 'accuracyPerWeight' ? 'AW' : 'AT';
          track('Progress screen clicks', { event: `${cardType} card swiped` });
          setCurrentCardIndex(idx);
        }
      },
      [currentCardIndex, processedCardData.length, chartType]
    );

    if (isEmpty) {
      return (
        <View style={styles.cardsContainer}>
          <SegmentedControl
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            chartType={chartType}
          />
          <View style={[styles.performanceCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
            <Text style={styles.performanceCardLabel}>
              {i18n.t('performance.chartTitles.noDataAvailable')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cardsContainer} ref={_ref as any}>
        <SegmentedControl
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          chartType={chartType}
        />

        <View style={[styles.carouselContainer, { width: SCREEN_WIDTH, height: CARD_HEIGHT }]}>
          <FlashList
            data={processedCardData}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            // Avoid pagingEnabled quirks; use snapToInterval for exact paging
            snapToInterval={ITEM_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            // Important: tell FlashList exact size and offset for each index
            overrideItemLayout={(layout, index) => {
              layout.size = ITEM_WIDTH; // width along scroll axis
              // @ts-ignore - FlashList internal property
              layout.offset = ITEM_WIDTH * index; // starting x
            }}
            estimatedItemSize={ITEM_WIDTH} // still good to provide
            estimatedListSize={{ width: SCREEN_WIDTH, height: CARD_HEIGHT }}
            keyExtractor={(_, i) => `graph-${i}`}
            renderItem={renderItem}
            removeClippedSubviews
            nestedScrollEnabled
            contentContainerStyle={{}}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            // Force re-renders when currentCardIndex or timeRange changes
            extraData={{ currentCardIndex, timeRange }}
            // optional: initialScrollIndex={0}
            // optional: disableIntervalMomentum (RN iOS), but snapToInterval handles it
            // contentInsetAdjustmentBehavior avoids auto safe-area shifts on iOS
            contentInsetAdjustmentBehavior="never"
          />
          <Pagination count={processedCardData.length} active={currentCardIndex} />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },

  // --- Segmented control styles ---
  segmentedWrapper: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
    position: 'relative',
    // Platform-specific shadow optimization
    ...(Platform.OS === 'android'
      ? { elevation: 1 }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1,
        }),
  },
  segmentBackground: {
    position: 'absolute',
    top: 4,
    left: 0, // left is 0; we add PADDING in the animated style
    bottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    // Platform-specific shadow optimization
    ...(Platform.OS === 'android'
      ? { elevation: 2 }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }),
  },
  segment: {
    flex: 1, // <— key change: let segments size evenly
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1, // matches GAP/2 left & right (total 2)
  },
  segmentTouchable: {
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  segmentTextActive: {
    // No special styling needed - the animated background provides visual indication
  },
  // --- Card / chart ---
  carouselContainer: {
    marginTop: -4,
  },
  page: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,

    // Platform-specific shadow optimization
    ...(Platform.OS === 'android'
      ? { elevation: 2 }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }),
  },
  performanceCardContent: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
  },
  performanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 8,
    width: '100%',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  titleIcon: {
    padding: 4,
  },
  performanceCardLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 8,
  },
  performanceCardSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -20,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#000',
  },
  paginationDotInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
  },
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 8,
    overflow: 'visible',
    marginLeft: -8,
  },
  chart: {
    borderRadius: 16,
  },
  liftCountPill: {
    backgroundColor: '#F0F0F0',
    width: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liftCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
