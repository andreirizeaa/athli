import React, { useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import {
  X,
  Clock,
  Dumbbell,
  LayoutGrid,
  CheckCircle2,
  Moon,
  Sun,
  Zap,
  Brain,
  LucideIcon,
  Repeat,
  Timer,
  Flame,
} from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { TextAreaInput } from '@/components/ui/form-inputs/text-area-input';
import { useExerciseLookup } from '@/hooks/useAllExercises';
import type {
  WorkoutPayload,
  WorkoutPre,
  WorkoutSectionPayload,
  RegularExercisePayload,
} from '@athli/shared-types';
import { en } from '@/lib/i18n/en';

// Rating colors (1-5 scale)
const RATING_COLORS = [
  '#EF4444', // 1 - red
  '#F97316', // 2 - orange
  '#FBBF24', // 3 - amber/yellow
  '#84CC16', // 4 - lime
  '#22C55E', // 5 - green
];

// Section type colors
const SECTION_COLORS: Record<string, string> = {
  regular: '#3B82F6', // Blue
  auxiliary: '#6B7280', // Gray
  circuits: '#EC4899', // Pink
  tabata: '#F43F5E', // Rose
  hiit: '#8B5CF6', // Purple
  emom: '#10B981', // Emerald
  amrap: '#F59E0B', // Amber
  supersets: '#F97316', // Orange
  exercise: '#3B82F6', // Blue for standalone exercises
};

// Section type icons
const SECTION_ICONS: Record<string, { sf: string; IconComponent: LucideIcon }> = {
  regular: { sf: 'dumbbell', IconComponent: Dumbbell },
  auxiliary: { sf: 'dumbbell', IconComponent: Dumbbell },
  circuits: { sf: 'repeat', IconComponent: Repeat },
  tabata: { sf: 'timer', IconComponent: Timer },
  hiit: { sf: 'flame', IconComponent: Flame },
  emom: { sf: 'timer', IconComponent: Timer },
  amrap: { sf: 'timer', IconComponent: Timer },
  supersets: { sf: 'dumbbell', IconComponent: Dumbbell },
  exercise: { sf: 'dumbbell', IconComponent: Dumbbell },
};

// Readiness field config
type ReadinessField = keyof WorkoutPre;
const READINESS_FIELDS: ReadinessField[] = ['sleep', 'mood', 'energy', 'stress', 'soreness'];

// Fields where lower is better (inverted color scale)
const INVERTED_FIELDS: ReadinessField[] = ['stress', 'soreness'];

const FIELD_ICONS: Record<ReadinessField, { sf: string; IconComponent: LucideIcon }> = {
  sleep: { sf: 'moon.zzz', IconComponent: Moon },
  mood: { sf: 'sun.max.fill', IconComponent: Sun },
  energy: { sf: 'bolt', IconComponent: Zap },
  stress: { sf: 'brain', IconComponent: Brain },
  soreness: { sf: 'heart.badge.bolt', IconComponent: Dumbbell },
};

const READINESS_LABELS: Record<ReadinessField, string[]> = en.training.readiness.labels;

// Short labels for compact display
const FIELD_SHORT_LABELS: Record<ReadinessField, string> = {
  sleep: 'Sleep',
  mood: 'Mood',
  energy: 'Energy',
  stress: 'Stress',
  soreness: 'Soreness',
};

// Set summary for display
type SetSummary = {
  field1Label: string;
  field1Value: string | null;
  field2Label: string;
  field2Value: string | null;
};

// Exercise preview item
type ExercisePreviewItem = {
  exerciseId: string;
  isLinkedToNext: boolean;
  sets?: SetSummary[];
};

// Workout breakdown item type
type BreakdownItem =
  | { type: 'exercise'; exercise: RegularExercisePayload; completed: boolean; startLetterIndex: number }
  | { type: 'superset'; exercises: RegularExercisePayload[]; completed: boolean; startLetterIndex: number }
  | {
      type: 'section';
      section: WorkoutSectionPayload;
      sectionType: string;
      name: string;
      exerciseItems: ExercisePreviewItem[];
      completed: boolean;
      details?: string;
      startLetterIndex: number;
    };

// Generate letter from index (A, B, C, ... Z, AA, AB, ...)
const getLetterLabel = (index: number): string => {
  let label = '';
  let num = index;
  do {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);
  return label;
};

// Calculate labels for exercises with a starting letter index
const calculateLabels = (
  exercises: ExercisePreviewItem[],
  startIndex: number
): string[] => {
  const result: string[] = [];
  let letterIndex = startIndex;
  let numberInGroup = 1;

  exercises.forEach((item, index) => {
    const isLinkedToPrev = index > 0 && exercises[index - 1].isLinkedToNext;
    const isLinkedToNext = item.isLinkedToNext;
    const isInSuperset = isLinkedToPrev || isLinkedToNext;

    if (isLinkedToPrev) {
      numberInGroup++;
    } else {
      if (index > 0) {
        letterIndex++;
      }
      numberInGroup = 1;
    }

    const letter = getLetterLabel(letterIndex);
    result.push(isInSuperset ? `${letter}${numberInGroup}` : letter);
  });

  return result;
};

const HEADER_HEIGHT = 52;

export default function WorkoutReviewModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { findExerciseById } = useExerciseLookup();

  const params = useLocalSearchParams<{
    workoutId: string;
    date: string;
    clientId: string;
    coachId: string;
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

  // Extract set summaries from an exercise
  const extractSetSummaries = (sets: any[]): SetSummary[] => {
    return sets.map((set) => ({
      field1Label: set.trackableField1?.label || '',
      field1Value: set.trackableField1?.completed || set.trackableField1?.prescribed || null,
      field2Label: set.trackableField2?.label || '',
      field2Value: set.trackableField2?.completed || set.trackableField2?.prescribed || null,
    }));
  };

  // Extract exercises from a section
  const extractSectionExercises = (section: WorkoutSectionPayload): ExercisePreviewItem[] => {
    const items: ExercisePreviewItem[] = [];

    if (section.type === 'regular' || section.type === 'auxiliary') {
      section.exercises?.forEach((group) => {
        const isSuperset = group.isSuperset && group.exercises && group.exercises.length > 1;
        group.exercises?.forEach((ex, idx) => {
          items.push({
            exerciseId: ex.prescribedExerciseId,
            isLinkedToNext: isSuperset && idx < group.exercises.length - 1,
            sets: extractSetSummaries(ex.sets || []),
          });
        });
      });
    } else if (
      section.type === 'circuits' ||
      section.type === 'tabata' ||
      section.type === 'hiit' ||
      section.type === 'emom'
    ) {
      section.exercises?.forEach((group) => {
        group.exercises?.forEach((ex: any) => {
          items.push({
            exerciseId: ex.prescribedExerciseId,
            isLinkedToNext: false,
            sets: ex.set ? [{
              field1Label: ex.set.trackableField1?.label || '',
              field1Value: ex.set.trackableField1?.completed || ex.set.trackableField1?.prescribed || null,
              field2Label: ex.set.trackableField2?.label || '',
              field2Value: ex.set.trackableField2?.completed || ex.set.trackableField2?.prescribed || null,
            }] : [],
          });
        });
      });
    } else if (section.type === 'amrap') {
      section.exercises?.forEach((ex: any) => {
        items.push({
          exerciseId: ex.prescribedExerciseId,
          isLinkedToNext: false,
          sets: [{
            field1Label: ex.trackableField1?.label || '',
            field1Value: ex.trackableField1?.completed || ex.trackableField1?.prescribed || null,
            field2Label: ex.trackableField2?.label || '',
            field2Value: ex.trackableField2?.completed || ex.trackableField2?.prescribed || null,
          }],
        });
      });
    }

    return items;
  };

  // Build workout breakdown items
  const breakdownItems = useMemo<BreakdownItem[]>(() => {
    if (!workoutData?.items) return [];

    const items: BreakdownItem[] = [];
    const processedSupersetIds = new Set<string>();
    let currentLetterIndex = 0;

    workoutData.items.forEach((item) => {
      if (item.itemType === 'exercise') {
        const exercise = item.data as RegularExercisePayload;

        // Check if this is part of a superset
        if (exercise.supersetId) {
          if (processedSupersetIds.has(exercise.supersetId)) return;
          processedSupersetIds.add(exercise.supersetId);

          const supersetExercises = workoutData.items
            .filter(
              (i) =>
                i.itemType === 'exercise' &&
                (i.data as RegularExercisePayload).supersetId === exercise.supersetId
            )
            .map((i) => i.data as RegularExercisePayload);

          const allCompleted = supersetExercises.every(
            (ex) => ex.completed === 'completed' || (ex.completed as any) === true
          );

          items.push({
            type: 'superset',
            exercises: supersetExercises,
            completed: allCompleted,
            startLetterIndex: currentLetterIndex,
          });
          // Superset uses one letter with numbers (e.g., A1, A2)
          currentLetterIndex++;
        } else {
          items.push({
            type: 'exercise',
            exercise,
            completed: exercise.completed === 'completed' || (exercise.completed as any) === true,
            startLetterIndex: currentLetterIndex,
          });
          currentLetterIndex++;
        }
      } else if (item.itemType === 'section') {
        const section = item.data as WorkoutSectionPayload;
        const isCompleted = section.completed === 'completed' || (section.completed as any) === true;
        const exerciseItems = extractSectionExercises(section);

        let details: string | undefined;

        if (
          section.type === 'circuits' ||
          section.type === 'tabata' ||
          section.type === 'hiit' ||
          section.type === 'emom'
        ) {
          const rounds = (section as any).rounds || (section as any).completedRounds || 0;
          const completedRounds = (section as any).completedRounds || 0;
          details = `${completedRounds}/${rounds} rounds`;
        } else if (section.type === 'amrap') {
          const roundsCompleted = (section as any).roundsCompleted || 0;
          const durationSec = (section as any).durationSec || 0;
          const durationMin = Math.floor(durationSec / 60);
          details = `${roundsCompleted} rounds in ${durationMin}min`;
        }

        items.push({
          type: 'section',
          section,
          sectionType: section.type,
          name: section.name,
          exerciseItems,
          completed: isCompleted,
          details,
          startLetterIndex: currentLetterIndex,
        });

        // Count exercises in section for letter index progression
        // For supersets within section, count as 1 letter
        let sectionLetterCount = 0;
        let inSuperset = false;
        exerciseItems.forEach((ex, idx) => {
          if (!inSuperset) {
            sectionLetterCount++;
          }
          inSuperset = ex.isLinkedToNext;
        });
        currentLetterIndex += sectionLetterCount;
      }
    });

    return items;
  }, [workoutData]);

  // Calculate workout stats
  const workoutStats = useMemo(() => {
    if (!workoutData) return null;

    let totalExercises = 0;
    let completedExercises = 0;
    let totalSections = 0;
    let completedSections = 0;
    let totalSets = 0;
    let completedSets = 0;

    breakdownItems.forEach((item) => {
      if (item.type === 'exercise') {
        totalExercises++;
        if (item.completed) completedExercises++;
        // Count sets for regular exercises
        const sets = item.exercise.sets || [];
        totalSets += sets.length;
        completedSets += sets.filter((s) => s.completed === 'completed').length;
      } else if (item.type === 'superset') {
        totalExercises += item.exercises.length;
        if (item.completed) completedExercises += item.exercises.length;
        // Count sets for superset exercises
        item.exercises.forEach((ex) => {
          const sets = ex.sets || [];
          totalSets += sets.length;
          completedSets += sets.filter((s) => s.completed === 'completed').length;
        });
      } else if (item.type === 'section') {
        totalSections++;
        totalExercises += item.exerciseItems.length;
        if (item.completed) {
          completedSections++;
          completedExercises += item.exerciseItems.length;
        }
      }
    });

    let durationMinutes = workoutData.completedSummary?.totalDurationMin || 0;

    if (
      !durationMinutes &&
      workoutData.completedSummary?.startedAt &&
      workoutData.completedSummary?.completedAt
    ) {
      const startedAt = new Date(workoutData.completedSummary.startedAt).getTime();
      const completedAt = new Date(workoutData.completedSummary.completedAt).getTime();
      const totalPausedMs = workoutData.completedSummary.totalPausedMs || 0;
      durationMinutes = Math.round((completedAt - startedAt - totalPausedMs) / 60000);
    }

    return {
      totalExercises,
      completedExercises,
      totalSections,
      completedSections,
      totalSets,
      completedSets,
      durationMinutes,
    };
  }, [workoutData, breakdownItems]);

  const handleClose = () => {
    router.back();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) return '<1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getSectionTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      regular: t('training.sections.regular' as any) || 'Regular',
      auxiliary: t('training.sections.auxiliary' as any) || 'Auxiliary',
      circuits: t('training.sections.circuits' as any) || 'Circuits',
      tabata: t('training.sections.tabata' as any) || 'Tabata',
      hiit: t('training.sections.hiit' as any) || 'HIIT',
      emom: t('training.sections.emom' as any) || 'EMOM',
      amrap: t('training.sections.amrap' as any) || 'AMRAP',
      supersets: t('training.sections.supersets' as any) || 'Supersets',
    };
    return labels[type] || type;
  };

  const getExerciseName = (exerciseId: string): string => {
    const exercise = findExerciseById(exerciseId);
    return exercise?.name || 'Exercise';
  };

  // Format set details for display
  const formatSetDetails = (sets?: SetSummary[], hideSetCount?: boolean): string | null => {
    if (!sets || sets.length === 0) return null;

    const setCount = sets.length;
    const firstSet = sets[0];

    // Build the detail string
    const parts: string[] = [];

    // Add set count (unless hidden for single-set sections)
    if (!hideSetCount) {
      parts.push(`${setCount} ${setCount === 1 ? 'set' : 'sets'}`);
    }

    // Add field values if available (use first set as representative)
    if (firstSet.field1Value) {
      parts.push(`${firstSet.field1Value} ${firstSet.field1Label}`);
    }
    if (firstSet.field2Value) {
      parts.push(`${firstSet.field2Value} ${firstSet.field2Label}`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  };

  // Render exercise list inside a card
  const renderExerciseList = (
    exercises: ExercisePreviewItem[],
    color: string,
    startLetterIndex: number,
    hideSetCount?: boolean,
    textColor?: string
  ) => {
    if (!exercises || exercises.length === 0) return null;

    const labels = calculateLabels(exercises, startLetterIndex);
    const labelTextColor = textColor || '#FFFFFF';

    return (
      <View style={styles.exerciseList}>
        {exercises.map((item, index) => {
          const isLinkedToPrev = index > 0 && exercises[index - 1].isLinkedToNext;
          const setDetails = formatSetDetails(item.sets, hideSetCount);

          return (
            <React.Fragment key={`${item.exerciseId}-${index}`}>
              {isLinkedToPrev && (
                <View style={[styles.connectorLine, { backgroundColor: color }]} />
              )}
              <View style={styles.exerciseRow}>
                <View style={[styles.numberCircle, { backgroundColor: color }]}>
                  <Text style={[styles.numberText, { color: labelTextColor }]}>{labels[index]}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: themeColors.text }]}>
                    {getExerciseName(item.exerciseId)}
                  </Text>
                  {setDetails && (
                    <Text style={[styles.exerciseSetDetails, { color: themeColors.mutedText }]}>
                      {setDetails}
                    </Text>
                  )}
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  if (!workoutData || !workoutStats) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
              {t('general.noData' as any) || 'No data available'}
            </Text>
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('training.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  }

  const readinessData = workoutData.pre;

  // Calculate number of lines for feedback text
  const feedbackLineCount = useMemo(() => {
    if (!workoutData?.post?.sessionComments) return 2;
    const text = workoutData.post.sessionComments;
    // Estimate lines based on character count (roughly 40 chars per line)
    const estimatedLines = Math.ceil(text.length / 40);
    return Math.max(2, Math.min(estimatedLines, 8)); // Min 2, max 8 lines
  }, [workoutData?.post?.sessionComments]);

  const sessionRating = workoutData?.post?.rating;
  const sessionIntensity = workoutData?.post?.intensity;
  const sessionComments = workoutData?.post?.sessionComments;
  const hasFeedback = sessionRating || sessionIntensity || sessionComments;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Readiness Summary */}
        {readinessData && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              {t('training.readiness.title')}
            </Text>
            <View style={styles.readinessRow}>
              {READINESS_FIELDS.map((field) => {
                const value = readinessData[field];
                const isInverted = INVERTED_FIELDS.includes(field);
                // For inverted fields (stress, soreness), lower is better: 1=green, 5=red
                const colorIndex = value ? (isInverted ? 5 - value : value - 1) : -1;
                const color = colorIndex >= 0 ? RATING_COLORS[colorIndex] : themeColors.border;
                const label = value ? READINESS_LABELS[field][value - 1] : '-';
                const iconConfig = FIELD_ICONS[field];

                return (
                  <View key={field} style={styles.readinessItem}>
                    <SquircleView
                      cornerSmoothing={1}
                      style={[
                        styles.readinessBox,
                        {
                          backgroundColor: value ? `${color}20` : themeColors.surfaceSecondary,
                          borderColor: color,
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <PlatformIcon
                        sf={iconConfig.sf}
                        IconComponent={iconConfig.IconComponent}
                        size={20}
                        color={color}
                      />
                      <Text
                        style={[styles.readinessLabel, { color }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {label}
                      </Text>
                      <Text style={[styles.readinessFieldName, { color: themeColors.mutedText }]}>
                        {FIELD_SHORT_LABELS[field]}
                      </Text>
                    </SquircleView>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Workout Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {t('training.review.summary' as any) || 'Summary'}
          </Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: `${themeColors.primary}20` }]}>
                <PlatformIcon sf="clock" IconComponent={Clock} size={20} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {formatDuration(workoutStats.durationMinutes)}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                {t('training.review.duration' as any) || 'Duration'}
              </Text>
            </Card>

            <Card style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#22C55E20' }]}>
                <PlatformIcon sf="dumbbell" IconComponent={Dumbbell} size={20} color="#22C55E" />
              </View>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {workoutStats.completedExercises}/{workoutStats.totalExercises}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                {t('training.review.exercises' as any) || 'Exercises'}
              </Text>
            </Card>

            <Card style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#8B5CF620' }]}>
                <PlatformIcon
                  sf={workoutStats.totalSections > 0 ? 'square.grid.2x2' : 'checkmark.circle'}
                  IconComponent={workoutStats.totalSections > 0 ? LayoutGrid : CheckCircle2}
                  size={20}
                  color="#8B5CF6"
                />
              </View>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {workoutStats.totalSections > 0
                  ? `${workoutStats.completedSections}/${workoutStats.totalSections}`
                  : `${workoutStats.completedSets}/${workoutStats.totalSets}`}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                {workoutStats.totalSections > 0
                  ? t('training.review.sections')
                  : t('training.review.sets')}
              </Text>
            </Card>
          </View>
        </View>

        {/* Feedback Section - after summary */}
        {hasFeedback && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Feedback
            </Text>

            {/* Rating and Difficulty row */}
            {(sessionRating || sessionIntensity) && (
              <View style={styles.feedbackMetricsRow}>
                {/* Rating card - 80% */}
                {sessionRating && (
                  <Card style={styles.ratingCard}>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.starEmoji}>
                          {star <= sessionRating ? '⭐' : '☆'}
                        </Text>
                      ))}
                    </View>
                    <Text style={[styles.ratingCardLabel, { color: themeColors.mutedText }]}>
                      Rating
                    </Text>
                  </Card>
                )}
                {/* Difficulty card - 20% */}
                {sessionIntensity && (
                  <SquircleView
                    cornerSmoothing={1}
                    style={[
                      styles.difficultyCard,
                      {
                        backgroundColor: `${RATING_COLORS[sessionIntensity - 1]}20`,
                        borderColor: RATING_COLORS[sessionIntensity - 1],
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text style={styles.difficultyEmoji}>🔥</Text>
                    <Text
                      style={[styles.difficultyValue, { color: RATING_COLORS[sessionIntensity - 1] }]}
                    >
                      {['Easy', 'Light', 'Moderate', 'Hard', 'Brutal'][sessionIntensity - 1]}
                    </Text>
                    <Text style={[styles.difficultyLabel, { color: themeColors.mutedText }]}>
                      Difficulty
                    </Text>
                  </SquircleView>
                )}
              </View>
            )}

            {/* Comments */}
            {sessionComments && (
              <TextAreaInput
                label="Comments"
                value={sessionComments}
                onChangeText={() => {}}
                editable={false}
                numberOfLines={feedbackLineCount}
                minHeight={feedbackLineCount * 22}
              />
            )}
          </View>
        )}

        {/* Workout Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {t('training.review.workoutBreakdown' as any) || 'Workout Breakdown'}
          </Text>
          <View style={styles.breakdownList}>
            {breakdownItems.map((item, index) => {
              if (item.type === 'exercise') {
                const exerciseItems: ExercisePreviewItem[] = [
                  {
                    exerciseId: item.exercise.prescribedExerciseId,
                    isLinkedToNext: false,
                    sets: extractSetSummaries(item.exercise.sets || []),
                  },
                ];

                return (
                  <Card key={`exercise-${index}`} style={styles.exerciseCard}>
                    <View style={styles.exerciseCardContent}>
                      {renderExerciseList(exerciseItems, themeColors.primary, item.startLetterIndex, false, themeColors.primaryForeground)}
                      {item.completed && (
                        <View style={[styles.completedBadge, { backgroundColor: '#22C55E20' }]}>
                          <PlatformIcon
                            sf="checkmark.circle.fill"
                            IconComponent={CheckCircle2}
                            size={28}
                            color="#22C55E"
                          />
                        </View>
                      )}
                    </View>
                  </Card>
                );
              }

              if (item.type === 'superset') {
                const color = SECTION_COLORS.supersets;
                const iconConfig = SECTION_ICONS.supersets;
                const exerciseItems: ExercisePreviewItem[] = item.exercises.map((ex, idx) => ({
                  exerciseId: ex.prescribedExerciseId,
                  isLinkedToNext: idx < item.exercises.length - 1,
                  sets: extractSetSummaries(ex.sets || []),
                }));

                return (
                  <Card
                    key={`superset-${index}`}
                    style={[styles.breakdownCard, { borderColor: color, borderWidth: 2 }]}
                  >
                    <View style={styles.breakdownHeader}>
                      <View style={styles.breakdownHeaderLeft}>
                        <View style={[styles.breakdownIconCircle, { backgroundColor: `${color}20` }]}>
                          <PlatformIcon
                            sf={iconConfig.sf}
                            IconComponent={iconConfig.IconComponent}
                            size={24}
                            color={color}
                          />
                        </View>
                        <View style={styles.breakdownHeaderInfo}>
                          <Text style={[styles.breakdownTypeLabel, { color }]}>
                            {t('training.session.superset' as any) || 'Superset'}
                          </Text>
                        </View>
                      </View>
                      {item.completed && (
                        <View style={[styles.completedBadge, { backgroundColor: '#22C55E20' }]}>
                          <PlatformIcon
                            sf="checkmark.circle.fill"
                            IconComponent={CheckCircle2}
                            size={28}
                            color="#22C55E"
                          />
                        </View>
                      )}
                    </View>
                    <View style={[styles.dividerFullWidth, { backgroundColor: themeColors.border }]} />
                    {renderExerciseList(exerciseItems, color, item.startLetterIndex)}
                  </Card>
                );
              }

              if (item.type === 'section') {
                const color = SECTION_COLORS[item.sectionType] || SECTION_COLORS.regular;
                const iconConfig = SECTION_ICONS[item.sectionType] || SECTION_ICONS.regular;

                return (
                  <Card
                    key={`section-${index}`}
                    style={[styles.breakdownCard, { borderColor: color, borderWidth: 2 }]}
                  >
                    <View style={styles.breakdownHeader}>
                      <View style={styles.breakdownHeaderLeft}>
                        <View style={[styles.breakdownIconCircle, { backgroundColor: `${color}20` }]}>
                          <PlatformIcon
                            sf={iconConfig.sf}
                            IconComponent={iconConfig.IconComponent}
                            size={24}
                            color={color}
                          />
                        </View>
                        <View style={styles.breakdownHeaderInfo}>
                          <Text style={[styles.breakdownTypeLabel, { color }]}>
                            {getSectionTypeLabel(item.sectionType)}
                          </Text>
                          <Text style={[styles.breakdownName, { color: themeColors.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {item.details && (
                            <Text style={[styles.breakdownDetails, { color: themeColors.mutedText }]}>
                              {item.details}
                            </Text>
                          )}
                        </View>
                      </View>
                      {item.completed && (
                        <View style={[styles.completedBadge, { backgroundColor: '#22C55E20' }]}>
                          <PlatformIcon
                            sf="checkmark.circle.fill"
                            IconComponent={CheckCircle2}
                            size={28}
                            color="#22C55E"
                          />
                        </View>
                      )}
                    </View>
                    <View style={[styles.dividerFullWidth, { backgroundColor: themeColors.border }]} />
                    {renderExerciseList(
                      item.exerciseItems,
                      color,
                      item.startLetterIndex,
                      item.sectionType !== 'regular' && item.sectionType !== 'auxiliary'
                    )}
                  </Card>
                );
              }

              return null;
            })}
          </View>
        </View>

      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          Review {workoutData.name || t('training.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 1001,
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
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.p1,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    ...typography.h6,
    marginBottom: 12,
  },

  // Readiness
  readinessRow: {
    flexDirection: 'row',
    gap: 8,
  },
  readinessItem: {
    flex: 1,
  },
  readinessBox: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  readinessLabel: {
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  readinessFieldName: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    ...typography.h4,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },

  // Breakdown
  breakdownList: {
    gap: 12,
  },
  breakdownCard: {
    padding: 16,
    marginBottom: 0,
  },
  exerciseCard: {
    padding: 12,
    paddingLeft: 16,
    marginBottom: 0,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  breakdownHeaderInfo: {
    flex: 1,
  },
  breakdownIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownTypeLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  breakdownName: {
    ...typography.h6,
    fontWeight: '600',
    marginTop: 2,
  },
  breakdownDetails: {
    ...typography.caption,
    marginTop: 2,
  },
  completedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerFullWidth: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: -16,
  },

  // Exercise list
  exerciseList: {
    paddingLeft: 4,
    flex: 1,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseSetDetails: {
    ...typography.caption,
    fontWeight: '500',
  },
  connectorLine: {
    width: 2,
    height: 16,
    marginTop: -8,
    marginBottom: -8,
    marginLeft: 19, // Center under 32px circle + paddingLeft: (4 + 32/2) - (2/2) = 19
  },

  // Feedback
  feedbackMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 16,
  },
  ratingCard: {
    flex: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 0,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  ratingCardLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  starEmoji: {
    fontSize: 24,
  },
  difficultyCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  difficultyEmoji: {
    fontSize: 18,
  },
  difficultyValue: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  difficultyLabel: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
});
