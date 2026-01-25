import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
import { Image as ImageIcon, ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useAuth, useClientDetailStore } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { ChartCardCarousel, type ChartCardItem } from '@/components/ui/chart-card-carousel';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { haptics } from '@/utils/haptics';
import { getMyMetrics, type ClientMetric } from '@/services/client/client-metric-service';
import { getMyHabits, getMyHabitStreaks, type ClientHabit } from '@/services/client/client-habit-service';

export default function ProgressScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { clientProfile } = useAuth();

  // State
  const [metrics, setMetrics] = useState<ClientMetric[]>([]);
  const [habits, setHabits] = useState<ClientHabit[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Store setters for athlete self-access
  const setStoreMetrics = useClientDetailStore((state) => state.setMetrics);
  const setStoreHabits = useClientDetailStore((state) => state.setHabits);
  const setStoreClientId = useClientDetailStore((state) => state.setClientId);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!clientProfile) {
        setIsLoading(false);
        return;
      }

      try {
        // Set client ID in store for detail pages
        setStoreClientId(clientProfile.client_id);

        // Fetch athlete's own metrics and habits using self-access endpoints
        const [metricsData, habitsData] = await Promise.all([
          getMyMetrics(),
          getMyHabits(),
        ]);

        // Update local state
        setMetrics(metricsData);
        setHabits(habitsData);

        // Also update the store so detail pages can access the data
        setStoreMetrics(metricsData);
        setStoreHabits(habitsData);

        // Fetch streaks for each habit
        const streaksMap: Record<string, number> = {};
        await Promise.all(
          habitsData.map(async (habit) => {
            try {
              const streaks = await getMyHabitStreaks(habit.assignment_id);
              streaksMap[habit.assignment_id] = streaks.current_streak;
            } catch {
              streaksMap[habit.assignment_id] = 0;
            }
          })
        );
        setHabitStreaks(streaksMap);
      } catch (error) {
        console.error('[ProgressScreen] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientProfile, setStoreMetrics, setStoreHabits, setStoreClientId]);

  // Transform metrics to chart items (include all, filtering happens per-card)
  const metricsWithChartData = useMemo((): ChartCardItem[] => {
    return metrics.map((m) => {
      // Sort logs by date ascending
      const sortedLogs = [...(m.logs || [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate delta (percentage change from first to last value)
      let delta: { value: number; isUp: boolean } | undefined;
      if (sortedLogs.length >= 2) {
        const firstValue = sortedLogs[0].value;
        const lastValue = sortedLogs[sortedLogs.length - 1].value;
        if (firstValue !== 0) {
          const diff = lastValue - firstValue;
          const percentage = Math.abs((diff / firstValue) * 100);
          delta = { value: percentage, isUp: diff > 0 };
        }
      }

      return {
        id: m.assignment_id,
        name: m.name,
        type: 'metric' as const,
        unit: m.unit,
        logs: sortedLogs.map((log) => ({ value: log.value, date: log.date })),
        delta,
      };
    });
  }, [metrics]);

  // Transform habits to chart items (include all, filtering happens per-card)
  const habitsWithChartData = useMemo((): ChartCardItem[] => {
    return habits.map((h) => {
      // Sort logs by date ascending, filter to only logs with value
      const sortedLogs = [...(h.logs || [])]
        .filter((log) => log.value !== undefined && log.value !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get target value from habit
      const targetValue = h.amount ?? h.schedule_config?.amount;

      // Get streak from API (or 0 if not yet fetched)
      const streak = habitStreaks[h.assignment_id] ?? 0;

      return {
        id: h.assignment_id,
        name: h.name,
        type: 'habit' as const,
        unit: h.unit ?? h.schedule_config?.unit,
        targetValue,
        logs: sortedLogs.map((log) => ({ value: log.value!, date: log.date })),
        streak,
      };
    });
  }, [habits, habitStreaks]);

  // Handlers
  const handleMetricsPageChange = useCallback((index: number) => {
    // Could be used for analytics or other tracking
  }, []);

  const handleHabitsPageChange = useCallback((index: number) => {
    // Could be used for analytics or other tracking
  }, []);

  const handleMetricPress = useCallback(
    (item: ChartCardItem) => {
      if (!clientProfile) return;
      router.push({
        pathname: '/client/[id]/metric-detail',
        params: { id: clientProfile.client_id, metricId: item.id },
      });
    },
    [clientProfile, router]
  );

  const handleHabitPress = useCallback(
    (item: ChartCardItem) => {
      if (!clientProfile) return;
      router.push({
        pathname: '/client/[id]/habit-detail',
        params: { id: clientProfile.client_id, habitId: item.id },
      });
    },
    [clientProfile, router]
  );

  const handlePhotosPress = useCallback(() => {
    if (!clientProfile) return;
    haptics.medium();
    router.push({
      pathname: '/client/[id]/photos',
      params: { id: clientProfile.client_id },
    });
  }, [clientProfile, router]);

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  const hasNoData = metricsWithChartData.length === 0 && habitsWithChartData.length === 0;

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('progress.title')}</Text>

        {hasNoData ? (
          <>
            <View style={styles.fullEmptyState}>
              <Text style={[styles.fullEmptyText, { color: themeColors.mutedText }]}>
                {t('progress.noData')}
              </Text>
            </View>

            {/* Progress Photos Card - always visible */}
            <View style={[styles.photosSection, styles.lastSection]}>
              <PressableScale onPress={handlePhotosPress}>
                <Card>
                  <View style={styles.photosCardRow}>
                    <View style={styles.photosCardIcon}>
                      <PlatformIcon
                        sf="photo"
                        IconComponent={ImageIcon}
                        size={iconSizes.tabBarIcons}
                        color={themeColors.text}
                      />
                    </View>
                    <Text style={[styles.photosCardText, { color: themeColors.text }]}>
                      {t('progress.photos')}
                    </Text>
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
          </>
        ) : (
          <>
            {/* Metrics Section */}
            {metricsWithChartData.length > 0 && (
              <View style={styles.section}>
                <ChartCardCarousel
                  items={metricsWithChartData}
                  onPageChange={handleMetricsPageChange}
                  onItemPress={handleMetricPress}
                />
              </View>
            )}

            {/* Habits Section */}
            {habitsWithChartData.length > 0 && (
              <View style={styles.section}>
                <ChartCardCarousel
                  items={habitsWithChartData}
                  onPageChange={handleHabitsPageChange}
                  onItemPress={handleHabitPress}
                />
              </View>
            )}

            {/* Progress Photos Card */}
            <View style={[styles.photosSection, styles.lastSection]}>
              <PressableScale onPress={handlePhotosPress}>
                <Card>
                  <View style={styles.photosCardRow}>
                    <View style={styles.photosCardIcon}>
                      <PlatformIcon
                        sf="photo"
                        IconComponent={ImageIcon}
                        size={iconSizes.tabBarIcons}
                        color={themeColors.text}
                      />
                    </View>
                    <Text style={[styles.photosCardText, { color: themeColors.text }]}>
                      {t('progress.photos')}
                    </Text>
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
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  photosSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  lastSection: {
    paddingBottom: 100,
  },
  photosCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  photosCardIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  photosCardText: {
    ...typography.p1,
    flex: 1,
  },
  fullEmptyState: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullEmptyText: {
    ...typography.p1,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
