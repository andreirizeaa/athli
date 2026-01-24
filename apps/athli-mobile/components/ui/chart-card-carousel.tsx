import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { PressableOpacity } from 'pressto';
import { useThemePreference, useTranslations, useColorScheme } from '@/stores';
import { ValueLineChart } from './value-line-chart';
import { TargetLineChart } from './target-line-chart';
import { SegmentedControl, filterLogsByTimeRange, type TimeRange } from './segmented-control';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TIME_RANGE_SEGMENTS = [
  { label: '90D', value: '90d' as TimeRange },
  { label: '6M', value: '6m' as TimeRange },
  { label: '1Y', value: '1y' as TimeRange },
  { label: 'ALL', value: 'all' as TimeRange },
];

export type ChartCardItem = {
  id: string;
  name: string;
  type: 'metric' | 'habit';
  unit?: string;
  targetValue?: number;
  logs: { value: number; date: string }[];
  streak?: number;
  delta?: { value: number; isUp: boolean };
};

type ChartCardCarouselProps = {
  items: ChartCardItem[];
  onPageChange?: (index: number) => void;
  onItemPress?: (item: ChartCardItem) => void;
};

type PaginationDotsProps = {
  total: number;
  activeIndex: number;
};

const PaginationDots = React.memo(function PaginationDots({
  total,
  activeIndex,
}: PaginationDotsProps) {
  const { colors: themeColors } = useThemePreference();

  if (total <= 1) return null;

  return (
    <View style={styles.paginationContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              borderColor: themeColors.primary,
              backgroundColor: index === activeIndex ? themeColors.primary : 'transparent',
            },
          ]}
        />
      ))}
    </View>
  );
});

type ThemeColors = ReturnType<typeof useThemePreference>['colors'];
type TranslateFunction = ReturnType<typeof useTranslations>['t'];

type ChartCardProps = {
  item: ChartCardItem;
  isVisible: boolean;
  onPress?: () => void;
  themeColors: ThemeColors;
  t: TranslateFunction;
  isDarkMode: boolean;
};

const ChartCard = React.memo(function ChartCard({
  item,
  isVisible,
  onPress,
  themeColors,
  t,
  isDarkMode,
}: ChartCardProps) {
  // Per-card time range state
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');

  // Filter and memoize chart data based on this card's time range
  const chartData = useMemo(() => {
    const filtered = filterLogsByTimeRange(item.logs, timeRange);
    return filtered.map((log) => ({ value: log.value, date: log.date }));
  }, [item.logs, timeRange]);

  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value as TimeRange);
  }, []);

  // Render footer (SegmentedControl) inside the chart card
  // Use surfaceSecondary in dark mode for better visibility
  const segmentBackgroundColor = isDarkMode ? themeColors.surfaceSecondary : themeColors.surfacePrimary;
  
  const renderFooter = useCallback(() => (
    <View style={styles.footerContainer}>
      <SegmentedControl
        segments={TIME_RANGE_SEGMENTS}
        value={timeRange}
        onChange={handleTimeRangeChange}
        backgroundColor={segmentBackgroundColor}
        noPadding
      />
    </View>
  ), [timeRange, handleTimeRangeChange, segmentBackgroundColor]);

  // Only render chart if visible (or adjacent for preloading)
  if (!isVisible) {
    return <View style={styles.cardContainer} />;
  }

  // Use TargetLineChart for habits with targetValue, else ValueLineChart
  const shouldUseTargetChart = item.type === 'habit' && item.targetValue !== undefined;

  const chartContent = shouldUseTargetChart ? (
    <TargetLineChart
      data={chartData}
      targetValue={item.targetValue!}
      unit={item.unit}
      name={item.name}
      streak={item.streak}
      renderFooter={renderFooter}
    />
  ) : (
    <ValueLineChart
      data={chartData}
      name={item.name}
      delta={item.delta}
      renderFooter={renderFooter}
    />
  );

  if (onPress) {
    return (
      <PressableOpacity style={styles.cardContainer} onPress={onPress}>
        {chartContent}
      </PressableOpacity>
    );
  }

  return <View style={styles.cardContainer}>{chartContent}</View>;
});

export const ChartCardCarousel = React.memo(function ChartCardCarousel({
  items,
  onPageChange,
  onItemPress,
}: ChartCardCarouselProps) {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Move hooks to parent to avoid re-renders in ChartCard
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const index = event.nativeEvent.position;
      if (index !== activeIndex) {
        setActiveIndex(index);
        onPageChange?.(index);
      }
    },
    [activeIndex, onPageChange]
  );

  // Determine which pages should be rendered (current +/- 1)
  const visibleIndices = useMemo(() => {
    const indices = new Set<number>();
    indices.add(activeIndex);
    if (activeIndex > 0) indices.add(activeIndex - 1);
    if (activeIndex < items.length - 1) indices.add(activeIndex + 1);
    return indices;
  }, [activeIndex, items.length]);

  // Pre-create stable press handlers for each item
  const pressHandlers = useMemo(() => {
    if (!onItemPress) return null;
    return items.map((item) => () => onItemPress(item));
  }, [items, onItemPress]);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
        offscreenPageLimit={1}
      >
        {items.map((item, index) => (
          <View key={item.id} style={styles.page}>
            <ChartCard
              item={item}
              isVisible={visibleIndices.has(index)}
              onPress={pressHandlers?.[index]}
              themeColors={themeColors}
              t={t}
              isDarkMode={isDarkMode}
            />
          </View>
        ))}
      </PagerView>
      <PaginationDots total={items.length} activeIndex={activeIndex} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pagerView: {
    height: 360,
    width: SCREEN_WIDTH,
  },
  page: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
  },
  footerContainer: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});
