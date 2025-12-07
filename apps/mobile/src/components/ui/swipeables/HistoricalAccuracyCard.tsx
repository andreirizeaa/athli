import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(SCREEN_W);
const CARD_WIDTH = Math.round(SCREEN_WIDTH - 40 - 11); // match liftDetails chart width (width - 51)

type Lift = {
  liftType: string;
  metricWeight: number;
  liftDate: string; // "DD-MM-YYYY"
  analysis: { accuracy: number };
};

type TimeRange = '90d' | '6m' | '1y' | 'all';

interface HistoricalAccuracyCardProps {
  lifts: Lift[];
}

const parseLiftDate = (dateStr: string) => {
  const [d, m, y] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getThresholdForRange = (range: TimeRange) => {
  const now = new Date();
  if (range === '90d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
  if (range === '6m') return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  if (range === '1y') return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return null; // all
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
  for (let i = indices.length - 1; i >= 0; i--) {
    const maxAllowed = lastIndex - (indices.length - 1 - i);
    if (indices[i] > maxAllowed) indices[i] = maxAllowed;
  }
  return indices;
}

const lineChartConfig = {
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

// Memoized Segmented Control Component
const SegmentedControl = React.memo(function SegmentedControl({
  timeRange,
  onTimeRangeChange,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
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

export function HistoricalAccuracyCard({ lifts }: HistoricalAccuracyCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');

  // Filter lifts by selected time range
  const rangedLifts = useMemo(() => {
    const threshold = getThresholdForRange(timeRange);
    if (!threshold) return lifts;
    return lifts.filter((lift) => parseLiftDate(lift.liftDate) >= threshold);
  }, [lifts, timeRange]);

  const chartData = useMemo(() => {
    if (!rangedLifts || rangedLifts.length === 0) {
      return {
        labels: [''],
        datasets: [
          {
            data: [0],
            color: () => '#000000',
            strokeWidth: 1.5,
          },
        ],
      };
    }

    // Group lifts by date and calculate average accuracy for each date
    const liftsByDate = rangedLifts.reduce((acc: Record<string, Lift[]>, lift: Lift) => {
      const date = lift.liftDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(lift);
      return acc;
    }, {});

    const averagedLifts = Object.entries(liftsByDate)
      .map(([date, dateLifts]) => {
        const avg =
          dateLifts.reduce(
            (sum, l) => sum + (typeof l.analysis?.accuracy === 'number' ? l.analysis.accuracy : 0),
            0
          ) / dateLifts.length;
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
      const pos22Index = total >= 2 ? Math.max(1, Math.min(lastIndex - 1, pos22IndexRaw)) : -1;

      const labels = Array<string>(total).fill('');
      labels[firstIndex] = formatDate(averagedLifts[firstIndex].date);
      if (midIndex >= 0) labels[midIndex] = formatDate(averagedLifts[midIndex].date);
      if (pos22Index >= 0) labels[pos22Index] = formatDate(averagedLifts[lastIndex].date);

      chartLabels = labels;
      chartDataPoints = averagedLifts.map((lift) => lift.averageAccuracy);
    } else {
      // If more than 25 data points, select exactly 25 evenly spaced points
      const selectedIndicesArray = createEvenlySpacedIndices(averagedLifts.length, 25);
      chartDataPoints = selectedIndicesArray.map((index) => averagedLifts[index].averageAccuracy);

      // For labels, only show positions 1, 11, 22 (1-based indexing), empty strings elsewhere
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

    return {
      labels: chartLabels,
      datasets: [
        {
          data: chartDataPoints,
          color: () => '#000000',
          strokeWidth: 2,
        },
      ],
    };
  }, [rangedLifts]);

  const hasData = rangedLifts && rangedLifts.length > 0;
  const hasOnlyOneLift = rangedLifts && rangedLifts.length === 1;
  const dataLength = chartData?.datasets?.[0]?.data?.length || 0;
  const shouldUseBezier = dataLength <= 25;
  const shouldUseShadow = dataLength <= 25;

  return (
    <View style={styles.container}>
      <SegmentedControl timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      <View style={[styles.card, styles.bottomCard]}>
        <Text style={styles.cardTitle}>{i18n.t('feedback.historicalAccuracy')}</Text>
        <View style={styles.chartContainer}>
          {hasData && !hasOnlyOneLift && dataLength > 0 ? (
            <LineChart
              data={chartData}
              width={CARD_WIDTH}
              height={180}
              xLabelsOffset={-4}
              chartConfig={lineChartConfig}
              bezier={shouldUseBezier}
              style={styles.chart}
              withDots={false}
              withShadow={shouldUseShadow}
              withInnerLines={false}
              withVerticalLines={false}
              yAxisSuffix="%"
            />
          ) : (
            <View
              style={[
                styles.chart,
                {
                  width: CARD_WIDTH,
                  height: 180,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Text style={{ color: '#8E8E93' }}>
                {hasOnlyOneLift
                  ? i18n.t('performance.chartTitles.moreDataNeeded')
                  : i18n.t('performance.chartTitles.noDataAvailable')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
    paddingTop: 6,
  },
  // --- Segmented control styles ---
  segmentedWrapper: {
    width: '100%',
    marginBottom: 12,
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
    paddingVertical: 5,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bottomCard: {
    // Inherits shadow from card style
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'SF Pro Display',
    marginBottom: 12,
    flexWrap: 'wrap',
    maxWidth: CARD_WIDTH - 32, // Account for padding (16 * 2)
  },
  chartContainer: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    width: '100%',
    marginLeft: -15,
  },
  chart: {
    borderRadius: 16,
  },
});
