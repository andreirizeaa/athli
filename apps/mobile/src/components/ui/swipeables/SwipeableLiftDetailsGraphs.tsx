import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { track } from '../../../services/analytics';
import i18n from '../../../utils/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(SCREEN_W);
const CARD_WIDTH = Math.round(SCREEN_WIDTH - 40 - 11); // match liftDetails chart width (width - 51)
const ITEM_WIDTH = SCREEN_WIDTH; // page width for snapping
const CARD_HEIGHT = 220;

interface LiftDetailsGraphData {
  reps?: number | null;
  analysis?: {
    lineGraphValues?: number[];
    barChartValues?: number[];
  };
}

interface SwipeableLiftDetailsGraphsProps {
  data: LiftDetailsGraphData;
  formGraphRef?: any;
  depthGraphRef?: any;
}

declare global {
  var setLiftDetailsGraphsIndex: ((index: number) => void) | undefined;
}

const lineChartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  fillShadowGradientFrom: '#000',
  fillShadowGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#000000', fill: '#FFFFFF' },
  propsForBackgroundLines: { strokeDasharray: '2,2' },
};

// === knobs you actually care about ===
const DESIRED_BAR_PX = 4; // exact bar thickness you want
const DESIRED_GAP_PX = 10; // exact gap you want between bars

// === derived values ===
const SLOT_PX = DESIRED_BAR_PX + DESIRED_GAP_PX; // per-rep slot
const BAR_PERCENT = DESIRED_BAR_PX / SLOT_PX; // chart-kit expects this

const barChartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  fillShadowGradientFrom: '#C0C0C0',
  fillShadowGradientTo: '#f1f5f9',
  fillShadowGradientFromOpacity: 1,
  fillShadowGradientToOpacity: 1,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  barPercentage: BAR_PERCENT, // ← the important bit
};

type CardKind = 'line' | 'bar';

