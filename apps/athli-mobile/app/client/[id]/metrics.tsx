import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Activity, ClipboardCheck, BarChart3 } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';

export default function MetricsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get metrics from store (already loaded by parent screen)
  const metrics = useClientDetailStore((state) => state.metrics);
  const isLoadingMetrics = useClientDetailStore((state) => state.isLoadingMetrics);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignMetric = () => {
    router.push(`/modals/shared/assign-to-clients-modal?type=metric&clientId=${id}`);
  };

  const handleAddMetric = () => {
    router.push(`/modals/library/add-metric-modal?clientId=${id}`);
  };

  const handleLogMetric = () => {
    router.push(`/modals/client/log-metric-for-client-modal?clientId=${id}`);
  };

  const handleMetricPress = (metricId: string) => {
    router.push(`/modals/client/metric-detail-modal?clientId=${id}&metricId=${metricId}`);
  };

  const handleRefresh = async () => {
    await refreshSection('metrics');
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.metrics')}
        </Text>
        <DropdownMenuWrapper
          options={[
            {
              label: t('clientDetail.actions.assignMetric'),
              icon: { sf: 'checklist', IconComponent: ClipboardCheck },
              onPress: handleAssignMetric,
            },
            {
              label: t('clientDetail.actions.addMetric'),
              icon: { sf: 'plus', IconComponent: Plus },
              onPress: handleAddMetric,
            },
            {
              label: t('clientDetail.actions.logMetric'),
              icon: { sf: 'chart.bar', IconComponent: Activity },
              onPress: handleLogMetric,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>

      {/* Loading state */}
      {isLoadingMetrics && metrics.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : metrics.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <PlatformIcon
            sf="chart.bar"
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
        /* Metrics list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {metrics.map((metric) => (
            <View key={metric.id || metric.assignment_id}>
              <PressableScale onPress={() => handleMetricPress(metric.id || metric.assignment_id)}>
                <View style={styles.metricItem}>
                  <View style={styles.metricIconContainer}>
                    <PlatformIcon
                      sf="chart.bar"
                      IconComponent={BarChart3}
                      size={24}
                      color={themeColors.primary}
                    />
                  </View>
                  <View style={styles.metricInfo}>
                    <Text style={[styles.metricName, { color: themeColors.text }]}>
                      {metric.name}
                    </Text>
                    {metric.description && (
                      <Text
                        style={[styles.metricDescription, { color: themeColors.mutedText }]}
                        numberOfLines={1}
                      >
                        {metric.description}
                      </Text>
                    )}
                    <Text style={[styles.metricUnit, { color: themeColors.mutedText }]}>
                      {metric.unit}
                    </Text>
                  </View>
                  {/* Latest value if available */}
                  {metric.logs && metric.logs.length > 0 && (
                    <View style={styles.metricValue}>
                      <Text style={[styles.metricValueText, { color: themeColors.primary }]}>
                        {metric.logs[metric.logs.length - 1].value}
                      </Text>
                      <Text style={[styles.metricValueUnit, { color: themeColors.mutedText }]}>
                        {metric.unit}
                      </Text>
                    </View>
                  )}
                </View>
              </PressableScale>
              <Separator />
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
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
    paddingVertical: 60,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  metricIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  metricInfo: {
    flex: 1,
    gap: 2,
  },
  metricName: {
    ...typography.p1,
    fontWeight: '500',
  },
  metricDescription: {
    ...typography.p3,
  },
  metricUnit: {
    ...typography.p3,
    fontWeight: '500',
  },
  metricValue: {
    alignItems: 'flex-end',
  },
  metricValueText: {
    ...typography.h5,
    fontWeight: '600',
  },
  metricValueUnit: {
    ...typography.p3,
  },
});
