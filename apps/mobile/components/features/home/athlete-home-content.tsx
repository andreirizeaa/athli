import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { ChevronRight, FileText, ClipboardCheck, HelpCircle, Dumbbell, Moon } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { SymbolView } from 'expo-symbols';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useAuth, useClientDetailStore } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getMyFiles } from '@/services/client/client-file-service';
import { useAthleteQuestionnaires } from '@/hooks/useAthleteQuestionnaires';
import { getTrainingCalendarRange, type TrainingCalendarItem } from '@/services/client/client-service';
import { formatDateDDMMYYYY, formatDateYYYYMMDD } from '@/lib/utils/date-formatters';

// Helper to get ordinal suffix
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Pick a stable random rest day message based on today's date
const getRestDayIndex = (): number => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return dayOfYear % 8;
};

export const AthleteHomeContent = () => {
  const router = useRouter();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const { clientProfile } = useAuth();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  // Fetch questionnaires to show outstanding count
  const { outstandingQuestionnaires } = useAthleteQuestionnaires();
  const outstandingQuestionnairesCount = outstandingQuestionnaires.length;

  // TODO: Replace with actual data from athlete check-ins hook
  const outstandingCheckIns = 0;

  // Today's workout state
  const [todayWorkouts, setTodayWorkouts] = useState<{ name: string; key: string }[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);

  // Store setters for athlete self-access
  const setStoreFiles = useClientDetailStore((state) => state.setFiles);
  const setStoreClientId = useClientDetailStore((state) => state.setClientId);
  const setStoreCoachId = useClientDetailStore((state) => state.setCoachId);

  // Fetch today's workouts
  useFocusEffect(
    useCallback(() => {
      const fetchTodayWorkouts = async () => {
        if (!clientProfile?.client_id || !clientProfile?.coach_id) {
          setIsLoadingWorkouts(false);
          return;
        }

        try {
          const today = new Date();
          const dateStr = formatDateYYYYMMDD(today);
          const calendar = await getTrainingCalendarRange(
            clientProfile.client_id,
            clientProfile.coach_id,
            dateStr,
            dateStr
          );

          const dayKey = formatDateDDMMYYYY(today);
          const workoutsObj = calendar[dayKey];

          if (workoutsObj && !Array.isArray(workoutsObj)) {
            const workouts = Object.entries(workoutsObj).map(([key, w]) => ({
              name: w.workout,
              key,
            }));
            setTodayWorkouts(workouts);
          } else {
            setTodayWorkouts([]);
          }
        } catch (error) {
          console.error('[AthleteHomeContent] Error fetching today workouts:', error);
          setTodayWorkouts([]);
        } finally {
          setIsLoadingWorkouts(false);
        }
      };

      fetchTodayWorkouts();
    }, [clientProfile?.client_id, clientProfile?.coach_id])
  );

  // Fetch files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      if (!clientProfile) return;

      // Set IDs in store for file viewer
      setStoreClientId(clientProfile.client_id);
      setStoreCoachId(clientProfile.coach_id);

      try {
        const filesData = await getMyFiles(clientProfile.client_id, clientProfile.coach_id);
        setStoreFiles(filesData);
      } catch (error) {
        console.error('[AthleteHomeContent] Error fetching files:', error);
      }
    };

    fetchFiles();
  }, [clientProfile, setStoreFiles, setStoreClientId, setStoreCoachId]);

  const handleOpenFiles = () => {
    if (!clientProfile?.client_id) return;
    router.push({
      pathname: '/client/[id]/files',
      params: { id: clientProfile.client_id, hideAddButton: 'true' },
    });
  };

  const handleOpenCheckIns = () => {
    router.push('/athlete-check-ins');
  };

  const handleOpenQuestionnaires = () => {
    router.push('/athlete-questionnaires');
  };

  const handleOpenTraining = useCallback(() => {
    router.push('/(tabs)/training');
  }, [router]);

  const greeting = useMemo(() => {
    if (clientProfile?.name) {
      const firstName = clientProfile.name.split(' ')[0];
      return `Hey ${firstName}`;
    }
    return t('home.title');
  }, [clientProfile, t]);

  const dateSubtitle = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ] as const;
    const monthName = t(`calendar.months.${monthKeys[today.getMonth()]}`);
    return `Today is the ${day}${getOrdinalSuffix(day)} of ${monthName}`;
  }, [t]);

  const restDayMessage = useMemo(() => {
    return t(`home.todayWorkoutCard.restDay${getRestDayIndex()}`);
  }, [t]);

  const workoutCardMessage = useMemo(() => {
    if (todayWorkouts.length === 0) return '';
    if (todayWorkouts.length === 1) return t('home.todayWorkoutCard.hasWorkouts');
    return t('home.todayWorkoutCard.hasWorkoutsPlural', { count: todayWorkouts.length });
  }, [todayWorkouts.length, t]);

  const isRestDay = !isLoadingWorkouts && todayWorkouts.length === 0;

  // Today's workout card content
  const todayWorkoutCard = useMemo(() => {
    if (isLoadingWorkouts) {
      return (
        <Card style={styles.workoutCard}>
          <View style={styles.workoutCardLoading}>
            <ActivityIndicator size="small" color={themeColors.mutedText} />
          </View>
        </Card>
      );
    }

    if (isRestDay) {
      return (
        <Card style={styles.restDayCard}>
          <View style={styles.restDayContent}>
            <PlatformIcon sf="moon.zzz" IconComponent={Moon} size={28} color={themeColors.mutedText} />
            <Text style={[styles.restDayTitle, { color: themeColors.text }]}>
              {t('training.athlete.noWorkouts')}
            </Text>
            <Text style={[styles.workoutCardMessage, { color: themeColors.mutedText }]}>
              {restDayMessage}
            </Text>
          </View>
        </Card>
      );
    }

    return (
      <PressableScale onPress={handleOpenTraining}>
        <Card style={styles.activeWorkoutCard}>
          {/* Header section */}
          <View style={styles.activeCardHeader}>
            <View style={[styles.activeCardIconCircle, { backgroundColor: primaryColor }]}>
              <PlatformIcon sf="dumbbell" IconComponent={Dumbbell} size={18} color={themeColors.primaryForeground} />
            </View>
            <View style={styles.activeCardHeaderText}>
              <Text style={[styles.activeCardTitle, { color: themeColors.text }]}>
                {workoutCardMessage} {'💪'}
              </Text>
            </View>
            <PlatformIcon
              sf="chevron.right"
              IconComponent={ChevronRight}
              size={iconSizes.extraSmallIcons}
              color={themeColors.mutedText}
            />
          </View>

          {/* Divider */}
          <View style={[styles.activeCardDivider, { backgroundColor: themeColors.border }]} />

          {/* Workout list */}
          <View style={styles.activeCardList}>
            {todayWorkouts.map((workout, index) => (
              <View key={workout.key} style={styles.workoutRow}>
                <View style={[styles.workoutNumberCircle, { backgroundColor: primaryColor }]}>
                  <Text style={[styles.workoutNumberText, { color: themeColors.primaryForeground }]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.workoutName, { color: themeColors.text }]}>
                  {workout.name}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </PressableScale>
    );
  }, [isLoadingWorkouts, isRestDay, todayWorkouts, themeColors, primaryColor, restDayMessage, workoutCardMessage, handleOpenTraining]);

  return (
    <ScreenWrapper scrollable tabScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: themeColors.mutedText }]}>{dateSubtitle}</Text>
      </View>

      <View style={styles.content}>
        {/* Today's workout card */}
        {todayWorkoutCard}

        {/* Two column row for Check-ins and Questionnaires */}
        <View style={styles.twoColumnRow}>
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: themeColors.mutedText }]}>
              {t('athlete.checkIns.title')}
            </Text>
            <PressableScale onPress={handleOpenCheckIns}>
              <Card style={styles.squareCard}>
                <View style={styles.squareCardContent}>
                  {outstandingCheckIns > 0 ? (
                    <>
                      <Text style={[styles.squareCardNumber, { color: themeColors.text }]}>
                        {outstandingCheckIns}
                      </Text>
                      <Text style={[styles.squareCardSubtitle, { color: themeColors.mutedText }]}>
                        {t('athlete.checkIns.outstanding')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.squareCardIcon}>
                        {Platform.OS === 'ios' ? (
                          <SymbolView name="checkmark.circle" tintColor={primaryColor} size={28} type="monochrome" />
                        ) : (
                          <ClipboardCheck {...({ size: 28, color: primaryColor } as any)} />
                        )}
                      </View>
                      <Text style={[styles.squareCardEmpty, { color: themeColors.text }]}>
                        {t('athlete.checkIns.allCaughtUp')}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </PressableScale>
          </View>
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: themeColors.mutedText }]}>
              {t('athlete.questionnaires.title')}
            </Text>
            <PressableScale onPress={handleOpenQuestionnaires}>
              <Card style={styles.squareCard}>
                <View style={styles.squareCardContent}>
                  {outstandingQuestionnairesCount > 0 ? (
                    <>
                      <Text style={[styles.squareCardNumber, { color: themeColors.text }]}>
                        {outstandingQuestionnairesCount}
                      </Text>
                      <Text style={[styles.squareCardSubtitle, { color: themeColors.mutedText }]}>
                        {t('athlete.questionnaires.outstanding')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.squareCardIcon}>
                        {Platform.OS === 'ios' ? (
                          <SymbolView name="questionmark.circle" tintColor={primaryColor} size={28} type="monochrome" />
                        ) : (
                          <HelpCircle {...({ size: 28, color: primaryColor } as any)} />
                        )}
                      </View>
                      <Text style={[styles.squareCardEmpty, { color: themeColors.text }]}>
                        {t('athlete.questionnaires.allCaughtUp')}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </PressableScale>
          </View>
        </View>

        <PressableScale onPress={handleOpenFiles}>
          <Card>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="doc.text" IconComponent={FileText} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('athlete.availableResources')}
                </Text>
              </View>
              <PlatformIcon
                sf="chevron.right"
                IconComponent={ChevronRight}
                size={iconSizes.extraSmallIcons}
                color={themeColors.mutedText}
              />
            </View>
          </Card>
        </PressableScale>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
  subtitle: {
    ...typography.h5,
    fontWeight: '400',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 16,
  },
  // Rest day card
  restDayCard: {
    marginBottom: 24,
    minHeight: 120,
  },
  restDayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  restDayTitle: {
    ...typography.h3,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  workoutCardMessage: {
    ...typography.p2,
    textAlign: 'center',
    paddingVertical: 4,
  },
  // Loading card
  workoutCard: {
    marginBottom: 24,
  },
  workoutCardLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active workout card
  activeWorkoutCard: {
    marginBottom: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activeCardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCardHeaderText: {
    flex: 1,
  },
  activeCardTitle: {
    ...typography.h5,
    fontWeight: '600',
  },
  activeCardDivider: {
    height: 1,
  },
  activeCardList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 5,
  },
  workoutNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutNumberText: {
    fontSize: 15,
    fontWeight: '700',
  },
  workoutName: {
    ...typography.p2,
    fontWeight: '500',
    flex: 1,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    ...typography.p1,
    marginBottom: 8,
  },
  squareCard: {
    aspectRatio: 1.25,
    marginBottom: 0,
  },
  squareCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareCardIcon: {
    marginBottom: 8,
  },
  squareCardNumber: {
    ...typography.h1,
    fontSize: 48,
    lineHeight: 56,
  },
  squareCardSubtitle: {
    ...typography.p3,
    marginTop: 4,
  },
  squareCardEmpty: {
    ...typography.h5,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});
