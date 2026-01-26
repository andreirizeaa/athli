import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { assignWorkout } from '@/services/client/client-training-service';
import { ReadinessPage } from '@/components/features/training/readiness-page';
import {
  WorkoutSessionHeader,
  WorkoutSessionBottomNav,
  WorkoutSessionPageTitle,
} from '@/components/features/training/workout-session';
import { WorkoutPre, WorkoutPayload, DEFAULT_EXECUTION_FIELDS } from '@athli/shared-types';

// Constants
const BOTTOM_NAV_HEIGHT = 80;
const CONTENT_BOTTOM_PADDING = 24;

export default function WorkoutSessionModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslations();

  const params = useLocalSearchParams<{
    workoutId: string;
    date: string;
    clientId: string;
    coachId: string;
    workoutPayload: string;
  }>();

  const [workoutData, setWorkoutData] = useState<WorkoutPayload | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);

  // Parse workout on mount
  useEffect(() => {
    if (params.workoutPayload) {
      try {
        const parsed = JSON.parse(params.workoutPayload);
        setWorkoutData({
          ...parsed,
          pre: parsed.pre ?? DEFAULT_EXECUTION_FIELDS.pre,
        });
      } catch (error) {
        console.error('Failed to parse workout payload:', error);
      }
    }
  }, [params.workoutPayload]);

  // Update workout status to in_progress on mount
  useEffect(() => {
    const updateStatus = async () => {
      if (hasUpdatedStatus) return;
      if (!params.clientId || !params.date || !workoutData) return;

      try {
        const updatedPayload = {
          ...workoutData,
          completedSummary: {
            ...workoutData.completedSummary,
            status: 'in_progress' as const,
            startedAt: new Date().toISOString(),
          },
        };

        await assignWorkout({
          workoutId: params.workoutId,
          clientId: params.clientId,
          ...(params.coachId && { coachId: params.coachId }),
          date: params.date,
          workoutPayload: updatedPayload,
        });

        setWorkoutData(updatedPayload);
        setHasUpdatedStatus(true);
      } catch (error) {
        console.error('Failed to update workout status:', error);
      }
    };

    updateStatus();
  }, [workoutData, params, hasUpdatedStatus]);

  // Navigation handlers
  const handleClose = () => {
    router.back();
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Readiness change handler
  const handleReadinessChange = async (field: keyof WorkoutPre, value: number) => {
    if (!workoutData) return;

    const updatedData = {
      ...workoutData,
      pre: { ...workoutData.pre, [field]: value },
    };
    setWorkoutData(updatedData);

    try {
      await assignWorkout({
        workoutId: params.workoutId,
        clientId: params.clientId,
        ...(params.coachId && { coachId: params.coachId }),
        date: params.date,
        workoutPayload: updatedData,
      });
    } catch (error) {
      console.error('Failed to save readiness value:', error);
    }
  };

  // Progress calculation
  const totalSteps = (workoutData?.totalExercises ?? 0) + 2;
  const progressPercent = (currentStep / totalSteps) * 100;

  // Readiness validation
  const isReadinessComplete = (): boolean => {
    if (!workoutData?.pre) return false;
    const { sleep, mood, energy, stress, soreness } = workoutData.pre;
    return (
      sleep !== null &&
      mood !== null &&
      energy !== null &&
      stress !== null &&
      soreness !== null
    );
  };

  // Navigation state
  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < totalSteps && (currentStep !== 1 || isReadinessComplete());

  // Get page title based on current step
  const getPageTitle = (): string => {
    if (currentStep === 1) {
      return t('training.readiness.title' as any);
    }
    // Add more step titles as needed
    return '';
  };

  // Bottom navigation overlay
  const bottomNavBar = (
    <WorkoutSessionBottomNav
      canGoBack={canGoBack}
      canGoNext={canGoNext}
      timerDisplay="0:00"
      bottomInset={insets.bottom}
      onPrevious={handlePrevious}
      onNext={handleNext}
    />
  );

  const bottomBarHeight = BOTTOM_NAV_HEIGHT + insets.bottom + CONTENT_BOTTOM_PADDING;

  return (
    <ScreenWrapper
      scrollable={true}
      useImageBackground={false}
      overlay={bottomNavBar}
      contentContainerStyle={{ paddingBottom: bottomBarHeight }}
    >
      <WorkoutSessionHeader
        progressPercent={progressPercent}
        onClose={handleClose}
      />

      <WorkoutSessionPageTitle title={getPageTitle()} />

      <View style={styles.content}>
        {workoutData && currentStep === 1 && (
          <ReadinessPage
            values={workoutData.pre}
            onValueChange={handleReadinessChange}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
