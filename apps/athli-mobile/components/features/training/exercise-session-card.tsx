import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ActivityIndicator, Modal, Pressable, ScrollView } from 'react-native';
import { Check, Dumbbell, RefreshCw, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';
import { useRouter } from 'expo-router';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useColorScheme } from '@/stores';
import { useSingleThumbnail } from '@/hooks/useExerciseThumbnails';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';
import { InputBox } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import type { SetPayload, RegularExercisePayload } from '@athli/shared-types';

const GREEN = '#22C55E';
const GREEN_SOFT = 'rgba(34, 197, 94, 0.15)';

type AlternativeExercise = {
  id: string;
  name: string;
  thumbnailUrl?: string;
};

type ExerciseSessionCardProps = {
  exercise: RegularExercisePayload;
  exerciseName: string;
  exerciseImageUrl?: string;
  alternatives?: AlternativeExercise[];
  onSetComplete: (setIndex: number, completed: boolean) => void;
  onSetValueChange: (setIndex: number, field: 'trackableField1' | 'trackableField2', value: string) => void;
  onAlternativeSelect?: (alternativeId: string) => void;
  isSuperset?: boolean;
  supersetLabel?: string;
  /** If true, only the first uncompleted set checkbox is enabled (sequential completion) */
  sequentialSets?: boolean;
  /** If true, show loading state for thumbnail (exercise data is being fetched) */
  isExerciseDataLoading?: boolean;
};

