import React, { useMemo, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SearchBar } from '@/components/ui/search-bar';
import { ValueLineChart } from '@/components/ui/value-line-chart';
import { TargetLineChart } from '@/components/ui/target-line-chart';
import { PlatformIcon } from '@/components/ui/platform-icon';

export default function AllHabitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const { id } = useLocalSearchParams<{ id: string }>();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get habits from store
  const habits = useClientDetailStore((state) => state.habits);
  const isLoadingHabits = useClientDetailStore((state) => state.isLoadingHabits);
  const clientId = useClientDetailStore((state) => state.clientId);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Load client data if navigating directly to this screen
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // Filter habits that have logs and match search
  const habitsWithData = useMemo(() => {
    const withData = habits.filter((h) => h.logs && h.logs.length > 0);
    if (!searchQuery.trim()) return withData;
    const query = searchQuery.toLowerCase();
    return withData.filter((h) => h.name.toLowerCase().includes(query));
  }, [habits, searchQuery]);

  const handleBackPress = () => {
    router.back();
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/client/${id}/habit-detail?habitId=${habitId}` as any);
  };

  // Calculate movement for a habit
  const getMovement = (logs: { value?: number; date: string }[]) => {
    const logsWithValues = logs.filter((log) => log.value !== undefined && log.value !== null);
    if (logsWithValues.length < 2) return null;
    const sorted = [...logsWithValues].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstValue = sorted[0].value ?? 0;
    const currentValue = sorted[sorted.length - 1].value ?? 0;
    const diff = currentValue - firstValue;
    const percentage = firstValue !== 0 ? ((diff / firstValue) * 100) : 0;
    return {
      value: Math.abs(percentage),
      isUp: diff > 0,
    };
  };

  // Prepare chart data for a habit
  const getChartData = (logs: { value?: number; date: string }[]) => {
    if (!logs || logs.length === 0) return [];
    const sorted = [...logs]
      .filter((log) => log.value !== undefined && log.value !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map((log) => ({
      value: log.value ?? 0,
      date: log.date,
    }));
  };

  if (isLoadingHabits && habits.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top + HEADER_HEIGHT }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />
        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.sections.allHabits')}
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        {habitsWithData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PlatformIcon
              sf="checkmark.circle.fill"
              IconComponent={CheckCircle}
              size={48}
              color={themeColors.mutedText}
            />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              {t('clientDetail.habits.emptyTitle')}
            </Text>
            <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
              {t('clientDetail.habits.emptyDescription')}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {habitsWithData.map((habit) => {
              const chartData = getChartData(habit.logs || []);
              const movement = getMovement(habit.logs || []);
              const hasTarget = habit.amount && chartData.length > 0;

              return (
                <PressableScale
                  key={habit.id || habit.assignment_id}
                  onPress={() => handleHabitPress(habit.assignment_id || habit.id)}
                  style={styles.cardWrapper}
                >
                  {hasTarget ? (
                    <TargetLineChart
                      data={chartData}
                      targetValue={habit.amount!}
                      unit={habit.unit}
                      name={habit.name}
                      renderFooter={() => (
                        <View style={styles.footerWrapper}>
                          <View style={[styles.footerDivider, { backgroundColor: themeColors.border }]} />
                          <View style={styles.footerRow}>
                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                              <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                {habit.logs?.length || 0} {t('general.logs')}
                              </Text>
                            </View>
                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                              <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                {habit.period === 'daily' ? t('general.daily') : t('general.weekly')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    />
                  ) : (
                    <ValueLineChart
                      data={chartData}
                      name={habit.name}
                      delta={movement && movement.value !== 0 ? movement : undefined}
                      renderFooter={() => (
                        <View style={styles.footerWrapper}>
                          <View style={[styles.footerDivider, { backgroundColor: themeColors.border }]} />
                          <View style={styles.footerRow}>
                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                              <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                {habit.logs?.length || 0} {t('general.logs')}
                              </Text>
                            </View>
                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                              <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                {habit.period === 'daily' ? t('general.daily') : t('general.weekly')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    />
                  )}
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.allHabits')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cardsContainer: {
    paddingHorizontal: 0,
    gap: 16,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  footerWrapper: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  footerDivider: {
    height: 1,
    marginHorizontal: -16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    ...typography.p4,
    fontWeight: '500',
  },
});
