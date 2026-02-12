import React, { useMemo, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';
import { ChevronLeft, BarChart3 } from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SearchBar } from '@/components/ui/search-bar';
import { ValueLineChart } from '@/components/ui/value-line-chart';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';

export default function AllMetricsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const { id } = useLocalSearchParams<{ id: string }>();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get metrics from store
  const metrics = useClientDetailStore((state) => state.metrics);
  const isLoadingMetrics = useClientDetailStore((state) => state.isLoadingMetrics);
  const clientId = useClientDetailStore((state) => state.clientId);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Load client data if navigating directly to this screen
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // Filter metrics that have logs and match search
  const metricsWithData = useMemo(() => {
    const withData = metrics.filter((m) => m.logs && m.logs.length > 0);
    if (!searchQuery.trim()) return withData;
    const query = searchQuery.toLowerCase();
    return withData.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      m.unit?.toLowerCase().includes(query)
    );
  }, [metrics, searchQuery]);

  const handleBackPress = () => {
    router.back();
  };

  const handleMetricPress = (metricId: string) => {
    router.push(`/client/${id}/metric-detail?metricId=${metricId}` as any);
  };

  // Calculate movement for a metric
  const getMovement = (logs: { value: number; date: string }[]) => {
    if (!logs || logs.length < 2) return null;
    const sorted = [...logs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstValue = sorted[0].value;
    const currentValue = sorted[sorted.length - 1].value;
    const diff = currentValue - firstValue;
    const percentage = firstValue !== 0 ? ((diff / firstValue) * 100) : 0;
    return {
      value: Math.abs(percentage),
      isUp: diff > 0,
    };
  };

  // Prepare chart data for a metric
  const getChartData = (logs: { value: number; date: string }[]) => {
    if (!logs || logs.length === 0) return [];
    const sorted = [...logs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.map((log) => ({
      value: log.value,
      date: log.date,
    }));
  };

  if (isLoadingMetrics && metrics.length === 0) {
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
            {t('clientDetail.sections.allMetrics')}
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

        {metricsWithData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PlatformIcon
              sf="chart.bar.fill"
              IconComponent={BarChart3}
              size={48}
              color={themeColors.mutedText}
            />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              {t('clientDetail.metrics.emptyTitle')}
            </Text>
            <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
              {t('clientDetail.metrics.emptyDescription')}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {metricsWithData.map((metric) => {
              const chartData = getChartData(metric.logs || []);
              const movement = getMovement(metric.logs || []);

              return (
                <PressableScale
                  key={metric.id || metric.assignment_id}
                  onPress={() => handleMetricPress(metric.assignment_id || metric.id)}
                  style={styles.cardWrapper}
                >
                  <ValueLineChart
                    data={chartData}
                    name={metric.name}
                    delta={movement && movement.value !== 0 ? movement : undefined}
                    renderFooter={() => (
                      <View style={styles.footerWrapper}>
                        <View style={[styles.footerDivider, { backgroundColor: themeColors.border }]} />
                        <View style={styles.footerRow}>
                          <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                            <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                              {metric.logs?.length || 0} {t('general.logs')}
                            </Text>
                          </View>
                          {metric.unit && (
                            <View style={styles.unitContainer}>
                              <Text style={[styles.unitLabel, { color: themeColors.mutedText }]}>
                                {t('general.unit')}
                              </Text>
                              <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                  {metric.unit}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  />
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
          {t('clientDetail.sections.allMetrics')}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  unitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitLabel: {
    ...typography.p4,
  },
});
