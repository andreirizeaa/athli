import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';

interface TimeGridProps {
  selectedDate: Date | null;
}

export const TimeGrid = ({ selectedDate }: TimeGridProps) => {
  const { colors: themeColors } = useThemePreference();
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate hourly times in 12-hour format
  const hourlyTimes = useMemo(() => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour < 12 ? 'AM' : 'PM';
      times.push(`${displayHour} ${period}`);
    }
    // Add 12 AM at the end (next day's midnight)
    times.push('12 AM');
    return times;
  }, []);

  // Calculate current time position (only if selected date is today)
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only show if selected date is today (or no date selected, default to today)
    const isToday = !selectedDate || 
      (selectedDate.getDate() === now.getDate() &&
       selectedDate.getMonth() === now.getMonth() &&
       selectedDate.getFullYear() === now.getFullYear());
    
    if (!isToday) return null;

    const currentHour = now.getHours(); // 0-23, where 0 = 12 AM
    const currentMinutes = now.getMinutes();
    const rowHeight = 70;
    
    // Each row represents 60 minutes (1 hour), starting from 12 AM (hour 0) at position 0
    // Row 0 (12 AM): position 0-70px
    // Row 1 (1 AM): position 70-140px
    // Row 14 (2 PM): position 980-1050px
    // etc.
    
    // Calculate position: start from hour 0 (12 AM) at 0px
    // Each hour = 70px, each minute = 70/60 = 1.1667px
    const hourStartPosition = currentHour * rowHeight; // Position of the start of current hour
    const minutesOffset = currentMinutes * (rowHeight / 60); // Offset within the hour
    const timePosition = hourStartPosition + minutesOffset;
    
    // Add the gap between the swipeable calendar divider and the first 12 AM row
    // The divider has marginTop: 4, and there's no paddingTop on the ScrollView content
    // So the gap is effectively 0, but we'll return both values for flexibility
    const gapFromDivider = 0; // Gap between divider and first time row
    
    return {
      position: timePosition,
      gapFromDivider,
      totalPosition: timePosition + gapFromDivider,
    };
  }, [selectedDate]);

  // Scroll to current time on initial mount (only scroll the time grid)
  useEffect(() => {
    if (currentTimePosition !== null && scrollViewRef.current) {
      // Scroll to show current time near center of viewport
      const scrollOffset = currentTimePosition.totalPosition - 200; // Offset to show time near center
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, scrollOffset),
          animated: false,
        });
      }, 100);
    }
  }, []); // Only on mount

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.timeGridScrollView}
      contentContainerStyle={styles.timeGridContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.timeGridContainer}>
        {hourlyTimes.map((time, index) => (
          <View key={index} style={styles.timeRow}>
            {/* Left column: Time text (1/5 width) */}
            <View style={styles.timeColumn}>
              <Text style={[styles.timeText, { color: themeColors.mutedText }]}>{time}</Text>
            </View>
            {/* Right column: Divider line (4/5 width) */}
            <View style={styles.dividerColumn}>
              <View style={[styles.timeDivider, { backgroundColor: themeColors.mutedText, opacity: 0.3 }]} />
            </View>
          </View>
        ))}
        
        {/* Current Time Indicator */}
        {currentTimePosition !== null && (
          <View 
            style={[
              styles.currentTimeIndicator,
              { top: currentTimePosition.totalPosition + 35 }
            ]}
          >
            {/* Triangle on the left pointing right */}
            <View style={[styles.triangle, { borderLeftColor: themeColors.primary }]} />
            {/* Divider line */}
            <View style={[styles.currentTimeDivider, { backgroundColor: themeColors.primary }]} />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  timeGridScrollView: {
    flex: 1,
  },
  timeGridContent: {
    paddingBottom: 60,
  },
  timeGridContainer: {
    width: '100%',
    marginBottom: 60,
  },
  timeRow: {
    flexDirection: 'row',
    height: 70,
    width: '100%',
  },
  timeColumn: {
    width: '14.285%', // 1/7
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
    paddingLeft: 0,
  },
  dividerColumn: {
    width: '85.715%', // 6/7
    justifyContent: 'center',
    paddingRight: 20,
    paddingLeft: 8,
  },
  timeText: {
    ...typography.p3,
    fontSize: 12,
  },
  timeDivider: {
    width: '100%',
    height: 1,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: '14.285%', // Align with divider column start (1/7)
  },
  currentTimeDivider: {
    flex: 1,
    height: 2,
    marginRight: 20,
    marginLeft: -4,
  },
});

