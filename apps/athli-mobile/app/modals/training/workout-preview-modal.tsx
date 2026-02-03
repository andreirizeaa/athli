import React, { useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ExercisePreviewCard } from '@/components/features/workout/exercise-preview-card';
import { SectionPreviewCard } from '@/components/features/workout/section-preview-card';

// Local types for preview modal - simpler than builder types
interface PreviewExerciseSet {
  id: string;
  column1: string;
  column2: string;
  type: 'R' | 'W' | 'F' | 'D';
}

interface PreviewExercise {
  id: string;
  exerciseId: string;
  name: string;
  imageUrl?: string;
  sets: PreviewExerciseSet[];
  column1Type: string;
  column2Type: string;
  eachSide?: boolean;
  tempo?: string;
  notes?: string;
  setRestSec?: number;
  alternatives: { id: string; name: string; imageUrl: string }[];
  supersetId?: string;
}

interface PreviewSection {
  id: string;
  name: string;
  sectionType: string;
  exercises: PreviewExercise[];
  rounds?: number;
  durationMin?: number;
  workSec?: number;
  restSec?: number;
  intervalSec?: number;
  notes?: string;
}

interface WorkoutPayloadItem {
  itemType: 'exercise' | 'section';
  data: any;
}

interface WorkoutPayload {
  name?: string;
  items?: WorkoutPayloadItem[];
}

export default function WorkoutPreviewModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const params = useLocalSearchParams<{
    workoutId: string;
    date: string;
    clientId: string;
    coachId: string;
    workoutName: string;
    workoutPayload: string;
  }>();

  // Parse workout data
  const workoutData = useMemo<WorkoutPayload | null>(() => {
    if (!params.workoutPayload) return null;
    try {
      return JSON.parse(params.workoutPayload) as WorkoutPayload;
    } catch {
      return null;
    }
  }, [params.workoutPayload]);

  const handleClose = () => {
    router.back();
  };

  // Convert payload exercise to PreviewExercise format
  const convertToPreviewExercise = (data: any): PreviewExercise => {
    return {
      id: data.id || data.prescribedExerciseId || Math.random().toString(),
      exerciseId: data.prescribedExerciseId || data.exerciseId || '',
      name: data.name || 'Exercise',
      imageUrl: data.imageUrl,
      sets: (data.sets || []).map((set: any, index: number) => ({
        id: set.id || `set-${index}`,
        column1: set.trackableField1?.prescribed?.toString() || set.trackableField1?.completed?.toString() || '',
        column2: set.trackableField2?.prescribed?.toString() || set.trackableField2?.completed?.toString() || '',
        type: (set.type || 'R') as 'R' | 'W' | 'F' | 'D',
      })),
      column1Type: data.sets?.[0]?.trackableField1?.label || 'Reps',
      column2Type: data.sets?.[0]?.trackableField2?.label || 'Weight',
      eachSide: data.eachSide || false,
      tempo: data.tempo || '',
      notes: data.notes || '',
      setRestSec: data.setRestSec || 0,
      alternatives: data.alternatives || [],
      supersetId: data.supersetId,
    };
  };

  // Convert payload section to PreviewSection format
  const convertToPreviewSection = (data: any): PreviewSection => {
    const exercises: PreviewExercise[] = [];

    // Handle different section structures
    if (data.exercises) {
      data.exercises.forEach((group: any) => {
        if (group.exercises) {
          group.exercises.forEach((ex: any) => {
            exercises.push(convertToPreviewExercise(ex));
          });
        } else {
          exercises.push(convertToPreviewExercise(group));
        }
      });
    }

    return {
      id: data.id || Math.random().toString(),
      name: data.name || 'Section',
      sectionType: data.type || 'regular',
      exercises,
      rounds: data.rounds,
      durationMin: data.durationSec ? Math.floor(data.durationSec / 60) : data.durationMin,
      workSec: data.workSec,
      restSec: data.restSec,
      intervalSec: data.intervalSec,
      notes: data.notes || '',
    };
  };

  // Group exercises into supersets and standalone exercises
  const processedItems = useMemo(() => {
    if (!workoutData?.items) return [];

    const result: Array<{
      type: 'exercise' | 'superset' | 'section';
      data: PreviewExercise | PreviewExercise[] | PreviewSection;
    }> = [];

    const processedSupersetIds = new Set<string>();

    workoutData.items.forEach((item) => {
      if (item.itemType === 'exercise') {
        const exercise = convertToPreviewExercise(item.data);

        // Check if this is part of a superset
        if (exercise.supersetId) {
          if (processedSupersetIds.has(exercise.supersetId)) return;
          processedSupersetIds.add(exercise.supersetId);

          // Find all exercises in this superset
          const supersetExercises = (workoutData.items || [])
            .filter(
              (i) =>
                i.itemType === 'exercise' &&
                i.data.supersetId === exercise.supersetId
            )
            .map((i) => convertToPreviewExercise(i.data));

          result.push({
            type: 'superset',
            data: supersetExercises,
          });
        } else {
          result.push({
            type: 'exercise',
            data: exercise,
          });
        }
      } else if (item.itemType === 'section') {
        result.push({
          type: 'section',
          data: convertToPreviewSection(item.data),
        });
      }
    });

    return result;
  }, [workoutData]);

  const workoutName = params.workoutName || workoutData?.name || t('training.title');

  if (!workoutData) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.scrollingHeader}>
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={handleClose}
              size="md"
              color={themeColors.text}
            />
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Preview</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
              {t('general.noData' as any) || 'No data available'}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - scrolls with content */}
        <View style={styles.scrollingHeader}>
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            Preview: {workoutName}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Workout Items */}
        <View style={styles.itemsContainer}>
          {processedItems.map((item, index) => {
            if (item.type === 'exercise') {
              const exercise = item.data as PreviewExercise;
              return (
                <ExercisePreviewCard
                  key={`exercise-${exercise.id}-${index}`}
                  exercise={exercise as any}
                />
              );
            }

            if (item.type === 'superset') {
              const exercises = item.data as PreviewExercise[];
              return (
                <View key={`superset-${index}`}>
                  {exercises.map((exercise, exIdx) => (
                    <ExercisePreviewCard
                      key={`superset-exercise-${exercise.id}-${exIdx}`}
                      exercise={exercise as any}
                      isLinkedToPrev={exIdx > 0}
                      isLinkedToNext={exIdx < exercises.length - 1}
                    />
                  ))}
                </View>
              );
            }

            if (item.type === 'section') {
              const section = item.data as PreviewSection;
              return (
                <SectionPreviewCard
                  key={`section-${section.id}-${index}`}
                  section={section as any}
                />
              );
            }

            return null;
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  itemsContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...typography.p1,
  },
});
