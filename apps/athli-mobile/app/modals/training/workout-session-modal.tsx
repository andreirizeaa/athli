import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { X } from 'lucide-react-native';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { assignWorkout } from '@/services/client/client-training-service';

export default function WorkoutSessionModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const params = useLocalSearchParams<{
    workoutId: string;
    date: string;
    clientId: string;
    coachId: string;
    workoutPayload: string;
  }>();

  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);

  // Update workout status to in_progress on mount
  useEffect(() => {
    const updateStatus = async () => {
      if (hasUpdatedStatus) return;
      if (!params.clientId || !params.date || !params.workoutPayload) return;

      try {
        const workoutData = JSON.parse(params.workoutPayload);

        // Update the workout with in_progress status
        const updatedPayload = {
          ...workoutData,
          completedSummary: {
            ...workoutData.completedSummary,
            status: 'in_progress',
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

        setHasUpdatedStatus(true);
      } catch (error) {
        console.error('Failed to update workout status:', error);
      }
    };

    updateStatus();
  }, [params, hasUpdatedStatus]);

  const handleClose = () => {
    router.back();
  };

  return (
    <ScreenWrapper scrollable={false} useImageBackground={false}>
      <View style={styles.header}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('training.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Workout session content will go here */}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
