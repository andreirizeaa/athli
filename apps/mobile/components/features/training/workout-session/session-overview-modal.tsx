import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Modal, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemePreference, useTranslations } from '@/stores';
import { useExerciseLookup } from '@/hooks/useAllExercises';
import { IconButton } from '@/components/ui/icon-button';
import { typography } from '@/constants/typography';
import { hexToRgba } from '@/utils/colorUtils';
import { WorkoutItem, CompletionStatus } from '@athli/shared-types';

type ExerciseOverviewItem = {
  type: 'exercise';
  exerciseId: string;
  isLinkedToNext: boolean;
  isLinkedToPrev: boolean;
  status: 'completed' | 'in_progress' | 'not_started';
  label: string;
} | {
  type: 'section-header';
  sectionName: string;
  sectionType: string;
};

type SessionOverviewModalProps = {
  visible: boolean;
  onClose: () => void;
  items: WorkoutItem[];
  currentItemIndex: number;
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

// Map CompletionStatus to our simplified status
const mapCompletionStatus = (status: CompletionStatus | undefined): 'completed' | 'in_progress' | 'not_started' => {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
};

// Extract exercise items with their completion status
const extractExerciseOverviewItems = (
  items: WorkoutItem[]
): ExerciseOverviewItem[] => {
  if (!items) return [];

  const result: ExerciseOverviewItem[] = [];

  // Helper to add exercises with proper labeling and linking
  const addExercises = (
    exercises: { exerciseId: string; supersetId: string | null; status: CompletionStatus | undefined }[],
    labelOffset: number
  ): number => {
    let letterIndex = labelOffset;
    let numberInGroup = 1;
    let prevIsLinkedToNext = false;

    exercises.forEach((ex, index) => {
      const nextEx = index < exercises.length - 1 ? exercises[index + 1] : null;
      const isLinkedToPrev = index > 0 && prevIsLinkedToNext;
      const isLinkedToNext = nextEx !== null && ex.supersetId !== null && ex.supersetId === nextEx.supersetId;
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
      const label = isInSuperset ? `${letter}${numberInGroup}` : letter;

      result.push({
        type: 'exercise',
        exerciseId: ex.exerciseId,
        isLinkedToNext,
        isLinkedToPrev,
        status: mapCompletionStatus(ex.status),
        label,
      });

      prevIsLinkedToNext = isLinkedToNext;
    });

    return letterIndex + 1; // Return next available letter index
  };

  let globalLetterIndex = 0;

  items.forEach((item) => {
    if (item.itemType === 'exercise') {
      const status = item.data.completed || 'not_started';
      result.push({
        type: 'exercise',
        exerciseId: item.data.prescribedExerciseId,
        isLinkedToNext: false,
        isLinkedToPrev: false,
        status: mapCompletionStatus(status),
        label: getLetterLabel(globalLetterIndex),
      });
      globalLetterIndex++;
    } else if (item.itemType === 'section') {
      const section = item.data;

      // Add section header
      result.push({
        type: 'section-header',
        sectionName: section.name || '',
        sectionType: section.type,
      });

      // Collect section exercises
      const sectionExercises: { exerciseId: string; supersetId: string | null; status: CompletionStatus | undefined }[] = [];

      if (section.type === 'regular' || section.type === 'auxiliary') {
        section.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            sectionExercises.push({
              exerciseId: ex.prescribedExerciseId,
              supersetId: group.isSuperset && group.exercises.length > 1
                ? (ex.supersetId || `group-${group.exercises[0].prescribedExerciseId}`)
                : null,
              status: ex.completed,
            });
          });
        });
      } else if (section.type === 'tabata' || section.type === 'hiit' || section.type === 'emom' || section.type === 'circuits') {
        section.exercises.forEach((group) => {
          group.exercises.forEach((ex) => {
            sectionExercises.push({
              exerciseId: ex.prescribedExerciseId,
              supersetId: group.isSuperset && group.exercises.length > 1
                ? (ex.supersetId || `group-${group.exercises[0].prescribedExerciseId}`)
                : null,
              status: ex.completed,
            });
          });
        });
      } else if (section.type === 'amrap') {
        section.exercises.forEach((ex) => {
          sectionExercises.push({
            exerciseId: ex.prescribedExerciseId,
            supersetId: null,
            status: ex.completed,
          });
        });
      }

      // Add section exercises
      globalLetterIndex = addExercises(sectionExercises, globalLetterIndex);
    }
  });

  return result;
};

export const SessionOverviewModal = ({
  visible,
  onClose,
  items,
}: SessionOverviewModalProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { findExerciseById } = useExerciseLookup();

  const exercises = useMemo(() => {
    return extractExerciseOverviewItems(items);
  }, [items]);

  // Get status color
  const getStatusColor = useCallback((status: 'completed' | 'in_progress' | 'not_started'): string => {
    switch (status) {
      case 'completed':
        return '#22C55E'; // Green
      case 'in_progress':
        return '#F59E0B'; // Yellow/Amber
      case 'not_started':
      default:
        return themeColors.text; // Black/dark text color
    }
  }, [themeColors.text]);

  const renderItem = useCallback(({ item, index }: { item: ExerciseOverviewItem; index: number }) => {
    if (item.type === 'section-header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionName, { color: themeColors.mutedText }]}>
            {item.sectionName || item.sectionType.toUpperCase()}
          </Text>
        </View>
      );
    }

    const exercise = findExerciseById(item.exerciseId);
    const statusColor = getStatusColor(item.status);

    return (
      <View>
        {/* Superset connector from previous exercise */}
        {item.isLinkedToPrev && (
          <View style={[styles.connectorLine, { backgroundColor: statusColor }]} />
        )}

        {/* Exercise row */}
        <View style={styles.exerciseRow}>
          <View style={[styles.numberCircle, { backgroundColor: statusColor }]}>
            <Text style={styles.numberText}>
              {item.label}
            </Text>
          </View>
          <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={2}>
            {exercise?.name || `Exercise ${index + 1}`}
          </Text>
        </View>
      </View>
    );
  }, [findExerciseById, getStatusColor, themeColors.text, themeColors.mutedText]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
        {/* Exercise List */}
        <View style={styles.listContainer}>
          <FlashList
            data={exercises}
            renderItem={renderItem}
            ListHeaderComponent={
              <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]} />
            }
            keyExtractor={(item, index) => {
              if (item.type === 'section-header') {
                return `section-${index}`;
              }
              return `${item.exerciseId}-${index}`;
            }}
            contentContainerStyle={styles.listContent}
          />
        </View>

        {/* Fixed Header with gradient effect */}
        <View style={[styles.fixedHeader, { height: headerHeight }]}>
          <LinearGradient
            colors={[
              hexToRgba(themeColors.backgroundSecondary, 1),
              hexToRgba(themeColors.backgroundSecondary, 0.85),
              hexToRgba(themeColors.backgroundSecondary, 0.5),
              hexToRgba(themeColors.backgroundSecondary, 0),
            ]}
            locations={[0, 0.5, 0.8, 1]}
            style={[styles.headerGradient, { height: gradientHeight }]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
              },
            ]}
          >
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={onClose}
              size="md"
              color={themeColors.text}
            />
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {t('training.session.title' as any)}
            </Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  modalTitle: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  listHeader: {
    paddingBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  numberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  connectorLine: {
    width: 2,
    height: 12,
    marginTop: -8,
    marginBottom: -8,
    marginLeft: 17, // Center under 36px circle: (36/2) - (2/2) = 17
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionName: {
    ...typography.p3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
