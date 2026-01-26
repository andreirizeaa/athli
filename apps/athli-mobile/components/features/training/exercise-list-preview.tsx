import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ExerciseListPreviewProps = {
  totalExercises: number;
  supersetFlags?: boolean[];
  themeColors: {
    primary: string;
    primaryForeground: string;
    text: string;
    border: string;
  };
};

export const ExerciseListPreview = ({
  totalExercises,
  supersetFlags = [],
  themeColors
}: ExerciseListPreviewProps) => {
  if (!totalExercises || totalExercises === 0) {
    return null;
  }

  // Generate array of exercise numbers
  const exercises = Array.from({ length: totalExercises }, (_, i) => i + 1);

  return (
    <View style={styles.exerciseList}>
      {exercises.map((num, index) => {
        const isLinkedToNext = supersetFlags[index] === true;
        const isLinkedToPrev = index > 0 && supersetFlags[index - 1] === true;

        return (
          <React.Fragment key={num}>
            {/* Superset connector from previous exercise */}
            {isLinkedToPrev && (
              <View style={[styles.connectorLine, { backgroundColor: themeColors.primary }]} />
            )}

            {/* Exercise row */}
            <View style={styles.exerciseRow}>
              <View style={[styles.numberCircle, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.numberText, { color: themeColors.primaryForeground }]}>
                  {num}
                </Text>
              </View>
              <Text
                style={[styles.exerciseName, { color: themeColors.text }]}
                numberOfLines={1}
              >
                Exercise {num}
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
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
  },
  connectorLine: {
    width: 2,
    height: 16,
    marginTop: -4,
    marginBottom: -4,
    marginLeft: 17, // Half of circle (18) - half of line (1) = 17 to center under 36px circle
  },
});
