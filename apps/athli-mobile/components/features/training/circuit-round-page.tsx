import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Repeat } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ExerciseSessionCard } from './exercise-session-card';
import type { CircuitExercisePayload, RegularExercisePayload } from '@athli/shared-types';

type ExerciseData = {
  exerciseId: string;
  name: string;
  thumbnailUrl?: string;
};

type CircuitRoundPageProps = {
  sectionName: string;
  sectionType: 'circuits' | 'tabata' | 'hiit' | 'emom';
  currentRound: number;
  totalRounds: number;
  exercises: CircuitExercisePayload[];
  exerciseDataMap: Map<string, ExerciseData>;
  onExerciseComplete: (exerciseIndex: number, completed: boolean) => void;
  onExerciseValueChange: (
    exerciseIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => void;
  onRoundComplete: () => void;
};

// Map section type to color
const SECTION_COLORS: Record<string, string> = {
  circuits: '#EC4899',
  tabata: '#F43F5E', // Rose/pink-red (distinct from timer red)
  hiit: '#8B5CF6',
  emom: '#10B981',
};

export const CircuitRoundPage = ({
  sectionName,
  sectionType,
  currentRound,
  totalRounds,
  exercises,
  exerciseDataMap,
  onExerciseComplete,
  onExerciseValueChange,
  onRoundComplete,
}: CircuitRoundPageProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const lottieRef = useRef<LottieView>(null);

  // Show confetti when round is completed
  const [showConfetti, setShowConfetti] = useState(false);

  const sectionColor = SECTION_COLORS[sectionType] || SECTION_COLORS.circuits;

  // Handle exercise completion toggle
  const handleExerciseComplete = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    // For circuit exercises, there's only one set (setIndex 0)
    onExerciseComplete(exerciseIndex, completed);

    // Check if this was the last exercise to be completed
    if (completed) {
      const willAllBeCompleted = exercises.every((ex, idx) =>
        idx === exerciseIndex ? true : ex.set.completed
      );
      if (willAllBeCompleted) {
        // Show confetti celebration, then advance to next round
        setShowConfetti(true);
        lottieRef.current?.play();

        // Wait for confetti animation before advancing
        setTimeout(() => {
          onRoundComplete();
        }, 1500);
      }
    }
  };

  // Handle exercise value change
  const handleExerciseValueChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'trackableField1' | 'trackableField2',
    value: string
  ) => {
    // For circuit exercises, there's only one set (setIndex 0)
    onExerciseValueChange(exerciseIndex, field, value);
  };

  // Handle confetti animation finish
  const handleConfettiFinish = () => {
    setShowConfetti(false);
  };

  return (
    <View style={styles.container}>
      {/* Confetti animation overlay */}
      {showConfetti && (
        <LottieView
          ref={lottieRef}
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          onAnimationFinish={handleConfettiFinish}
          style={styles.confettiAnimation}
        />
      )}

      {/* Round Indicator Card */}
      <View style={styles.roundCardContainer}>
        <Card style={[styles.roundCard, { borderColor: sectionColor, borderWidth: 2 }]}>
          <View style={styles.roundCardContent}>
            <View style={[styles.roundIconCircle, { backgroundColor: `${sectionColor}20` }]}>
              <PlatformIcon
                sf="repeat"
                IconComponent={Repeat}
                size={24}
                color={sectionColor}
              />
            </View>
            <View style={styles.roundTextContainer}>
              <Text style={[styles.roundLabel, { color: themeColors.mutedText }]}>
                {sectionName}
              </Text>
              <Text style={[styles.roundNumber, { color: themeColors.text }]}>
                {t('training.session.circuit.roundOf' as any, {
                  current: currentRound,
                  total: totalRounds,
                }) || `Round ${currentRound} of ${totalRounds}`}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Exercise Cards */}
      <View style={styles.exerciseList}>
        {exercises.map((exercise, index) => {
          const exerciseData = exerciseDataMap.get(exercise.prescribedExerciseId);
          // Convert CircuitExercisePayload to RegularExercisePayload format for ExerciseSessionCard
          const exerciseWithSets: RegularExercisePayload = {
            ...exercise,
            sets: [exercise.set],
          };

          return (
            <ExerciseSessionCard
              key={exercise.id}
              exercise={exerciseWithSets}
              exerciseName={exerciseData?.name || 'Exercise'}
              exerciseImageUrl={exerciseData?.thumbnailUrl}
              alternatives={[]}
              onSetComplete={(setIndex, completed) => handleExerciseComplete(index, setIndex, completed)}
              onSetValueChange={(setIndex, field, value) => handleExerciseValueChange(index, setIndex, field, value)}
              onAlternativeSelect={() => {}}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  confettiAnimation: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 10,
    pointerEvents: 'none',
  },
  roundCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  roundCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  roundCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roundIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundTextContainer: {
    flex: 1,
  },
  roundLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  roundNumber: {
    ...typography.h3,
    fontWeight: '700',
  },
  exerciseList: {
    gap: 16,
  },
});
