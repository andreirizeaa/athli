import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useExerciseLookup } from '@/hooks/useAllExercises';

export type ExercisePreviewItem = {
  exerciseId: string;
  isLinkedToNext: boolean; // true if this exercise is supersetted with the next one
};

type ExerciseListPreviewProps = {
  exercises: ExercisePreviewItem[];
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

export const ExerciseListPreview = ({
  exercises,
  themeColors
}: ExerciseListPreviewProps) => {
  const { findExerciseById } = useExerciseLookup();

  // Calculate labels: A1, A2 for supersets, A, B, C for standalone exercises
  const labels = useMemo(() => {
    const result: string[] = [];
    let letterIndex = 0;
    let numberInGroup = 1;

    exercises.forEach((item, index) => {
      const isLinkedToPrev = index > 0 && exercises[index - 1].isLinkedToNext;
      const isLinkedToNext = item.isLinkedToNext;
      const isInSuperset = isLinkedToPrev || isLinkedToNext;

      if (isLinkedToPrev) {
        // Continue the current superset group
        numberInGroup++;
      } else {
        // Start a new group (either standalone or new superset)
        if (index > 0) {
          letterIndex++;
        }
        numberInGroup = 1;
      }

      const letter = getLetterLabel(letterIndex);
      // Only show number if part of a superset
      result.push(isInSuperset ? `${letter}${numberInGroup}` : letter);
    });

    return result;
  }, [exercises]);

  if (!exercises || exercises.length === 0) {
    return null;
  }

  return (
    <View style={styles.exerciseList}>
      {exercises.map((item, index) => {
        const exercise = findExerciseById(item.exerciseId);
        const isLinkedToPrev = index > 0 && exercises[index - 1].isLinkedToNext;

        return (
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
              <Text
                style={[styles.exerciseName, { color: themeColors.text }]}
                numberOfLines={1}
              >
                {exercise?.name || `Exercise ${index + 1}`}
              </Text>
            </View>
          </React.Fragment>
        );
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 19,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
  },
  connectorLine: {
    width: 2,
    height: 12,
    marginTop: -4,
    marginBottom: -4,
    marginLeft: 17, // Center under 36px circle: (36/2) - (2/2) = 17
  },
});