export function SwipeableLiftDetailsGraphs({
  data,
  formGraphRef,
  depthGraphRef,
}: SwipeableLiftDetailsGraphsProps) {
  const repsCount = useMemo(() => Math.max(1, Number(data?.reps || 0)), [data?.reps]);
  const labels = useMemo(
    () => Array.from({ length: repsCount }, (_, i) => String(i + 1)),
    [repsCount]
  );

  // IMPORTANT: don't cap width at 1.5×; that re-introduces big slots.
  // Let the chart expand so slot == bar+gap exactly.
  const dynamicChartWidth = useMemo(() => {
    const padding = 80; // labels/margins
    const needed = repsCount * SLOT_PX + padding;
    return Math.max(CARD_WIDTH, needed);
  }, [repsCount]);

  const lineValues = useMemo(() => {
    const arr = Array.isArray(data?.analysis?.lineGraphValues)
      ? data!.analysis!.lineGraphValues!
      : [];
    if (arr.length >= repsCount) return arr.slice(0, repsCount);
    return [...arr, ...Array(repsCount - arr.length).fill(0)];
  }, [data?.analysis?.lineGraphValues, repsCount]);

  const barValues = useMemo(() => {
    const arr = Array.isArray(data?.analysis?.barChartValues)
      ? data!.analysis!.barChartValues!
      : [];
    if (arr.length >= repsCount) return arr.slice(0, repsCount);
    return [...arr, ...Array(repsCount - arr.length).fill(0)];
  }, [data?.analysis?.barChartValues, repsCount]);

  const lineChartData = useMemo(
    () => ({
      labels,
      datasets: [{ data: lineValues, color: () => `#000000`, strokeWidth: 2 }],
    }),
    [labels, lineValues]
  );

  const barChartData = useMemo(
    () => ({
      labels,
      datasets: [{ data: barValues }],
    }),
    [labels, barValues]
  );

  const cards: CardKind[] = useMemo(() => ['line', 'bar'], []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlashList<CardKind>>(null);

  const shouldRenderIndex = useCallback(
    (index: number) => Math.abs(index - currentIndex) <= 1,
    [currentIndex]
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const firstVisibleIndex = viewableItems[0]?.index ?? 0;
      setCurrentIndex((prevIndex) => {
        if (
          firstVisibleIndex !== prevIndex &&
          firstVisibleIndex !== null &&
          firstVisibleIndex !== undefined
        ) {
          // Track lift details clicks for card swipe
          track('Lift details clicks', { event: 'Card swipe' });
          return firstVisibleIndex;
        }
        return prevIndex;
      });
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 0,
    waitForInteraction: false,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CardKind>) => {
      const shouldRender = shouldRenderIndex(index);
      const isFirstCard = index === 0;
      const isSecondCard = index === 1;
      return (
        <View style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
          <View
            ref={isFirstCard ? formGraphRef : isSecondCard ? depthGraphRef : undefined}
            style={[styles.card, styles.bottomCard]}
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            <Text style={styles.cardTitle}>
              {item === 'line'
                ? i18n.t('feedback.formAccuracyAcrossReps')
                : i18n.t('feedback.rangeOfMotionAcrossReps')}
            </Text>
            <View style={styles.chartContainer}>
              {item === 'line' ? (
                shouldRender ? (
                  <LineChart
                    data={lineChartData}
                    width={CARD_WIDTH}
                    height={150}
                    xLabelsOffset={-4}
                    chartConfig={lineChartConfig}
                    bezier
                    withShadow
                    style={styles.chart}
                    withVerticalLines={false}
                    withInnerLines={false}
                    yAxisLabel=""
                    yAxisSuffix="%"
                    xAxisLabel=""
                  />
                ) : (
                  <View
                    style={[
                      styles.chart,
                      {
                        width: CARD_WIDTH,
                        height: 150,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={{ color: '#8E8E93' }}>
                      {i18n.t('performance.chartTitles.loading')}
                    </Text>
                  </View>
                )
              ) : shouldRender ? (
                <BarChart
                  data={barChartData}
                  width={dynamicChartWidth}
                  height={150}
                  fromZero
                  yAxisLabel=""
                  chartConfig={barChartConfig}
                  yAxisSuffix="%"
                  yAxisInterval={10}
                  style={styles.chart}
                  xLabelsOffset={-4}
                  withInnerLines={false}
                />
              ) : (
                <View
                  style={[
                    styles.chart,
                    {
                      width: dynamicChartWidth,
                      height: 160,
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
      );
    },
    [formGraphRef, depthGraphRef, shouldRenderIndex, lineChartData, barChartData]
  );

  // Expose global setter to allow tutorial to jump to a specific card
  useEffect(() => {
    global.setLiftDetailsGraphsIndex = (index: number) => {
      const clamped = Math.max(0, Math.min(index, (cards.length || 1) - 1));
      setCurrentIndex(clamped);
      try {
        listRef.current?.scrollToIndex({ index: clamped, animated: true });
      } catch (_) {}
    };
    return () => {
      try {
        delete global.setLiftDetailsGraphsIndex;
      } catch {}
    };
  }, [cards.length]);

  return (
    <View style={styles.container}>
      <View style={{ width: SCREEN_WIDTH, paddingTop: 8 }}>
        <FlashList
          ref={listRef}
          data={cards}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          overrideItemLayout={(layout, index) => {
            layout.size = ITEM_WIDTH;
            // @ts-ignore
            layout.offset = ITEM_WIDTH * index;
          }}
          estimatedItemSize={ITEM_WIDTH}
          estimatedListSize={{ width: SCREEN_WIDTH, height: CARD_HEIGHT }}
          keyExtractor={(item, i) => `${item}-${i}`}
          renderItem={renderItem}
          removeClippedSubviews
          nestedScrollEnabled
          contentInsetAdjustmentBehavior="never"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          extraData={{ currentIndex }}
        />
      </View>

      <View style={styles.paginationContainer}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.paginationDot,
              i === currentIndex ? styles.paginationDotActive : styles.paginationDotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
    paddingTop: 6,
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -12,
    marginHorizontal: 4,
  },
  paginationDotActive: { backgroundColor: '#000' },
  paginationDotInactive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#000' },
  barValuesOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barValueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '500',
  },
});

export default SwipeableLiftDetailsGraphs;
