import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useLiftData } from '../../../context/LiftDataContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { Wrapped } from '../../../components/ui/Wrapped';
import { X, Share } from 'lucide-react-native';
import { hapticFeedback } from '../../../utils/haptic';
import { track } from '../../../services/analytics';
import i18n from '../../../utils/i18n';

interface WrappedDetailsScreenProps {
  selectedYear: string;
  onClose: () => void;
}

export function WrappedDetailsScreen({ selectedYear, onClose }: WrappedDetailsScreenProps) {
  const { liftData } = useLiftData();
  const { userDetails } = useUserDetails();
  const wrappedRef = useRef<any>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Filter lift data based on selected year
  const filteredLiftData = useMemo(() => {
    if (selectedYear === 'all') {
      return liftData;
    }
    return liftData.filter((lift) => lift.liftDate.split('-')[2] === selectedYear);
  }, [liftData, selectedYear]);

  // Calculate metrics for the selected year
  const {
    totalVideos,
    totalReps,
    totalWeightMoved,
    favouriteLift,
    longestStreak,
    longestBreak,
    distinctLiftTypes,
    personality,
  } = useMemo(() => {
    const videos = filteredLiftData.length;
    const reps = filteredLiftData.reduce((sum, lift) => sum + (lift.reps || 0), 0);
    const weightMoved = filteredLiftData.reduce((sum, lift) => {
      const weight = lift.metricWeight || 0;
      const reps = lift.reps || 0;
      return sum + weight * reps;
    }, 0);

    // Calculate favourite lift (most frequent lift type)
    const liftTypeCounts = new Map<string, number>();
    filteredLiftData.forEach((lift) => {
      const liftType = lift.liftType;
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

    // Calculate longest streak and longest break
    const sortedDates = filteredLiftData
      .map((lift) => new Date(lift.liftDate.split('-').reverse().join('-'))) // Convert DD-MM-YYYY to YYYY-MM-DD
      .sort((a, b) => a.getTime() - b.getTime());

    let longestStreakDays = 0;
    let longestBreakDays = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    for (const currentDate of sortedDates) {
      if (lastDate) {
        const daysDiff = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day - continue streak
          currentStreak++;
        } else if (daysDiff > 1) {
          // Gap found - check if it's the longest break
          longestBreakDays = Math.max(longestBreakDays, daysDiff - 1);
          currentStreak = 1; // Reset streak
        }
      } else {
        currentStreak = 1; // First day
      }

      longestStreakDays = Math.max(longestStreakDays, currentStreak);
      lastDate = currentDate;
    }

    // Calculate distinct lift types
    const uniqueLiftTypes = new Set(filteredLiftData.map((lift) => lift.liftType).filter(Boolean));
    const distinctLiftTypesCount = uniqueLiftTypes.size;

    // Calculate personality based on lift times
    const liftTimes = filteredLiftData
      .map((lift) => lift.liftTime)
      .filter(Boolean)
      .map((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes; // Convert to minutes since midnight
      });

    let personalityType = 'morningBird'; // Default
    if (liftTimes.length > 0) {
      const averageTime = liftTimes.reduce((sum, time) => sum + time, 0) / liftTimes.length;
      const averageHour = averageTime / 60;

      if (averageHour >= 5 && averageHour < 12) {
        personalityType = 'morningBird';
      } else if (averageHour >= 12 && averageHour < 17) {
        personalityType = 'lunchMonster';
      } else {
        personalityType = 'nightMachine';
      }
    }

    return {
      totalVideos: videos,
      totalReps: reps,
      totalWeightMoved: weightMoved,
      favouriteLift: favouriteLiftName,
      longestStreak: longestStreakDays,
      longestBreak: longestBreakDays,
      distinctLiftTypes: distinctLiftTypesCount,
      personality: personalityType,
    };
  }, [filteredLiftData]);

  const handleClose = () => {
    hapticFeedback.selection();
    track('Wrapped details', { action: 'close', year: selectedYear });
    onClose();
  };

  const handleShare = () => {
    hapticFeedback.selection();
    track('Wrapped details', { action: 'share', year: selectedYear });
    // Trigger the share functionality from the Wrapped component
    if (wrappedRef.current?.handleShare) {
      wrappedRef.current.handleShare();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
          <X size={24} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.title}>{i18n.t('performance.overview')}</Text>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
          <Share size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Dimensions.get('window').height, 0],
                }),
              },
              {
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          }}
        >
          <Wrapped
            ref={wrappedRef}
            totalVideos={totalVideos}
            totalReps={totalReps}
            totalWeightMoved={totalWeightMoved}
            favouriteLift={favouriteLift}
            longestStreak={longestStreak}
            longestBreak={longestBreak}
            distinctLiftTypes={distinctLiftTypes}
            personality={personality}
            unitSystem={userDetails?.unitSystem || 'metric'}
            liftData={filteredLiftData}
            selectedYear={selectedYear}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
