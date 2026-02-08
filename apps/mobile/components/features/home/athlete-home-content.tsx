import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { ChevronRight, FileText, Dumbbell, Moon, ListChecks, CircleCheck, ClipboardList, Send, CheckCircle, Target } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { Image } from 'expo-image';
import { Separator } from '@/components/ui/separator';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useAuth, useAuthSessionStore, useClientDetailStore } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getMyFiles } from '@/services/client/client-file-service';
import { useAthleteTasks, type ClientTask } from '@/hooks/useAthleteTasks';
import { getClientCheckInDetail, getClientQuestionnaireDetail } from '@/services/client/client-form-service';
import { getTrainingCalendarRange, type TrainingCalendarItem } from '@/services/client/client-service';
import { getCoaches, getInboxMessages, type Coach } from '@/services/inbox-service';
import { formatDateDDMMYYYY, formatDateYYYYMMDD } from '@/lib/utils/date-formatters';
import { haptics } from '@/utils/haptics';
import { useRealtimeConversations } from '@/hooks/use-realtime-messaging';

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatMessageTime = (date: Date | null | undefined): string => {
  if (!date) return '';
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  if (diffInHours < 24) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  if (diffInDays < 7) {
    if (diffInDays === 1) return 'Yesterday';
    return DAY_NAMES[date.getDay()];
  }
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

// Pick a stable random message based on today's date
const getDayOfYearIndex = (): number => {
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

  const userId = useAuthSessionStore((state) => state.userId);

  // Fetch tasks
  const { tasks, isLoading: isLoadingTasks } = useAthleteTasks();

  // Coach conversation state
  const [coachConversation, setCoachConversation] = useState<Coach | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

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

  // Fetch coach conversation
  useFocusEffect(
    useCallback(() => {
      const fetchConversation = async () => {
        try {
          const conversations = await getCoaches();
          setCoachConversation(conversations.length > 0 ? conversations[0] : null);
        } catch (error) {
          console.error('[AthleteHomeContent] Error fetching conversation:', error);
        } finally {
          setIsLoadingConversation(false);
        }
      };

      fetchConversation();
    }, [])
  );

  // Realtime conversation updates for coach message card
  useRealtimeConversations({
    userId: userId || '',
    onConversationUpdated: (realtimeConversation) => {
      setCoachConversation((prev) => {
        if (!prev || prev.id !== realtimeConversation.id) return prev;
        return {
          ...prev,
          ...realtimeConversation,
          // Preserve joined fields that don't come from realtime
          other_user_name: prev.other_user_name,
          other_user_avatar: prev.other_user_avatar,
        };
      });
    },
  });

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

  const handleOpenForms = () => {
    router.push('/athlete-forms');
  };

  const handleOpenGoalsInjuries = () => {
    router.push('/athlete-goals-injuries');
  };

  const handleCoachMessagePress = useCallback(async () => {
    if (!coachConversation) return;
    haptics.medium();
    try {
      const messages = await getInboxMessages(coachConversation.id);
      router.push({
        pathname: '/inbox/[id]',
        params: {
          id: coachConversation.id,
          coach: JSON.stringify(coachConversation),
          messages: JSON.stringify(messages),
        },
      });
    } catch (error) {
      // Fallback: navigate without cached messages
      router.push({
        pathname: '/inbox/[id]',
        params: {
          id: coachConversation.id,
          coach: JSON.stringify(coachConversation),
        },
      });
    }
  }, [coachConversation, router]);

  const handleOpenTraining = useCallback(() => {
    router.push('/(tabs)/training');
  }, [router]);

  const handleTaskPress = useCallback(async (task: ClientTask) => {
    if (!clientProfile) return;
    haptics.medium();

    if (task.task_type === 'check_in') {
      try {
        const checkIn = await getClientCheckInDetail(
          clientProfile.client_id,
          task.reference_id,
          clientProfile.coach_id,
        );
        router.push({
          pathname: '/modals/athlete/form-response-session-modal',
          params: {
            questionnaireId: task.reference_id,
            questionnaireName: checkIn.name,
            questionsJson: JSON.stringify(checkIn.questions),
            formType: 'check_in',
            checkInId: task.reference_id,
          },
        });
      } catch (error) {
        console.error('[AthleteHomeContent] Error fetching check-in:', error);
      }
    } else if (task.task_type === 'questionnaire') {
      try {
        const questionnaire = await getClientQuestionnaireDetail(
          clientProfile.client_id,
          task.reference_id,
          clientProfile.coach_id,
        );
        router.push({
          pathname: '/modals/athlete/form-response-session-modal',
          params: {
            questionnaireId: task.reference_id,
            questionnaireName: questionnaire.name,
            questionsJson: JSON.stringify(questionnaire.questions),
          },
        });
      } catch (error) {
        console.error('[AthleteHomeContent] Error fetching questionnaire:', error);
      }
    } else if (task.task_type === 'metric') {
      router.push({
        pathname: '/modals/athlete/log-metric-modal',
        params: {
          assignmentId: task.reference_id,
          metricName: task.name || '',
          date: task.due_date,
        },
      });
    } else if (task.task_type === 'habit') {
      router.push({
        pathname: '/modals/athlete/log-habit-modal',
        params: {
          assignmentId: task.reference_id,
          habitName: task.name || '',
          date: task.due_date,
        },
      });
    }
  }, [clientProfile, router]);

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
    return t(`home.todayWorkoutCard.restDay${getDayOfYearIndex()}`);
  }, [t]);

  const workoutCardMessage = useMemo(() => {
    if (todayWorkouts.length === 0) return '';
    if (todayWorkouts.length === 1) return t('home.todayWorkoutCard.hasWorkouts');
    return t('home.todayWorkoutCard.hasWorkoutsPlural', { count: todayWorkouts.length });
  }, [todayWorkouts.length, t]);

  const noTasksMessage = useMemo(() => {
    return t(`tasksCard.noTasks${getDayOfYearIndex()}`);
  }, [t]);

  const tasksCardMessage = useMemo(() => {
    if (tasks.length === 0) return '';
    if (tasks.length === 1) return t('tasksCard.hasTasks');
    return t('tasksCard.hasTasksPlural', { count: tasks.length });
  }, [tasks.length, t]);

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

  // Tasks card content
  const tasksCard = useMemo(() => {
    if (isLoadingTasks) {
      return (
        <Card style={styles.workoutCard}>
          <View style={styles.workoutCardLoading}>
            <ActivityIndicator size="small" color={themeColors.mutedText} />
          </View>
        </Card>
      );
    }

    if (tasks.length === 0) {
      return (
        <Card style={styles.restDayCard}>
          <View style={styles.restDayContent}>
            <PlatformIcon sf="checkmark.circle" IconComponent={CircleCheck} size={28} color={themeColors.mutedText} />
            <Text style={[styles.restDayTitle, { color: themeColors.text }]}>
              {t('tasksCard.noTasks')}
            </Text>
            <Text style={[styles.workoutCardMessage, { color: themeColors.mutedText }]}>
              {noTasksMessage}
            </Text>
          </View>
        </Card>
      );
    }

    return (
      <Card style={styles.activeWorkoutCard}>
        {/* Header section */}
        <View style={styles.activeCardHeader}>
          <View style={[styles.activeCardIconCircle, { backgroundColor: primaryColor }]}>
            <PlatformIcon sf="checklist.checked" IconComponent={ListChecks} size={18} color={themeColors.primaryForeground} />
          </View>
          <View style={styles.activeCardHeaderText}>
            <Text style={[styles.activeCardTitle, { color: themeColors.text }]}>
              {tasksCardMessage}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.activeCardDivider, { backgroundColor: themeColors.border }]} />

        {/* Task list */}
        <View style={styles.activeCardList}>
          {tasks.map((task, index) => (
            <PressableScale key={task.id} onPress={() => handleTaskPress(task)}>
              <View style={styles.workoutRow}>
                <View style={[styles.workoutNumberCircle, { backgroundColor: primaryColor }]}>
                  <Text style={[styles.workoutNumberText, { color: themeColors.primaryForeground }]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.workoutName, { color: themeColors.text }]}>
                  {task.name || task.task_type}
                </Text>
              </View>
            </PressableScale>
          ))}
        </View>
      </Card>
    );
  }, [isLoadingTasks, tasks, themeColors, primaryColor, noTasksMessage, tasksCardMessage, handleTaskPress, t]);

  const weSentLastMessage = coachConversation?.last_message_sender_id === userId;

  const coachMessagesCard = useMemo(() => {
    if (isLoadingConversation) {
      return (
        <Card style={styles.workoutCard}>
          <View style={styles.workoutCardLoading}>
            <ActivityIndicator size="small" color={themeColors.mutedText} />
          </View>
        </Card>
      );
    }

    if (!coachConversation) {
      return null;
    }

    return (
      <PressableScale onPress={handleCoachMessagePress}>
        <Card style={styles.coachMessageCard}>
          <View style={styles.coachMessageContent}>
            <View style={styles.coachAvatarContainer}>
              {coachConversation.other_user_avatar ? (
                <Image source={{ uri: coachConversation.other_user_avatar }} style={styles.coachAvatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.coachAvatarPlaceholder, { backgroundColor: themeColors.border }]} />
              )}
            </View>
            <View style={styles.coachMessageTextContainer}>
              <View style={styles.coachMessageHeader}>
                <Text style={[styles.coachName, { color: themeColors.text }]} numberOfLines={1}>
                  {coachConversation.other_user_name}
                </Text>
                {coachConversation.last_message_at && (
                  <Text
                    style={[
                      styles.coachMessageTimestamp,
                      {
                        color: (coachConversation.unread_count ?? 0) > 0 ? primaryColor : themeColors.mutedText,
                      },
                    ]}
                  >
                    {formatMessageTime(coachConversation.last_message_at)}
                  </Text>
                )}
              </View>
              <View style={styles.coachMessageFooter}>
                <View style={styles.coachLastMessageContainer}>
                  {weSentLastMessage && coachConversation.last_message_preview && (
                    <View style={styles.coachReadReceipt}>
                      <PlatformIcon
                        sf={coachConversation.last_message_is_read ? 'checkmark.circle' : 'paperplane'}
                        IconComponent={coachConversation.last_message_is_read ? CheckCircle : Send}
                        size={iconSizes.extraSmallIcons}
                        color={coachConversation.last_message_is_read ? primaryColor : themeColors.mutedText}
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.coachLastMessage,
                      {
                        color: themeColors.mutedText,
                        fontStyle: coachConversation.last_message_preview ? 'normal' : 'italic',
                        opacity: coachConversation.last_message_preview ? 1 : 0.6,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {coachConversation.last_message_preview || t('chats.beFirstToMessage')}
                  </Text>
                </View>
                {(coachConversation.unread_count ?? 0) > 0 && (
                  <View style={[styles.coachUnreadBadge, { backgroundColor: primaryColor }]}>
                    <Text style={[styles.coachUnreadCount, { color: themeColors.primaryForeground }]}>
                      {(coachConversation.unread_count ?? 0) > 99 ? '99+' : coachConversation.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>
      </PressableScale>
    );
  }, [isLoadingConversation, coachConversation, themeColors, primaryColor, weSentLastMessage, handleCoachMessagePress, t]);

  return (
    <ScreenWrapper scrollable tabScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: themeColors.mutedText }]}>{dateSubtitle}</Text>
      </View>

      <View style={styles.content}>
        {/* Today's workout card */}
        {todayWorkoutCard}

        {/* Coach Messages */}
        {coachMessagesCard && (
          <>
            <Text style={[styles.sectionLabel, { color: themeColors.mutedText }]}>
              {t('coachMessages.title')}
            </Text>
            {coachMessagesCard}
          </>
        )}

        {/* Tasks card */}
        <Text style={[styles.sectionLabel, { color: themeColors.mutedText }]}>
          {t('tasksCard.title')}
        </Text>
        {tasksCard}

        {/* Goals & Injuries + Available Resources + Forms */}
        <Card>
          <PressableScale onPress={handleOpenGoalsInjuries}>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="target" IconComponent={Target} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('athlete.goalsInjuries.title')}
                </Text>
              </View>
              <PlatformIcon
                sf="chevron.right"
                IconComponent={ChevronRight}
                size={iconSizes.extraSmallIcons}
                color={themeColors.mutedText}
              />
            </View>
          </PressableScale>
          <Separator />
          <PressableScale onPress={handleOpenFiles}>
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
          </PressableScale>
          <Separator />
          <PressableScale onPress={handleOpenForms}>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="doc.on.clipboard" IconComponent={ClipboardList} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('athlete.forms.title')}
                </Text>
              </View>
              <PlatformIcon
                sf="chevron.right"
                IconComponent={ChevronRight}
                size={iconSizes.extraSmallIcons}
                color={themeColors.mutedText}
              />
            </View>
          </PressableScale>
        </Card>
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
  sectionLabel: {
    ...typography.p1,
    marginBottom: 8,
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
  // Coach messages card
  coachMessageCard: {
    marginBottom: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  coachMessageContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 72,
  },
  coachAvatarContainer: {
    width: 72,
  },
  coachAvatarImage: {
    width: 72,
    height: '100%',
  },
  coachAvatarPlaceholder: {
    width: 72,
    height: '100%',
  },
  coachMessageTextContainer: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 10,
  },
  coachMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  coachName: {
    ...typography.h7,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  coachMessageTimestamp: {
    ...typography.p3,
  },
  coachMessageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coachLastMessageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  coachReadReceipt: {
    marginRight: 4,
    marginTop: 2,
  },
  coachLastMessage: {
    ...typography.p3,
    flex: 1,
  },
  coachUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachUnreadCount: {
    ...typography.p6,
    fontWeight: '600',
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
