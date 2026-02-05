import React, { useMemo, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from 'react-native';
import { X, Dumbbell, Timer, Link } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';
import { Image } from 'expo-image';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { useExerciseLookup } from '@/hooks/useAllExercises';
import { useSingleThumbnail } from '@/hooks/useExerciseThumbnails';
import { SECTION_TYPES } from '@athli/shared-types';

const HEADER_HEIGHT = 52;

// Colors for set types
const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const RED_ERROR = '#EF4444';
const PRIMARY = '#3B82F6';

// Get set type display letter
const getSetTypeLabel = (type: string): string => {
  switch (type) {
    case 'warmUp':
    case 'W':
      return 'W';
    case 'failure':
    case 'F':
      return 'F';
    case 'dropset':
    case 'D':
      return 'D';
    case 'normal':
    case 'R':
    default:
      return 'R';
  }
};

// Get set type translation key
const getSetTypeKey = (type: string): string => {
  switch (type) {
    case 'warmUp':
    case 'W':
      return 'warmUp';
    case 'failure':
    case 'F':
      return 'failure';
    case 'dropset':
    case 'D':
      return 'dropset';
    case 'normal':
    case 'R':
    default:
      return 'regular';
  }
};

// Get set type color
const getSetTypeColor = (type: string): string => {
  const label = getSetTypeLabel(type);
  switch (label) {
    case 'W':
      return AMBER;
    case 'F':
      return RED_ERROR;
    case 'D':
      return PRIMARY;
    default:
      return GREEN;
  }
};

// Exercise thumbnail component with caching
const ExerciseThumbnail = ({
  exerciseId,
  exerciseName,
  themeColors,
  router,
}: {
  exerciseId: string;
  exerciseName: string;
  themeColors: any;
  router: any;
}) => {
  const { findExerciseById } = useExerciseLookup();
  const exercise = findExerciseById(exerciseId);
  const rawThumbnailUrl = exercise?.rawThumbnailUrl;
  const { thumbnailUrl, isLoading } = useSingleThumbnail(rawThumbnailUrl);

  const isCustomExercise = exercise?.source === 'custom';

  const handlePress = () => {
    router.push({
      pathname: '/modals/workout/exercise-details-modal',
      params: {
        name: exerciseName,
        exerciseId: exerciseId,
        musclewikiId: isCustomExercise ? '' : exerciseId,
        isCustom: isCustomExercise ? 'true' : 'false',
      },
    });
  };

  return (
    <PressableScale onPress={handlePress}>
      {isLoading ? (
        <View
          style={[
            styles.thumbnail,
            { backgroundColor: themeColors.surfacePrimary, alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} contentFit="cover" transition={200} />
      ) : (
        <View
          style={[
            styles.thumbnail,
            { backgroundColor: themeColors.surfacePrimary, alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Dumbbell {...({ size: 24, color: themeColors.mutedText } as any)} />
        </View>
      )}
    </PressableScale>
  );
};

// Superset link divider component (outline style matching input boxes)
const SupersetLinkDivider = ({ themeColors }: { themeColors: any }) => (
  <View style={styles.supersetLinkDivider}>
    <View style={[styles.supersetLinkLine, { backgroundColor: themeColors.border }]} />
    <View style={[styles.supersetLinkIconOutline, { borderColor: themeColors.border }]}>
      <Link {...({ size: 14, color: themeColors.primary } as any)} />
    </View>
    <View style={[styles.supersetLinkLine, { backgroundColor: themeColors.border }]} />
  </View>
);

// Exercise preview card component
const ExercisePreviewCard = ({
  exerciseData,
  isLinkedToPrev,
  isLinkedToNext,
  themeColors,
  t,
  onSetTypePress,
  router,
}: {
  exerciseData: any;
  isLinkedToPrev?: boolean;
  isLinkedToNext?: boolean;
  themeColors: any;
  t: (key: string) => string;
  onSetTypePress: (type: string) => void;
  router: any;
}) => {
  const { findExerciseById } = useExerciseLookup();
  const exerciseId = exerciseData.performedExerciseId || exerciseData.prescribedExerciseId;
  const exerciseInfo = findExerciseById(exerciseId);
  const exerciseName = exerciseInfo?.name || exerciseData.name || 'Unknown Exercise';

  const sets = exerciseData.sets || [];
  const column1Label = sets[0]?.trackableField1?.label || 'Reps';
  const column2Label = sets[0]?.trackableField2?.label || 'Weight';

  // Determine which columns to show (hide if None or Optional)
  const showColumn1 = !!(column1Label && column1Label !== 'None' && column1Label !== 'Optional');
  const showColumn2 = !!(column2Label && column2Label !== 'None' && column2Label !== 'Optional');
  const showBothColumns = showColumn1 && showColumn2;
  const showNoColumns = !showColumn1 && !showColumn2;

  const formatRestTime = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}min ${secs > 0 ? secs + 's' : ''}`;
    return `${secs}s`;
  };

  const restTimeDisplay = formatRestTime(exerciseData.setRestSec || sets[0]?.restSec);

  return (
    <Card
      style={[
        styles.exerciseCard,
        {
          borderTopLeftRadius: isLinkedToPrev ? 0 : 20,
          borderTopRightRadius: isLinkedToPrev ? 0 : 20,
          borderBottomLeftRadius: isLinkedToNext ? 0 : 20,
          borderBottomRightRadius: isLinkedToNext ? 0 : 20,
          marginBottom: isLinkedToNext ? 0 : 16,
        },
      ]}
    >
      {/* Top Section: Thumbnail and Name */}
      <View style={styles.topSection}>
        <View style={[styles.thumbnailContainer, isLinkedToPrev && { borderTopRightRadius: 20 }]}>
          <ExerciseThumbnail
            exerciseId={exerciseId}
            exerciseName={exerciseName}
            themeColors={themeColors}
            router={router}
          />
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.exerciseNameText, { color: themeColors.text }]}>{exerciseName}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

      {/* Each Side & Tempo */}
      {(exerciseData.eachSide || (exerciseData.tempo && exerciseData.tempo.trim())) && (
        <View style={styles.secondaryControls}>
          {exerciseData.eachSide && (
            <View style={styles.secondaryControlItem}>
              <Text style={[styles.secondaryControlLabel, { color: themeColors.mutedText }]}>Each side</Text>
              <Text style={[styles.secondaryControlValue, { color: themeColors.text }]}>Yes</Text>
            </View>
          )}
          {exerciseData.tempo && exerciseData.tempo.trim() && (
            <View style={styles.secondaryControlItem}>
              <Text style={[styles.secondaryControlLabel, { color: themeColors.mutedText }]}>Tempo</Text>
              <Text style={[styles.secondaryControlValue, { color: themeColors.text }]}>{exerciseData.tempo}</Text>
            </View>
          )}
        </View>
      )}

      {/* Sets Section */}
      <View style={styles.setsSection}>
        {/* Column Headers */}
        <View style={styles.setsHeader}>
          <Text style={[styles.setsLabel, { color: themeColors.text }]}>Sets</Text>
          {!showNoColumns && (
            <View style={styles.headerButtons}>
              {showColumn1 && (
                <View style={[styles.columnHeader, !showBothColumns && styles.columnHeaderFull]}>
                  <View style={[styles.headerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
                    <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>{column1Label}</Text>
                  </View>
                </View>
              )}
              {showColumn2 && (
                <View style={[styles.columnHeader, !showBothColumns && styles.columnHeaderFull]}>
                  <View style={[styles.headerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
                    <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>{column2Label}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
          {showNoColumns && <View style={styles.spacer} />}
        </View>

        {/* Set Rows */}
        {sets.map((set: any, index: number) => {
          const setType = set.type || 'R';
          const typeColor = getSetTypeColor(setType);
          const column1Value = set.trackableField1?.prescribed ?? set.column1 ?? '-';
          const column2Value = set.trackableField2?.prescribed ?? set.column2 ?? '-';

          return (
            <View key={set.id || index} style={styles.setRow}>
              <View style={styles.setNumberContainer}>
                <PressableScale onPress={() => onSetTypePress(setType)}>
                  <View style={[styles.setTypeBadge, { borderColor: typeColor }]}>
                    <Text style={[styles.setTypeText, { color: typeColor }]}>{getSetTypeLabel(setType)}</Text>
                  </View>
                </PressableScale>
              </View>

              {!showNoColumns && (
                <View style={styles.inputsRow}>
                  {showColumn1 && (
                    <View
                      style={[
                        styles.setValueContainer,
                        !showBothColumns && styles.setValueContainerFull,
                        { backgroundColor: themeColors.surfacePrimary, borderColor: themeColors.border },
                      ]}
                    >
                      <Text style={[styles.setValueText, { color: themeColors.text }]}>{column1Value}</Text>
                    </View>
                  )}

                  {showColumn2 && (
                    <View
                      style={[
                        styles.setValueContainer,
                        !showBothColumns && styles.setValueContainerFull,
                        { backgroundColor: themeColors.surfacePrimary, borderColor: themeColors.border },
                      ]}
                    >
                      <Text style={[styles.setValueText, { color: themeColors.text }]}>{column2Value}</Text>
                    </View>
                  )}
                </View>
              )}

              {showNoColumns && <View style={styles.spacer} />}
            </View>
          );
        })}

        {/* Rest Timer - aligned to the right */}
        {restTimeDisplay && (
          <View style={styles.restTimerRow}>
            <View style={[styles.restTimerDisplay, { backgroundColor: themeColors.backgroundTertiary }]}>
              <Timer {...({ size: 16, color: themeColors.primary } as any)} />
              <Text style={[styles.restTimerText, { color: themeColors.primary }]}>Rest: {restTimeDisplay}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {exerciseData.notes && exerciseData.notes.trim() && (
          <View style={styles.notesContainer}>
            <View style={[styles.notesBox, { borderColor: themeColors.border }]}>
              <Text style={[styles.notesText, { color: themeColors.mutedText }]}>{exerciseData.notes}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Superset link divider when linked to next */}
      {isLinkedToNext && <SupersetLinkDivider themeColors={themeColors} />}
    </Card>
  );
};

// Section preview card component
const SectionPreviewCard = ({
  sectionData,
  themeColors,
  t,
  onSetTypePress,
}: {
  sectionData: any;
  themeColors: any;
  t: (key: string) => string;
  onSetTypePress: (type: string) => void;
}) => {
  const { findExerciseById } = useExerciseLookup();
  const typeLabel = SECTION_TYPES.find((st) => st.value === sectionData.type)?.label || sectionData.type;

  const formatSectionDetails = (): string | null => {
    const parts: string[] = [];
    if (sectionData.type === 'amrap' && sectionData.durationSec) {
      parts.push(`${Math.floor(sectionData.durationSec / 60)} min`);
    }
    if (['circuits', 'tabata', 'hiit', 'emom'].includes(sectionData.type) && sectionData.rounds) {
      parts.push(`${sectionData.rounds} rounds`);
    }
    if (['tabata', 'hiit'].includes(sectionData.type) && sectionData.workSec && sectionData.restSec) {
      parts.push(`${sectionData.workSec}s work / ${sectionData.restSec}s rest`);
    }
    if (sectionData.type === 'emom' && sectionData.intervalSec) {
      parts.push(`${sectionData.intervalSec}s intervals`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const sectionDetails = formatSectionDetails();

  // Get all exercises from the section
  const getAllExercises = () => {
    if (sectionData.type === 'amrap') {
      return sectionData.exercises || [];
    }
    if (['regular', 'auxiliary'].includes(sectionData.type)) {
      const exercises: any[] = [];
      (sectionData.exercises || []).forEach((group: any) => {
        if (group.exercises) {
          group.exercises.forEach((ex: any) => exercises.push(ex));
        }
      });
      return exercises;
    }
    if (['circuits', 'tabata', 'hiit', 'emom'].includes(sectionData.type)) {
      const exercises: any[] = [];
      (sectionData.exercises || []).forEach((group: any) => {
        if (group.exercises) {
          group.exercises.forEach((ex: any) => exercises.push(ex));
        }
      });
      return exercises;
    }
    return [];
  };

  const exercises = getAllExercises();

  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{sectionData.name}</Text>
            <Text style={[styles.sectionTypeLabel, { color: themeColors.mutedText }]}>{typeLabel}</Text>
            {sectionDetails && (
              <Text style={[styles.sectionDetails, { color: themeColors.mutedText }]}>{sectionDetails}</Text>
            )}
          </View>
        </View>

        {exercises.length > 0 && (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.sectionExerciseList}>
              {exercises.map((ex: any, idx: number) => {
                const exerciseId = ex.performedExerciseId || ex.prescribedExerciseId;
                const exerciseInfo = findExerciseById(exerciseId);
                const exerciseName = exerciseInfo?.name || ex.name || 'Unknown Exercise';

                // Check for superset
                const isLinkedToNext =
                  idx < exercises.length - 1 && ex.supersetId && exercises[idx + 1]?.supersetId === ex.supersetId;
                const isLinkedToPrev = idx > 0 && ex.supersetId && exercises[idx - 1]?.supersetId === ex.supersetId;

                return (
                  <React.Fragment key={ex.id || idx}>
                    {isLinkedToPrev && (
                      <View style={[styles.connectorLine, { backgroundColor: themeColors.primary }]} />
                    )}
                    <View style={styles.sectionExerciseRow}>
                      <View style={[styles.numberCircle, { backgroundColor: themeColors.primary }]}>
                        <Text style={[styles.numberText, { color: themeColors.primaryForeground }]}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.sectionExerciseName, { color: themeColors.text }]} numberOfLines={1}>
                        {exerciseName}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        {sectionData.notes && sectionData.notes.trim() && (
          <View style={styles.sectionNotesContainer}>
            <View style={[styles.notesBox, { borderColor: themeColors.border }]}>
              <Text style={[styles.notesText, { color: themeColors.mutedText }]}>{sectionData.notes}</Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
};

export default function WorkoutPreviewModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { isLoading: isExerciseDataLoading } = useExerciseLookup();

  const [setTypeDialog, setSetTypeDialog] = useState<{ visible: boolean; type: string }>({
    visible: false,
    type: 'normal',
  });

  const params = useLocalSearchParams<{
    workoutId: string;
    date: string;
    clientId: string;
    coachId: string;
    workoutName: string;
    workoutPayload: string;
  }>();

  // Parse workout data
  const workoutData = useMemo(() => {
    if (!params.workoutPayload) return null;
    try {
      const parsed = JSON.parse(params.workoutPayload);
      // Handle nested workout_data structure
      return parsed.workout_data || parsed;
    } catch {
      return null;
    }
  }, [params.workoutPayload]);

  const handleClose = () => {
    router.back();
  };

  const handleSetTypePress = (type: string) => {
    setSetTypeDialog({ visible: true, type });
  };

  const setTypeKey = getSetTypeKey(setTypeDialog.type);

  // Process items into renderable components
  const processedItems = useMemo(() => {
    if (!workoutData?.items) return [];

    const result: Array<{
      type: 'exercise' | 'superset' | 'section';
      data: any;
      exercises?: any[];
    }> = [];

    const processedSupersetIds = new Set<string>();

    workoutData.items.forEach((item: any) => {
      if (item.itemType === 'exercise') {
        const supersetId = item.data.supersetId;

        if (supersetId) {
          if (processedSupersetIds.has(supersetId)) return;
          processedSupersetIds.add(supersetId);

          // Find all exercises in this superset
          const supersetExercises = workoutData.items
            .filter((i: any) => i.itemType === 'exercise' && i.data.supersetId === supersetId)
            .map((i: any) => i.data);

          result.push({
            type: 'superset',
            data: supersetExercises[0],
            exercises: supersetExercises,
          });
        } else {
          result.push({
            type: 'exercise',
            data: item.data,
          });
        }
      } else if (item.itemType === 'section') {
        result.push({
          type: 'section',
          data: item.data,
        });
      }
    });

    return result;
  }, [workoutData]);

  const workoutName = params.workoutName || workoutData?.name || t('training.title');

  if (isExerciseDataLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton icon={{ sf: 'xmark', IconComponent: X }} onPress={handleClose} size="md" color={themeColors.text} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Preview</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  }

  if (!workoutData) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
              {t('general.noData' as any) || 'No data available'}
            </Text>
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton icon={{ sf: 'xmark', IconComponent: X }} onPress={handleClose} size="md" color={themeColors.text} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Preview</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Workout Items */}
        <View style={styles.itemsContainer}>
          {processedItems.map((item, index) => {
            if (item.type === 'exercise') {
              return (
                <ExercisePreviewCard
                  key={`exercise-${item.data.id || index}`}
                  exerciseData={item.data}
                  themeColors={themeColors}
                  t={t}
                  onSetTypePress={handleSetTypePress}
                  router={router}
                />
              );
            }

            if (item.type === 'superset' && item.exercises) {
              return (
                <View key={`superset-${index}`} style={styles.supersetContainer}>
                  {item.exercises.map((exercise: any, exIdx: number) => (
                    <ExercisePreviewCard
                      key={`superset-exercise-${exercise.id || exIdx}`}
                      exerciseData={exercise}
                      isLinkedToPrev={exIdx > 0}
                      isLinkedToNext={exIdx < item.exercises!.length - 1}
                      themeColors={themeColors}
                      t={t}
                      onSetTypePress={handleSetTypePress}
                      router={router}
                    />
                  ))}
                </View>
              );
            }

            if (item.type === 'section') {
              return (
                <SectionPreviewCard
                  key={`section-${item.data.id || index}`}
                  sectionData={item.data}
                  themeColors={themeColors}
                  t={t}
                  onSetTypePress={handleSetTypePress}
                />
              );
            }

            return null;
          })}
        </View>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton icon={{ sf: 'xmark', IconComponent: X }} onPress={handleClose} size="md" color={themeColors.text} />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {workoutName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Set Type Info Dialog */}
      <Dialog
        visible={setTypeDialog.visible}
        onClose={() => setSetTypeDialog({ ...setTypeDialog, visible: false })}
        title={t(`training.session.setTypes.${setTypeKey}.title` as any)}
        message={t(`training.session.setTypes.${setTypeKey}.description` as any)}
        buttons={[
          {
            label: t('general.close'),
            onPress: () => setSetTypeDialog({ ...setTypeDialog, visible: false }),
            variant: 'primary',
          },
        ]}
        showCloseIcon={false}
      />
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
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.p1,
  },
  // Superset container
  supersetContainer: {
    marginBottom: 16,
  },
  // Superset link divider styles (inside card, between exercises)
  supersetLinkDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  supersetLinkLine: {
    flex: 1,
    height: 1,
  },
  supersetLinkIconOutline: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  // Exercise card styles
  exerciseCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 64,
    height: 64,
    backgroundColor: '#f0f0f0',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 16,
  },
  exerciseNameText: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 4,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  secondaryControlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryControlLabel: {
    ...typography.p3,
    fontWeight: '600',
  },
  secondaryControlValue: {
    ...typography.p3,
    fontWeight: '700',
  },
  setsSection: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  setsLabel: {
    ...typography.p1,
    fontWeight: '600',
    width: 44,
    textAlign: 'center',
  },
  headerButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  columnHeader: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeaderFull: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    ...typography.p1,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  setNumberContainer: {
    width: 32,
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 8,
  },
  setTypeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeText: {
    ...typography.p3,
    fontWeight: '800',
  },
  inputsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  setValueContainer: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setValueContainerFull: {
    flex: 1,
  },
  setValueText: {
    ...typography.p1,
    textAlign: 'center',
  },
  restTimerRow: {
    marginTop: 8,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  restTimerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restTimerText: {
    ...typography.p3,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 12,
  },
  notesBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesText: {
    ...typography.p3,
    fontWeight: '400',
  },
  // Section card styles
  sectionCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.p1,
    fontWeight: '700',
    fontSize: 18,
  },
  sectionTypeLabel: {
    ...typography.p2,
    marginTop: 2,
  },
  sectionDetails: {
    ...typography.p3,
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    marginHorizontal: -16,
    marginTop: 12,
  },
  sectionExerciseList: {
    marginTop: 12,
    gap: 8,
    paddingLeft: 4,
  },
  sectionExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionExerciseName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  connectorLine: {
    width: 2,
    height: 16,
    marginTop: -8,
    marginBottom: -8,
    marginLeft: 21,
  },
  sectionNotesContainer: {
    marginTop: 12,
  },
});
