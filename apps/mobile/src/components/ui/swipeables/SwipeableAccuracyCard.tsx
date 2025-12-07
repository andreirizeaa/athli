import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { hapticFeedback } from '../../../utils/haptic';
import { CircularProgressChart } from '../../icons/icons';
import { useLiftData } from '../../../context/LiftDataContext';
import { useLoadingLifts } from '../../../context/LoadingLiftsContext';
import { useSelectedDate } from '../../../context/SelectedDateContext';
import { track } from '../../../services/analytics';

// Use integer dimensions for precise snapping
const SCREEN_WIDTH = Math.round(Dimensions.get('window').width);
const ITEM_WIDTH = SCREEN_WIDTH; // page width = screen width
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.9);
const CARD_HEIGHT = 160;

interface AccuracyCardData {
  percentage: number;
  label: string;
}

interface SwipeableAccuracyCardProps {
  cardData: AccuracyCardData[];
  currentCardIndex: number;
  onCardIndexChange: (index: number) => void;
  externalScrollGestureRef?: React.RefObject<any>;
}

export function SwipeableAccuracyCard({
  cardData,
  currentCardIndex,
  onCardIndexChange,
  externalScrollGestureRef,
}: SwipeableAccuracyCardProps) {
  const { addLift, formatDateForLift } = useLiftData();
  const { purgeAllLoadingLifts } = useLoadingLifts();
  const { selectedDate } = useSelectedDate();

  // Create a ref to control the list
  const listRef = useRef<FlashList<AccuracyCardData> | null>(null);

  // Track a local index for UI/lazy render; notify parent only on settle
  const [localIndex, setLocalIndex] = React.useState(currentCardIndex);

  // Keep local index in sync when parent jumps
  useEffect(() => {
    setLocalIndex(Math.max(0, Math.min(currentCardIndex, cardData.length - 1)));
  }, [currentCardIndex, cardData.length]);

  // Compute a stable fingerprint for the values so FlashList knows to update
  const dataVersion = React.useMemo(
    () => cardData.map((c) => `${c.label}:${c.percentage}`).join('|'),
    [cardData]
  );

  // Use local index for lazy mount window
  const shouldRenderIndex = useCallback(
    (index: number) => Math.abs(index - localIndex) <= 1,
    [localIndex]
  );

  // Update local index smoothly while dragging (NO parent calls here)
  const onScroll = useCallback(
    (e: any) => {
      const x = e?.nativeEvent?.contentOffset?.x || 0;
      const idx = Math.max(
        0,
        Math.min(Math.floor((x + ITEM_WIDTH / 2) / ITEM_WIDTH), (cardData.length || 1) - 1)
      );
      if (idx !== localIndex) setLocalIndex(idx);
    },
    [localIndex, cardData.length]
  );

  // Only tell parent when momentum ends (commit)
  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const x = e?.nativeEvent?.contentOffset?.x || 0;
      const idx = Math.max(0, Math.min(Math.round(x / ITEM_WIDTH), (cardData.length || 1) - 1));
      if (idx !== currentCardIndex) {
        // Track home screen clicks for accuracy card swipe
        track('Home screen clicks', { event: 'Accuracy card swipe' });
        onCardIndexChange(idx);
      }
    },
    [currentCardIndex, cardData.length, onCardIndexChange]
  );

  // Keep the list in sync if the parent changes currentCardIndex
  useEffect(() => {
    const i = Math.max(0, Math.min(currentCardIndex, cardData.length - 1));
    listRef.current?.scrollToIndex({ index: i, animated: true });
  }, [currentCardIndex, cardData.length]);

  const handleAddTestLift = () => {
    hapticFeedback.selection();

    // Random movement selection
    const movements = [
      'Barbell Front Squat',
      'Deadlift',
      'Bench Press',
      'Overhead Press',
      'Romanian Deadlift',
      'Goblet Squat',
      'Push-ups',
      'Pull-ups',
      'Lunges',
      'Planks',
      'Bent Over Rows',
      'Shoulder Press',
      'Bicep Curls',
      'Tricep Dips',
      'Leg Press',
    ];

    // Add 1000 test lifts
    for (let i = 0; i < 1000; i++) {
      const randomMovement = movements[Math.floor(Math.random() * movements.length)];

      // Random accuracy between 60-95%
      const randomAccuracy = Math.floor(Math.random() * 36) + 60;

      // Random reps between 1-12
      const randomReps = Math.floor(Math.random() * 12) + 1;

      // Random weight between 1-500
      const randomWeight = Math.floor(Math.random() * 500) + 1;

      // Generate random line graph values based on reps
      const randomLineGraphValues = Array.from(
        { length: randomReps },
        () => Math.floor(Math.random() * 36) + 60
      );

      // Random time between 8 AM and 10 PM
      const randomHour = Math.floor(Math.random() * 14) + 8;
      const randomMinute = Math.floor(Math.random() * 60);
      const randomTime = `${randomHour > 12 ? randomHour - 12 : randomHour}:${randomMinute.toString().padStart(2, '0')} ${randomHour >= 12 ? 'PM' : 'AM'}`;

      // Generate random date within the last 30 days
      const today = new Date();
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const randomDate = new Date(today);
      randomDate.setDate(today.getDate() - randomDaysAgo);

      const id = `demo-${today.getTime()}-${i}-${Math.random().toString(36).substr(2, 9)}`;

      addLift({
        id,
        isFavourite: Math.random() > 0.7, // 30% chance of being favourite
        liftType: randomMovement,
        liftDate: formatDateForLift(randomDate),
        liftTime: randomTime,
        metricWeight: randomWeight,
        reps: randomReps,
        rawVideoURL: require('../../../../assets/tutorial/formai-example-video.mp4'),
        poseVideoURL: require('../../../../assets/tutorial/formai-example-pose.mp4'),
        thumbnailURL: require('../../../../assets/tutorial/formai-example-video-thumbnail.jpg'),
        analysis: {
          accuracy: randomAccuracy,
          lineGraphValues: randomLineGraphValues,
          barChartValues: randomLineGraphValues,
          feedback: [
            {
              imageURL: require('../../../../assets/tutorial/formai-example-feedback.png'),
              flaws: [
                'Right knee is caving inward compared to the left, showing knee valgus.',
                'Right ankle angle suggests the heel may be lifting more than the left.',
                'Torso is leaning forward excessively, which stresses the lower back.',
                'Barbell path is slightly forward of mid-foot, reducing lifting efficiency.',
                'Hip angle indicates possible butt wink or pelvic tuck at the bottom.',
              ],
              improvement: [
                "Actively push knees out and think 'spread the floor' with your feet to prevent valgus.",
                'Improve ankle dorsiflexion with stretches and banded mobilizations to keep heels grounded.',
                'Brace your core harder using the Valsalva maneuver to maintain an upright torso.',
                'Keep the bar over mid-foot and adjust grip width to tighten the upper back.',
                'Strengthen glutes and hamstrings with RDLs, hip thrusts, and pause squats to control hip position.',
                'Consider weightlifting shoes with a heel lift if ankle mobility limits squat depth.',
              ],
            },
          ],
        },
      });
    }
  };

  const handlePruneLifts = () => {
    hapticFeedback.selection();

    // Purge all loading lifts from memory and AsyncStorage
    purgeAllLoadingLifts();
  };

  return (
    <View style={styles.root}>
      <View style={{ width: SCREEN_WIDTH, height: CARD_HEIGHT }}>
        <FlashList
          ref={listRef}
          data={cardData}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          // same snap config as LineGraph
          snapToInterval={ITEM_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum // ← helps remove the "pause then snap" on iOS
          // ✅ Exact layout (no guessing)
          overrideItemLayout={(layout, index) => {
            layout.size = ITEM_WIDTH;
            // @ts-ignore
            layout.offset = ITEM_WIDTH * index;
          }}
          estimatedItemSize={ITEM_WIDTH}
          estimatedListSize={{ width: SCREEN_WIDTH, height: CARD_HEIGHT }}
          keyExtractor={(item, i) => `${item.label}-${item.percentage}-${i}`}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: ITEM_WIDTH,
                height: CARD_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={styles.accuracyCard} renderToHardwareTextureAndroid shouldRasterizeIOS>
                <View style={styles.accuracyCardContent}>
                  <View style={styles.accuracyCardLeftSection}>
                    <Text style={styles.accuracyCardNumber}>{item.percentage}%</Text>
                    <Text style={styles.accuracyCardLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.accuracyCardRightSection}>
                    {shouldRenderIndex(index) && (
                      <CircularProgressChart
                        width={120}
                        height={120}
                        percentage={item.percentage}
                        progressColor="#000000"
                        backgroundColor="#E5E5E5"
                        strokeWidth={11}
                        radius={54}
                        showTargetIcon
                        iconColor="#000000"
                        iconSize={20}
                        animationKey={selectedDate.toDateString()}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
          removeClippedSubviews
          nestedScrollEnabled
          contentInsetAdjustmentBehavior="never"
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          // re-render items when these change (dots + lazy window + data version)
          extraData={{ localIndex, len: cardData.length, ver: dataVersion }}
        />
      </View>

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {cardData.map((_, i) => (
          <View
            key={i}
            style={[
              styles.paginationDot,
              i === localIndex ? styles.paginationDotActive : styles.paginationDotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    // 🚫 no paddingBottom / marginBottom here
  },
  cardWrapper: {
    width: ITEM_WIDTH, // ✅ each page = screen width
    height: CARD_HEIGHT, // <-- clamp
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: CARD_WIDTH, // ✅ narrower card = gap at edges
    height: CARD_HEIGHT, // <-- fixed, no auto growth
  },
  accuracyCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  accuracyCardLeftSection: { alignItems: 'flex-start', paddingLeft: 8, width: 120 },
  accuracyCardNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SF Pro Display',
  },
  accuracyCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'SF Pro Text',
    width: 160,
    flexWrap: 'wrap',
  },
  accuracyCardRightSection: { alignItems: 'center' },

  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 30,
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
});
