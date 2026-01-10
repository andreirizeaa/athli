import React, { useMemo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { useLibraryTab } from '@/contexts/useLibraryTab';
import { SwipeableRow } from '@/components/swipeable-row';

// Mock workout data
const MOCK_WORKOUTS = [
  {
    id: 'workout-1',
    name: 'Full Body Strength Training',
    type: 'Weightlifting',
    difficulty: 'Intermediate',
  },
  {
    id: 'workout-2',
    name: 'HIIT Cardio Blast',
    type: 'HIIT',
    difficulty: 'Advanced',
  },
];

export const WorkoutsTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();

  const filteredWorkouts = useMemo(() => {
    if (!searchQuery) return MOCK_WORKOUTS;
    const query = searchQuery.toLowerCase();
    return MOCK_WORKOUTS.filter(
      (workout) =>
        workout.name.toLowerCase().includes(query) ||
        workout.type.toLowerCase().includes(query) ||
        workout.difficulty.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleWorkoutPress = (workoutId: string) => {
    closeOpenRow();
    router.push({
      pathname: '/library/workout/[id]',
      params: { id: workoutId },
    });
  };

  const handleDelete = useCallback((id: string) => {
    console.log('Delete workout:', id);
    // In a real app, this would dispatch a delete action
  }, []);

  return (
    <View style={styles.container}>
      {filteredWorkouts.map((workout, index) => {
        const isLastItem = index === filteredWorkouts.length - 1;
        return (
          <View key={workout.id}>
            <SwipeableRow
              onDelete={() => handleDelete(workout.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${workout.name}?`}
            >
              <PressableOpacity
                onPress={() => handleWorkoutPress(workout.id)}
                style={styles.rowWrapper}
              >
                <View style={[styles.rowContent, { backgroundColor: themeColors.background }]}>
                  <View style={styles.iconContainer}>
                    <PlatformIcon
                      sf="dumbbell.fill"
                      IconComponent={Dumbbell}
                      size={24}
                      color={themeColors.text}
                    />
                  </View>
                  <View style={styles.textContent}>
                    <Text
                      style={[styles.workoutName, { color: themeColors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {workout.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {workout.type}
                      </Text>
                      <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {workout.difficulty}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableOpacity>
            </SwipeableRow>

            {!isLastItem && (
              <View style={styles.separatorContainer}>
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                  ]}
                />
              </View>
            )}

            {isLastItem && <View style={{ height: 24 }} />}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  workoutName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.p3,
  },
  metaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 72,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