export const ExerciseSessionCard = ({
  exercise,
  exerciseName,
  exerciseImageUrl,
  alternatives = [],
  onSetComplete,
  onSetValueChange,
  onAlternativeSelect,
  isSuperset = false,
  supersetLabel,
  sequentialSets = false,
  isExerciseDataLoading = false,
}: ExerciseSessionCardProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslations();
  const router = useRouter();
  const [setTypeDialog, setSetTypeDialog] = useState<{ visible: boolean; type: string }>({
    visible: false,
    type: 'normal',
  });
  const [tempoDialogVisible, setTempoDialogVisible] = useState(false);
  const [alternativesModalVisible, setAlternativesModalVisible] = useState(false);
  
  // Rest timer state
  const [activeRestTimer, setActiveRestTimer] = useState<{ setIndex: number; restSec: number; timeRemaining: number } | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasAlternatives = alternatives.length > 0;

  // Check if custom exercise (not from MuscleWiki)
  const isCustomExercise = exerciseImageUrl && (
    exerciseImageUrl.includes('supabase.co') ||
    (exerciseImageUrl.startsWith('http') && !exerciseImageUrl.includes('musclewiki'))
  );

  const handleSetTypePress = (type: string) => {
    setSetTypeDialog({ visible: true, type });
  };

  // Handle set completion - start rest timer if restSec > 0
  const handleSetCompleteWithRest = (setIndex: number, completed: boolean) => {
    onSetComplete(setIndex, completed);
    
    // If set is completed and has rest time, start timer
    if (completed && setIndex < exercise.sets.length - 1) {
      const set = exercise.sets[setIndex];
      const restSec = set.restSec || 0;
      
      if (restSec > 0) {
        // Clear any existing timer
        if (restTimerRef.current) {
          clearInterval(restTimerRef.current);
          restTimerRef.current = null;
        }
        
        // Start new rest timer
        setActiveRestTimer({ setIndex, restSec, timeRemaining: restSec });
        
        // Start countdown
        restTimerRef.current = setInterval(() => {
          setActiveRestTimer((prev) => {
            if (!prev) return null;
            
            const newTimeRemaining = prev.timeRemaining - 1;
            
            if (newTimeRemaining <= 0) {
              // Timer finished
              if (restTimerRef.current) {
                clearInterval(restTimerRef.current);
                restTimerRef.current = null;
              }
              return null;
            }
            
            return { ...prev, timeRemaining: newTimeRemaining };
          });
        }, 1000);
      }
    } else {
      // Clear timer if set is unchecked or it's the last set
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
      setActiveRestTimer(null);
    }
  };

  // Cleanup timer on unmount or when exercise changes
  useEffect(() => {
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
      setActiveRestTimer(null);
    };
  }, [exercise.prescribedExerciseId]);

  // Format time as MM:SS
  const formatRestTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRestTimerColor = (timeRemaining: number, totalRestSec: number): string => {
    // Handle edge cases
    if (totalRestSec === 0) {
      return '#22C55E'; // Default to green if duration is 0
    }
    
    if (timeRemaining <= 0) {
      return '#EF4444'; // Red when time is up
    }
    
    // Ensure timeRemaining doesn't exceed totalRestSec
    const clampedTime = Math.min(timeRemaining, totalRestSec);
    const ratio = clampedTime / totalRestSec;
    
    // Green: > 40% remaining (ratio > 0.4)
    if (ratio > 0.4) {
      return '#22C55E';
    }
    // Amber: 20-40% remaining (ratio 0.2-0.4)
    if (ratio > 0.2) {
      return '#F59E0B';
    }
    // Red: < 20% remaining (ratio <= 0.2)
    return '#EF4444';
  };

  const setTypeKey = getSetTypeKey(setTypeDialog.type);

  // For MuscleWiki exercises, fetch cached thumbnail
  const rawThumbnailUrl = exerciseImageUrl?.includes('og_images') ? exerciseImageUrl : undefined;
  const { thumbnailUrl: cachedThumbnailUrl, isLoading: isThumbnailLoading } = useSingleThumbnail(rawThumbnailUrl);
  const displayThumbnailUrl = isCustomExercise ? exerciseImageUrl : (cachedThumbnailUrl || exerciseImageUrl);

  // Determine which columns to show (hide if None or Optional)
  const showColumn1 = exercise.column1Label && exercise.column1Label !== 'None' && exercise.column1Label !== 'Optional';
  const showColumn2 = exercise.column2Label && exercise.column2Label !== 'None' && exercise.column2Label !== 'Optional';
  const showBothColumns = showColumn1 && showColumn2;
  const showNoColumns = !showColumn1 && !showColumn2;

  // Parse tempo values (format: "3-1-2-0")
  const parseTempo = (tempo: string | null) => {
    if (!tempo) return null;
    const parts = tempo.split('-').map(p => p.trim());
    if (parts.length !== 4) return null;
    return {
      eccentric: parts[0] || '0',
      pause1: parts[1] || '0',
      concentric: parts[2] || '0',
      pause2: parts[3] || '0',
    };
  };

  const tempoValues = parseTempo(exercise.tempo);

  // For sequential sets, find the first uncompleted set index
  const nextSetToComplete = sequentialSets
    ? exercise.sets.findIndex((set) => set.completed !== 'completed')
    : -1; // -1 means all sets are enabled

  // Build tempo description message
  const buildTempoDescription = () => {
    if (!tempoValues) return '';
    const lines = [
      t('training.session.tempo.description' as any),
      '',
      `• ${t('training.session.tempo.eccentric' as any)}: ${t('training.session.tempo.eccentricDesc' as any).replace('{{value}}', tempoValues.eccentric)}`,
      `• ${t('training.session.tempo.pause1' as any)}: ${t('training.session.tempo.pause1Desc' as any).replace('{{value}}', tempoValues.pause1)}`,
      `• ${t('training.session.tempo.concentric' as any)}: ${t('training.session.tempo.concentricDesc' as any).replace('{{value}}', tempoValues.concentric)}`,
      `• ${t('training.session.tempo.pause2' as any)}: ${t('training.session.tempo.pause2Desc' as any).replace('{{value}}', tempoValues.pause2)}`,
    ];
    return lines.join('\n');
  };

  // Handle thumbnail press to show exercise details
  const handleThumbnailPress = () => {
    router.push({
      pathname: '/modals/workout/exercise-details-modal',
      params: {
        name: exerciseName,
        exerciseId: exercise.prescribedExerciseId || '',
        // For MuscleWiki exercises, prescribedExerciseId IS the musclewikiId
        musclewikiId: isCustomExercise ? '' : (exercise.prescribedExerciseId || ''),
        isCustom: isCustomExercise ? 'true' : 'false',
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header: Thumbnail + Name + Alternatives Button */}
      <View style={styles.header}>
        <PressableScale onPress={handleThumbnailPress}>
          <View style={styles.thumbnailContainer}>
            {(isExerciseDataLoading || isThumbnailLoading) && !displayThumbnailUrl ? (
              <View style={[styles.thumbnail, { backgroundColor: themeColors.surfacePrimary, alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color={themeColors.primary} />
              </View>
            ) : displayThumbnailUrl ? (
              <Image
                source={{ uri: displayThumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.thumbnail, { backgroundColor: themeColors.surfacePrimary, alignItems: 'center', justifyContent: 'center' }]}>
                <Dumbbell size={24} color={themeColors.mutedText} />
              </View>
            )}
          </View>
        </PressableScale>
        <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={2}>
          {supersetLabel && (
            <Text style={[styles.supersetLabel, { color: themeColors.primary }]}>{supersetLabel}  </Text>
          )}
          {exerciseName}
        </Text>
        {hasAlternatives && (
          <IconButton
            icon={{ sf: 'arrow.trianglehead.2.clockwise', IconComponent: RefreshCw }}
            onPress={() => setAlternativesModalVisible(true)}
            size="md"
            color={themeColors.text}
          />
        )}
      </View>

      {/* Notes - below header */}
      {exercise.notes && (
        <View style={[
          styles.notesContainer,
          !(exercise.tempo || exercise.eachSide) && styles.notesContainerMargin
        ]}>
          <InputBox
            label={t('general.notes')}
            value={exercise.notes}
            onChangeText={() => {}}
            editable={false}
            multiline
          />
        </View>
      )}

      {/* Each Side & Tempo */}
      {(exercise.tempo || exercise.eachSide) && (
        <View style={styles.tempoContainer}>
          {exercise.eachSide ? (
            <Text style={[styles.eachSideText, { color: themeColors.mutedText }]}>
              {t('training.session.eachSide' as any)}
            </Text>
          ) : <View />}
          {exercise.tempo ? (
            <PressableScale onPress={() => setTempoDialogVisible(true)}>
              <View style={styles.tempoRow}>
                <Text style={[styles.tempoLabel, { color: themeColors.mutedText }]}>
                  {t('training.session.tempo.label' as any)}
                </Text>
                <Card variant="form" style={styles.tempoCard}>
                  <Text style={[styles.tempoValue, { color: themeColors.text }]}>
                    {exercise.tempo}
                  </Text>
                </Card>
              </View>
            </PressableScale>
          ) : null}
        </View>
      )}

      {/* Column Headers */}
      <View style={styles.columnHeaders}>
        <View style={styles.setHeaderContainer}>
          <Text style={[styles.columnHeaderText, { color: themeColors.mutedText }]}>{t('training.session.set' as any)}</Text>
        </View>
        {!showNoColumns && (
          <View style={styles.inputsHeader}>
            {showColumn1 && (
              <Text style={[styles.columnHeaderText, styles.inputHeaderText, { color: themeColors.mutedText }]}>
                {exercise.column1Label.toUpperCase()}
              </Text>
            )}
            {showColumn2 && (
              <Text style={[styles.columnHeaderText, styles.inputHeaderText, { color: themeColors.mutedText }]}>
                {exercise.column2Label.toUpperCase()}
              </Text>
            )}
          </View>
        )}
        {showNoColumns && <View style={styles.spacer} />}
        <View style={styles.completeHeaderSpacer}>
          <Check size={16} color={themeColors.mutedText} strokeWidth={2.5} />
        </View>
      </View>

      {/* Set Rows */}
      {exercise.sets.map((set, index) => (
        <React.Fragment key={`set-${index}`}>
          <SetRow
            set={set}
            setIndex={index}
            showColumn1={showColumn1}
            showColumn2={showColumn2}
            showBothColumns={showBothColumns}
            showNoColumns={showNoColumns}
            themeColors={themeColors}
            onComplete={(completed) => handleSetCompleteWithRest(index, completed)}
            onValueChange={(field, value) => onSetValueChange(index, field, value)}
            onSetTypePress={handleSetTypePress}
            isCheckboxEnabled={nextSetToComplete === -1 || set.completed === 'completed' || index === nextSetToComplete}
          />
          {/* Rest Timer - always visible for non-superset exercises, show rest duration by default */}
          {!isSuperset && index < exercise.sets.length - 1 && set.restSec > 0 && (
            <View style={styles.restTimerCardContainer}>
              {activeRestTimer?.setIndex === index ? (
                <Card
                  variant="form"
                  style={[
                    styles.restTimerCard,
                    {
                      borderColor: getRestTimerColor(activeRestTimer.timeRemaining, activeRestTimer.restSec),
                      borderWidth: 1,
                      backgroundColor: `${getRestTimerColor(activeRestTimer.timeRemaining, activeRestTimer.restSec)}20`,
                    },
                  ]}
                >
                  <Text style={[styles.restTimerTime, { color: getRestTimerColor(activeRestTimer.timeRemaining, activeRestTimer.restSec) }]}>
                    {formatRestTime(activeRestTimer.timeRemaining)}{' '}
                    <Text style={[styles.restTimerSuffix, { color: getRestTimerColor(activeRestTimer.timeRemaining, activeRestTimer.restSec) }]}>
                      Rest
                    </Text>
                  </Text>
                </Card>
              ) : (
                <Card variant="form" style={styles.restTimerCard}>
                  <Text style={[styles.restTimerTime, { color: themeColors.text }]}>
                    {formatRestTime(set.restSec)}{' '}
                    <Text style={[styles.restTimerSuffix, { color: themeColors.text }]}>
                      Rest
                    </Text>
                  </Text>
                </Card>
              )}
            </View>
          )}
        </React.Fragment>
      ))}

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

      {/* Tempo Info Dialog */}
      <Dialog
        visible={tempoDialogVisible}
        onClose={() => setTempoDialogVisible(false)}
        title={t('training.session.tempo.title' as any)}
        message={buildTempoDescription()}
        buttons={[
          {
            label: t('general.close'),
            onPress: () => setTempoDialogVisible(false),
            variant: 'primary',
          },
        ]}
        showCloseIcon={false}
      />

      {/* Alternatives Modal */}
      <Modal
        visible={alternativesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlternativesModalVisible(false)}
      >
        <Pressable
          style={styles.alternativesModalOverlay}
          onPress={() => setAlternativesModalVisible(false)}
        >
          <Pressable
            style={styles.alternativesModalWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            <SquircleView
              cornerSmoothing={1}
              style={[styles.alternativesModalCard, { backgroundColor: themeColors.cardPrimary }]}
            >
              <View style={styles.alternativesModalHeader}>
                <Text style={[styles.alternativesModalTitle, { color: themeColors.text }]}>
                  {t('training.session.selectAlternative' as any)}
                </Text>
                <IconButton
                  icon={{ sf: 'xmark', IconComponent: X }}
                  onPress={() => setAlternativesModalVisible(false)}
                  size="sm"
                  color={themeColors.mutedText}
                  backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                />
              </View>
              <ScrollView style={styles.alternativesList} showsVerticalScrollIndicator={false}>
                {alternatives.map((alt) => (
                  <AlternativeCard
                    key={alt.id}
                    alternative={alt}
                    themeColors={themeColors}
                    onSelect={() => {
                      setAlternativesModalVisible(false);
                      onAlternativeSelect?.(alt.id);
                    }}
                  />
                ))}
              </ScrollView>
            </SquircleView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

type SetRowProps = {
  set: SetPayload;
  setIndex: number;
  showColumn1: boolean;
  showColumn2: boolean;
  showBothColumns: boolean;
  showNoColumns: boolean;
  themeColors: any;
  onComplete: (completed: boolean) => void;
  onValueChange: (field: 'trackableField1' | 'trackableField2', value: string) => void;
  onSetTypePress: (type: string) => void;
  isCheckboxEnabled?: boolean;
};

// Map set type to display letter
const getSetTypeLabel = (type: string): string => {
  switch (type) {
    case 'warmUp': return 'W';
    case 'failure': return 'F';
    case 'dropset': return 'D';
    case 'normal':
    default: return 'R';
  }
};

// Get set type translation key
const getSetTypeKey = (type: string): string => {
  switch (type) {
    case 'warmUp': return 'warmUp';
    case 'failure': return 'failure';
    case 'dropset': return 'dropset';
    case 'normal':
    default: return 'regular';
  }
};

const SetRow = ({
  set,
  setIndex,
  showColumn1,
  showColumn2,
  showBothColumns,
  showNoColumns,
  themeColors,
  onComplete,
  onValueChange,
  onSetTypePress,
  isCheckboxEnabled = true,
}: SetRowProps) => {
  const isCompleted = set.completed === 'completed';
  const setTypeLabel = getSetTypeLabel(set.type);
  const canToggle = isCheckboxEnabled;

  return (
    <View style={[
      styles.setRow,
      isCompleted && styles.setRowCompleted
    ]}>
      {/* Set Type - Left Edge */}
      <PressableScale onPress={() => onSetTypePress(set.type)}>
        <View style={[styles.setNumberCircle, { borderColor: themeColors.text }]}>
          <Text style={[styles.setNumber, { color: themeColors.text }]}>
            {setTypeLabel}
          </Text>
        </View>
      </PressableScale>

      {/* Input Fields - Center (only if at least one column to show) */}
      {!showNoColumns && (
        <View style={styles.inputsRow}>
          {showColumn1 && (
            <TextInput
              style={[
                styles.setInput,
                !showBothColumns && styles.setInputFull,
                {
                  color: themeColors.text,
                  borderColor: isCompleted ? GREEN : themeColors.border,
                }
              ]}
              value={set.trackableField1.completed ?? set.trackableField1.prescribed ?? ''}
              onChangeText={(text) => onValueChange('trackableField1', text)}
              placeholder={set.trackableField1.prescribed || '0'}
              placeholderTextColor={themeColors.mutedText}
              keyboardType="numeric"
            />
          )}
          {showColumn2 && (
            <TextInput
              style={[
                styles.setInput,
                !showBothColumns && styles.setInputFull,
                {
                  color: themeColors.text,
                  borderColor: isCompleted ? GREEN : themeColors.border,
                }
              ]}
              value={set.trackableField2.completed ?? set.trackableField2.prescribed ?? ''}
              onChangeText={(text) => onValueChange('trackableField2', text)}
              placeholder={set.trackableField2.prescribed || '0'}
              placeholderTextColor={themeColors.mutedText}
              keyboardType="numeric"
            />
          )}
        </View>
      )}

      {/* Spacer when no columns */}
      {showNoColumns && <View style={styles.spacer} />}

      {/* Complete Button - Right Edge */}
      <PressableScale
        onPress={() => {
          if (!canToggle) return;
          haptics.success();
          onComplete(!isCompleted);
        }}
        style={{ opacity: canToggle ? 1 : 0.4 }}
      >
        <View style={[
          styles.completeCircle,
          {
            borderColor: isCompleted ? GREEN : themeColors.border,
            backgroundColor: isCompleted ? GREEN : 'transparent',
          }
        ]}>
          {isCompleted && (
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          )}
        </View>
      </PressableScale>
    </View>
  );
};

// Alternative exercise card for selection modal
type AlternativeCardProps = {
  alternative: AlternativeExercise;
  themeColors: any;
  onSelect: () => void;
};

const AlternativeCard = ({ alternative, themeColors, onSelect }: AlternativeCardProps) => {
  const { thumbnailUrl: cachedThumbnailUrl } = useSingleThumbnail(
    alternative.thumbnailUrl?.includes('og_images') ? alternative.thumbnailUrl : undefined
  );
  const displayUrl = cachedThumbnailUrl || alternative.thumbnailUrl;

  return (
    <PressableScale onPress={onSelect} style={styles.alternativeCardWrapper}>
      <Card variant="form" style={styles.alternativeCard}>
        <View style={styles.alternativeCardContent}>
          {displayUrl ? (
            <Image
              source={{ uri: displayUrl }}
              style={styles.alternativeThumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.alternativeThumbnail, { backgroundColor: themeColors.surfacePrimary, alignItems: 'center', justifyContent: 'center' }]}>
              <Dumbbell size={20} color={themeColors.mutedText} />
            </View>
          )}
          <Text style={[styles.alternativeName, { color: themeColors.text }]} numberOfLines={2}>
            {alternative.name}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  exerciseName: {
    flex: 1,
    marginLeft: 16,
    ...typography.h4,
    fontWeight: '700',
  },
  supersetLabel: {
    fontWeight: '800',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  setHeaderContainer: {
    width: 32,
    alignItems: 'center',
  },
  inputsHeader: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
  },
  inputHeaderText: {
    flex: 1,
    textAlign: 'center',
  },
  columnHeaderText: {
    ...typography.p3,
    fontWeight: '600',
  },
  completeHeaderSpacer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  setRowCompleted: {
    backgroundColor: GREEN_SOFT,
  },
  setNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    ...typography.p2,
    fontWeight: '700',
  },
  inputsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 12,
  },
  setInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    ...typography.p1,
    fontWeight: '600',
  },
  setInputFull: {
    maxWidth: '100%',
  },
  spacer: {
    flex: 1,
  },
  completeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesContainer: {
    paddingHorizontal: 16,
  },
  notesContainerMargin: {
    marginBottom: 24,
  },
  notesText: {
    ...typography.p2,
    fontStyle: 'italic',
  },
  tempoContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eachSideText: {
    ...typography.p3,
    fontWeight: '600',
  },
  tempoLabel: {
    ...typography.p3,
    fontWeight: '600',
  },
  tempoCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tempoValue: {
    ...typography.p2,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Alternatives modal styles
  alternativesModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  alternativesModalWrapper: {
    width: '100%',
    maxHeight: '70%',
  },
  alternativesModalCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  alternativesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  alternativesModalTitle: {
    ...typography.h3,
    fontWeight: '600',
    flex: 1,
  },
  alternativesList: {
    maxHeight: 400,
  },
  alternativeCardWrapper: {
    marginBottom: 12,
  },
  alternativeCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  alternativeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alternativeThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  alternativeName: {
    ...typography.p1,
    fontWeight: '600',
    flex: 1,
  },
  restTimerCardContainer: {
    paddingRight: 16,
    marginLeft: -16,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  restTimerCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  restTimerTime: {
    ...typography.p2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  restTimerSuffix: {
    ...typography.p2,
    fontWeight: '500',
  },
});
