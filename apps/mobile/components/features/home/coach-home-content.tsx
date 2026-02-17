import React, { useMemo, useState, useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { PressableOpacity, PressableScale } from 'pressto';
import { ChevronRight, Sparkles, ListTodo, ClipboardList, Bell } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useAuth } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { DailyWorkoutsCard } from '@/components/features/home/daily-workouts-card';
import { AtRiskClientsCard } from '@/components/features/home/at-risk-clients-card';
import { useCoachOwnTodos, useCoachAutoTodos } from '@/hooks/useCoachTodo';
import { useCheckInReviews } from '@/hooks/useCheckInReviews';
import { useCoachNotifications } from '@/hooks/useCoachNotifications';
import { haptics } from '@/utils/haptics';

// AI Assistant Card for coach view
const AIAssistantCard = () => {
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();

  const handlePress = () => {
    router.push('/assistant');
  };

  const renderSparklesIcon = () => {
    if (Platform.OS === 'ios') {
      return <SymbolView name="sparkles" tintColor={primaryColor} size={iconSizes.tabBarIcons} type="monochrome" />;
    }
    return <Sparkles {...({ size: iconSizes.tabBarIcons, color: primaryColor } as any)} />;
  };

  return (
    <PressableOpacity onPress={handlePress}>
      <Card>
        <View style={styles.assistantCardContent}>
          <View style={styles.assistantCardIconContainer}>
            {renderSparklesIcon()}
          </View>
          <View style={styles.assistantCardInfo}>
            <Text style={[styles.assistantCardTitle, { color: themeColors.text }]}>
              {t('clientDetail.assistant.helpTitle')}
            </Text>
            <Text style={[styles.assistantCardSubtitle, { color: themeColors.mutedText }]}>
              {t('clientDetail.assistant.emptyState')}
            </Text>
          </View>
          <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
        </View>
      </Card>
    </PressableOpacity>
  );
};

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

export const CoachHomeContent = () => {
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const { coachProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Use refetchQueries instead of invalidateQueries to avoid triggering loading states
      await queryClient.refetchQueries();
      haptics.success();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  // Fetch todos and check-in reviews counts
  const { ownTodos } = useCoachOwnTodos();
  const { autoTodos } = useCoachAutoTodos();
  const { reviewCount } = useCheckInReviews();
  const { unreadCount: notificationUnreadCount } = useCoachNotifications();

  const totalTodos = ownTodos.length + autoTodos.length;

  const handleNotificationsPress = () => {
    router.push('/notifications');
  };

  const greeting = useMemo(() => {
    if (coachProfile?.name) {
      const firstName = coachProfile.name.split(' ')[0];
      return `Hey ${firstName}`;
    }
    return t('home.title');
  }, [coachProfile, t]);

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

  return (
    <ScreenWrapper scrollable tabScreen refreshing={isRefreshing} onRefresh={handleRefresh}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
          <View style={styles.headerButtonContainer}>
            <IconButton
              icon={{ sf: 'bell', IconComponent: Bell }}
              onPress={handleNotificationsPress}
              size="md"
              color={themeColors.text}
            />
            {notificationUnreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.badgeText}>
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.subtitle, { color: themeColors.mutedText }]}>{dateSubtitle}</Text>
      </View>
      <View style={styles.cardsContainer}>
        <AIAssistantCard />

        {/* Two column row */}
        <View style={styles.twoColumnRow}>
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: themeColors.mutedText }]}>
              {t('todos.title')}
            </Text>
            <PressableScale onPress={() => router.push('/todos')}>
              <Card style={styles.squareCard}>
                <View style={styles.squareCardContent}>
                  {totalTodos > 0 ? (
                    <>
                      <Text style={[styles.squareCardNumber, { color: themeColors.text }]}>
                        {totalTodos}
                      </Text>
                      <Text style={[styles.squareCardSubtitle, { color: themeColors.mutedText }]}>
                        {t('todos.outstanding')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.squareCardIcon}>
                        {Platform.OS === 'ios' ? (
                          <SymbolView name="checklist" tintColor={primaryColor} size={28} type="monochrome" />
                        ) : (
                          <ListTodo {...({ size: 28, color: primaryColor } as any)} />
                        )}
                      </View>
                      <Text style={[styles.squareCardEmpty, { color: themeColors.text }]}>
                        {t('todos.allCaughtUp')}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </PressableScale>
          </View>
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: themeColors.mutedText }]}>
              {t('checkIns.title')}
            </Text>
            <PressableScale onPress={() => router.push('/check-ins')}>
              <Card style={styles.squareCard}>
                <View style={styles.squareCardContent}>
                  {reviewCount > 0 ? (
                    <>
                      <Text style={[styles.squareCardNumber, { color: themeColors.text }]}>
                        {reviewCount}
                      </Text>
                      <Text style={[styles.squareCardSubtitle, { color: themeColors.mutedText }]}>
                        {t('checkIns.awaitingReview')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.squareCardIcon}>
                        {Platform.OS === 'ios' ? (
                          <SymbolView name="list.clipboard" tintColor={primaryColor} size={28} type="monochrome" />
                        ) : (
                          <ClipboardList {...({ size: 28, color: primaryColor } as any)} />
                        )}
                      </View>
                      <Text style={[styles.squareCardEmpty, { color: themeColors.text }]}>
                        {t('checkIns.noReviewsNeeded')}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            </PressableScale>
          </View>
        </View>

        <DailyWorkoutsCard />
        <AtRiskClientsCard />
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
  titleRow: {
    position: 'relative',
    marginBottom: 4,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingRight: 52,
  },
  headerButtonContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -22 }],
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.h5,
    fontWeight: '400',
    marginTop: 4,
  },
  cardsContainer: {
    paddingHorizontal: 16,
  },
  assistantCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  assistantCardIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assistantCardInfo: {
    flex: 1,
  },
  assistantCardTitle: {
    ...typography.h5,
    marginBottom: 4,
  },
  assistantCardSubtitle: {
    ...typography.p3,
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
});
