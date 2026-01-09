import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/card';
import { PlatformIcon } from '@/components/platform-icon';

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

  const handleWorkoutPress = (workoutId: string) => {
    router.push({
      pathname: '/library/workout/[id]',
      params: { id: workoutId },
    });
  };

  return (
    <View style={styles.container}>
      {MOCK_WORKOUTS.map((workout) => (
        <PressableOpacity
          key={workout.id}
          onPress={() => handleWorkoutPress(workout.id)}
        >
          <Card style={styles.workoutCard}>
            <View style={styles.cardContent}>
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
          </Card>
        </PressableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  workoutCard: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
