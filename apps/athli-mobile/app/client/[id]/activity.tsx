import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle, Activity } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { createNewChat } from '@/services/chats-service';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';

export default function ClientActivityScreen() {
  const router = useRouter();
  const { id, fromChat } = useLocalSearchParams<{ id: string; fromChat?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const iconColor = themeColors.text;
  const isFromChat = fromChat === 'true';

  // Get training calendar from store
  const trainingCalendar = useClientDetailStore((state) => state.trainingCalendar);
  const isLoadingTraining = useClientDetailStore((state) => state.isLoadingTraining);
  const client = useClientDetailStore((state) => state.client);
  const clientId = useClientDetailStore((state) => state.clientId);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Loading state for message button
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Load client data if not already loaded
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // Calculate activity stats from training calendar
  const activityStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate date ranges
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    let lastActivityDate: Date | null = null;
    let pastWeekCompleted = 0;
    let pastMonthCompleted = 0;
    let nextWeekPlanned = 0;

    // Iterate through training calendar
    Object.entries(trainingCalendar || {}).forEach(([dateStr, workouts]) => {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
        // Check for completed workouts
        if (workout.day_status === 'completed' || workout.day_status === 'in_progress') {
          // Update last activity
          if (!lastActivityDate || date > (lastActivityDate as Date)) {
            lastActivityDate = date;
          }

          // Past week completed
          if (date >= oneWeekAgo && date <= today) {
            pastWeekCompleted++;
          }

          // Past month completed
          if (date >= oneMonthAgo && date <= today) {
            pastMonthCompleted++;
          }
        }

        // Future workouts for next week
        if (date > today && date <= oneWeekFromNow) {
          nextWeekPlanned++;
        }
      });
    });

    // Calculate last activity text
    let lastActivityText = t('clientDetail.overview.noActivity');
    if (lastActivityDate) {
      const activityDate = lastActivityDate as Date;
      const diffTime = today.getTime() - activityDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        lastActivityText = t('clientDetail.overview.today');
      } else if (diffDays === 1) {
        lastActivityText = t('clientDetail.overview.yesterday');
      } else if (diffDays < 7) {
        lastActivityText = t('clientDetail.overview.daysAgo', { count: diffDays });
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        lastActivityText = t('clientDetail.overview.weeksAgo', { count: weeks });
      } else {
        const months = Math.floor(diffDays / 30);
        lastActivityText = t('clientDetail.overview.monthsAgo', { count: months });
      }
    }

    return {
      lastActivity: lastActivityText,
      pastWeek: pastWeekCompleted,
      pastMonth: pastMonthCompleted,
      nextWeek: nextWeekPlanned,
    };
  }, [trainingCalendar, t]);

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleMessagePress = async () => {
    if (isLoadingChat || !id) return;

    haptics.medium();
    setIsLoadingChat(true);

    try {
      const chat = await createNewChat(id, {
        clientName: client?.name,
        clientAvatar: client?.avatarUrl ?? undefined,
      });

      router.push({
        pathname: '/chats/[id]',
        params: {
          id: chat.id,
          chat: JSON.stringify(chat),
        },
      });
    } catch (error) {
      console.error('[ClientActivity] Error loading chat:', error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  return (
    <ScreenWrapper scrollable={true}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.overview.activity')}
        </Text>
        {isFromChat ? (
          <View style={styles.headerPlaceholder} />
        ) : (
          <IconButton
            icon={{ sf: 'bubble.left', IconComponent: MessageCircle }}
            onPress={handleMessagePress}
            size="md"
            color={iconColor}
            loading={isLoadingChat}
          />
        )}
      </View>

      {/* Activity Stats Card */}
      {isLoadingTraining ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <Card style={styles.activityCard}>
            <View style={styles.cardContentNoPadding}>
              <View style={styles.rowItemStatic}>
                <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                  {t('clientDetail.overview.lastActivity')}
                </Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {activityStats.lastActivity}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />
              <View style={styles.rowItemStatic}>
                <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                  {t('clientDetail.overview.pastWeek')}
                </Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {activityStats.pastWeek} {t('clientDetail.overview.completed')}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />
              <View style={styles.rowItemStatic}>
                <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                  {t('clientDetail.overview.pastMonth')}
                </Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {activityStats.pastMonth} {t('clientDetail.overview.completed')}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />
              <View style={styles.rowItemStatic}>
                <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                  {t('clientDetail.overview.nextWeek')}
                </Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {activityStats.nextWeek} {t('clientDetail.overview.planned')}
                </Text>
              </View>
              {client && (
                <>
                  <Separator style={styles.rowSeparator} />
                  <View style={styles.rowItemStatic}>
                    <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                      {t('clientDetail.overview.clientFor')}
                    </Text>
                    <Text style={[styles.rowValue, { color: themeColors.text }]}>
                      {client.clientFor + 1} {t('clientDetail.overview.days')}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Card>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  content: {
    padding: 16,
  },
  activityCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  cardContentNoPadding: {
    paddingVertical: 4,
  },
  rowItemStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    ...typography.p2,
  },
  rowValue: {
    ...typography.p2,
    fontWeight: '600',
  },
  rowSeparator: {
    marginHorizontal: 16,
  },
});
