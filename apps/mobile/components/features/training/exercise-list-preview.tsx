import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useExerciseLookup } from '@/hooks/useAllExercises';
import { typography } from '@/constants/typography';

export type ExercisePreviewItem = {
  type: 'exercise';
  exerciseId: string;
  isLinkedToNext: boolean; // true if this exercise is supersetted with the next one
} | {
  type: 'section-header';
  sectionName: string;
  sectionType: string;
};

// Legacy type for backwards compatibility
export type LegacyExercisePreviewItem = {
  exerciseId: string;
  isLinkedToNext: boolean;
};

type ExerciseListPreviewProps = {
  exercises: (ExercisePreviewItem | LegacyExercisePreviewItem)[];
  themeColors: {
    primary: string;
    primaryForeground: string;
    text: string;
    border: string;
    mutedText: string;
  };
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

// Type guard for section header
const isSectionHeader = (item: ExercisePreviewItem | LegacyExercisePreviewItem): item is { type: 'section-header'; sectionName: string; sectionType: string } => {
  return 'type' in item && item.type === 'section-header';
};

// Type guard for exercise item (handles both new and legacy formats)
const isExerciseItem = (item: ExercisePreviewItem | LegacyExercisePreviewItem): item is { type?: 'exercise'; exerciseId: string; isLinkedToNext: boolean } => {
  return 'exerciseId' in item;
};

export const ExerciseListPreview = ({
  exercises,
  themeColors
}: ExerciseListPreviewProps) => {
  const { findExerciseById } = useExerciseLookup();

  // Calculate labels: A1, A2 for supersets, A, B, C for standalone exercises
  // Only count exercise items, not section headers
  const labels = useMemo(() => {
    const result: (string | null)[] = [];
    let letterIndex = 0;
    let numberInGroup = 1;
    let prevWasExercise = false;
    let prevIsLinkedToNext = false;

    exercises.forEach((item) => {
      if (isSectionHeader(item)) {
        result.push(null); // Section headers don't get labels
        // Reset superset tracking when entering a new section
        prevWasExercise = false;
        prevIsLinkedToNext = false;
        return;
      }

      const isLinkedToPrev = prevWasExercise && prevIsLinkedToNext;
      const isLinkedToNext = item.isLinkedToNext;
      const isInSuperset = isLinkedToPrev || isLinkedToNext;

      if (isLinkedToPrev) {
        numberInGroup++;
      } else {
        if (prevWasExercise) {
          letterIndex++;
        }
        numberInGroup = 1;
      }

      const letter = getLetterLabel(letterIndex);
      result.push(isInSuperset ? `${letter}${numberInGroup}` : letter);

      prevWasExercise = true;
      prevIsLinkedToNext = isLinkedToNext;
    });

    return result;
  }, [exercises]);

  if (!exercises || exercises.length === 0) {
    return null;
  }

  // Track previous exercise for connector logic
  let prevWasExercise = false;
  let prevIsLinkedToNext = false;

  return (
    <View style={styles.exerciseList}>
      {exercises.map((item, index) => {
        if (isSectionHeader(item)) {
          prevWasExercise = false;
          prevIsLinkedToNext = false;

          return (
            <View key={`section-${index}`} style={styles.sectionHeader}>
              <Text style={[styles.sectionName, { color: themeColors.mutedText }]}>
                {item.sectionName || item.sectionType.toUpperCase()}
              </Text>
            </View>
          );
        }

        if (!isExerciseItem(item)) return null;

        const exercise = findExerciseById(item.exerciseId);
        const isLinkedToPrev = prevWasExercise && prevIsLinkedToNext;

        const element = (
          <React.Fragment key={`${item.exerciseId}-${index}`}>
            {/* Superset connector from previous exercise */}
            {isLinkedToPrev && (
              <View style={[styles.connectorLine, { backgroundColor: themeColors.primary }]} />
            )}

            {/* Exercise row */}
            <View style={styles.exerciseRow}>
              <View style={[styles.numberCircle, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.numberText, { color: themeColors.primaryForeground }]}>
                  {labels[index]}
                </Text>
              </View>
              <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={2}>
                {exercise?.name || `Exercise ${index + 1}`}
              </Text>
            </View>
          </React.Fragment>
        );

        prevWasExercise = true;
        prevIsLinkedToNext = item.isLinkedToNext;

        return element;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseList: {
    paddingLeft: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  connectorLine: {
    width: 2,
    height: 10,
    marginTop: -4,
    marginBottom: -4,
    marginLeft: 15, // Center under 32px circle: (32/2) - (2/2) = 15
  },
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionName: {
    ...typography.p3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
