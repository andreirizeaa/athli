import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Dumbbell, Timer } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useRouter } from 'expo-router';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';
import { COLUMN_OPTIONS } from './types';
import { useSingleThumbnail } from '@/hooks/useExerciseThumbnails';

// Minimal exercise type for preview - compatible with both builder and API payload formats
interface PreviewExercise {
  id: string;
  exerciseId: string;
  name: string;
  imageUrl?: string;
  sets: Array<{
    id: string;
    column1: string;
    column2: string;
    type: 'R' | 'W' | 'F' | 'D';
  }>;
  column1Type: string;
  column2Type: string;
  eachSide?: boolean;
  tempo?: string;
  notes?: string;
  setRestSec?: number;
  alternatives?: { id: string; name: string; imageUrl: string }[];
}

type ExercisePreviewCardProps = {
  exercise: PreviewExercise;
  isLinkedToPrev?: boolean;
  isLinkedToNext?: boolean;
};

const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const RED_ERROR = '#EF4444';
const PRIMARY = '#3B82F6';

export const ExercisePreviewCard = ({
  exercise,
  isLinkedToPrev,
  isLinkedToNext,
}: ExercisePreviewCardProps) => {
  const { colors: themeColors } = useThemePreference();
  const router = useRouter();

  // Check if this is a custom exercise (not from MuscleWiki)
  const isCustomExercise = useMemo(() => {
    if (exercise.imageUrl && (
      exercise.imageUrl.includes('supabase.co') ||
      exercise.imageUrl.startsWith('http') && !exercise.imageUrl.includes('musclewiki')
    )) {
      return true;
    }
    return false;
  }, [exercise.imageUrl]);

  // For MuscleWiki exercises with og_images URLs, we need to fetch the cached thumbnail
  const rawThumbnailUrl = exercise.imageUrl?.includes('og_images') ? exercise.imageUrl : undefined;
  const { thumbnailUrl: cachedThumbnailUrl, isLoading: isMainThumbnailLoading } = useSingleThumbnail(rawThumbnailUrl);

  // Use cached URL for MuscleWiki exercises, or original URL for custom exercises
  const displayThumbnailUrl = isCustomExercise ? exercise.imageUrl : (cachedThumbnailUrl || exercise.imageUrl);

  const handleThumbnailPress = () => {
    router.push({
      pathname: '/modals/workout/exercise-details-modal',
      params: {
        name: exercise.name,
        exerciseId: exercise.exerciseId || '',
        musclewikiId: isCustomExercise ? '' : (exercise.exerciseId || ''),
        isCustom: isCustomExercise ? 'true' : 'false',
      }
    });
  };

  const formatRestTime = (seconds?: number) => {
    if (seconds === undefined || seconds === null || seconds === 0) return null;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}min ${secs > 0 ? secs + 's' : ''}`;
    }
    return `${secs}s`;
  };

  const restTimeDisplay = formatRestTime(exercise.setRestSec);

  return (
    <Card style={[
      styles.card,
      {
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderTopLeftRadius: isLinkedToPrev ? 0 : 20,
        borderTopRightRadius: isLinkedToPrev ? 0 : 20,
        borderBottomLeftRadius: isLinkedToNext ? 0 : 20,
        borderBottomRightRadius: isLinkedToNext ? 0 : 20,
        borderTopWidth: isLinkedToPrev ? 0 : 0.5,
        borderBottomWidth: isLinkedToNext ? 0 : 0.5,
        marginBottom: isLinkedToNext ? 0 : 16,
      }
    ]}>
      {/* Top Section: Thumbnail and Name */}
      <View style={styles.topSection}>
        <PressableScale onPress={handleThumbnailPress}>
          <View style={[
            styles.thumbnailContainer,
            isLinkedToPrev && { borderTopRightRadius: 20 }
          ]}>
            {isMainThumbnailLoading && !displayThumbnailUrl ? (
              <View style={[
                styles.thumbnailPlaceholder,
                { backgroundColor: themeColors.surfacePrimary, alignItems: 'center', justifyContent: 'center' }
              ]}>
                <ActivityIndicator size="small" color={themeColors.primary} />
              </View>
            ) : displayThumbnailUrl ? (
              <Image
                source={{ uri: displayThumbnailUrl }}
                style={[
                  styles.thumbnail,
                  isLinkedToPrev && { borderTopRightRadius: 20 }
                ]}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <SquircleView
                cornerSmoothing={1}
                style={[
                  styles.thumbnailPlaceholder,
                  { backgroundColor: themeColors.surfacePrimary }
                ]}
              >
                <Dumbbell {...({ size: 24, color: themeColors.mutedText } as any)} />
              </SquircleView>
            )}
          </View>
        </PressableScale>

        <View style={styles.nameContainer}>
          <Text style={[styles.exerciseNameText, { color: themeColors.text }]}>
            {exercise.name}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

      {/* Secondary Controls: Each Side & Tempo (only if set) */}
      {(exercise.eachSide || (exercise.tempo && exercise.tempo.trim())) && (
        <View style={styles.secondaryControls}>
          {exercise.eachSide && (
            <View style={styles.secondaryControlItem}>
              <Text style={[styles.secondaryControlLabel, { color: themeColors.mutedText }]}>Each side</Text>
              <Text style={[styles.secondaryControlValue, { color: themeColors.text }]}>Yes</Text>
            </View>
          )}

          {exercise.tempo && exercise.tempo.trim() && (
            <View style={styles.secondaryControlItem}>
              <Text style={[styles.secondaryControlLabel, { color: themeColors.mutedText }]}>Tempo</Text>
              <Text style={[styles.secondaryControlValue, { color: themeColors.text }]}>
                {exercise.tempo}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Sets Section */}
      <View style={styles.setsSection}>
        {/* Column Headers */}
        <View style={styles.setsHeader}>
          <Text style={[styles.setsLabel, { color: themeColors.text }]}>Sets</Text>
          <View style={styles.headerButtons}>
            <View style={styles.columnHeader}>
              <View style={[styles.headerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
                <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>
                  {COLUMN_OPTIONS.find(opt => opt.value === exercise.column1Type)?.label || exercise.column1Type}
                </Text>
              </View>
            </View>

            <View style={styles.columnHeader}>
              <View style={[styles.headerButton, { backgroundColor: themeColors.backgroundTertiary }]}>
                <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>
                  {COLUMN_OPTIONS.find(opt => opt.value === exercise.column2Type)?.label || exercise.column2Type}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Set Rows */}
        {exercise.sets.map((set, index) => {
          const typeColor = set.type === 'W' ? AMBER : set.type === 'F' ? RED_ERROR : set.type === 'D' ? PRIMARY : GREEN;
          return (
            <View key={set.id} style={styles.setRow}>
              <View style={styles.setNumberContainer}>
                <View style={[styles.setTypeBadge, { borderColor: typeColor }]}>
                  <Text style={[styles.setTypeText, { color: typeColor }]}>
                    {set.type}
                  </Text>
                </View>
              </View>

              <View style={styles.inputsRow}>
                <View style={[
                  styles.setValueContainer,
                  {
                    backgroundColor: themeColors.surfacePrimary,
                    borderColor: themeColors.border,
                  }
                ]}>
                  <Text style={[styles.setValueText, { color: themeColors.text }]}>
                    {set.column1 || '-'}
                  </Text>
                </View>

                <View style={[
                  styles.setValueContainer,
                  {
                    backgroundColor: themeColors.surfacePrimary,
                    borderColor: themeColors.border,
                  }
                ]}>
                  <Text style={[styles.setValueText, { color: themeColors.text }]}>
                    {set.column2 || '-'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Rest Timer (only if set) */}
        {restTimeDisplay && (
          <View style={styles.restTimerRow}>
            <View style={[styles.restTimerDisplay, { backgroundColor: themeColors.backgroundTertiary }]}>
              <Timer {...({ size: 16, color: themeColors.primary } as any)} />
              <Text style={[styles.restTimerText, { color: themeColors.primary }]}>
                Rest: {restTimeDisplay}
              </Text>
            </View>
          </View>
        )}

        {/* Notes (only if present) */}
        {exercise.notes && exercise.notes.trim() && (
          <View style={styles.notesContainer}>
            <View style={[styles.notesBox, { borderColor: themeColors.border }]}>
              <Text style={[styles.notesText, { color: themeColors.mutedText }]}>
                {exercise.notes}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Add padding at bottom when linked to next exercise */}
      {isLinkedToNext && <View style={{ height: 16 }} />}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
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
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
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
  setValueText: {
    ...typography.p1,
    textAlign: 'center',
  },
  restTimerRow: {
    marginTop: 8,
    alignItems: 'flex-start',
    paddingLeft: 44,
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
});
