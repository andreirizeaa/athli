import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Activity, ClipboardCheck, BarChart3, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';

export default function MetricsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get metrics from store (already loaded by parent screen)
  const metrics = useClientDetailStore((state) => state.metrics);
  const isLoadingMetrics = useClientDetailStore((state) => state.isLoadingMetrics);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignMetric = () => {
    router.push(`/modals/client/assign-metric-to-client-modal?clientId=${id}` as any);
  };

  const handleAddMetric = () => {
    router.push(`/modals/library/add-metric-modal?clientId=${id}` as any);
  };

  const handleLogMetric = () => {
    router.push(`/modals/client/log-metric-for-client-modal?clientId=${id}` as any);
  };

  const handleMetricPress = (metricId: string) => {
    router.push(`/client/${id}/metric-detail?metricId=${metricId}` as any);
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
        /* Metrics list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {metrics.map((metric, index) => {
            const isLastItem = index === metrics.length - 1;
            return (
              <View key={metric.id || metric.assignment_id}>
                <PressableScale onPress={() => handleMetricPress(metric.assignment_id || metric.id)}>
                  <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                    <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                      <PlatformIcon
                        sf="chart.bar.fill"
                        IconComponent={Activity}
                        size={24}
                        color={themeColors.text}
                      />
                    </View>
                    <View style={styles.textContent}>
                      <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                        {metric.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                          {metric.unit}
                        </Text>
                        {metric.description && (
                          <>
                            <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                            <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                              {metric.description}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                  </View>
                </PressableScale>
                {!isLastItem && (
                  <View style={styles.separatorContainer}>
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                      ]}
                    />
                  </View>
                )}
                {isLastItem && <View style={{ height: 24 }} />}
              </View>
            );
          })}
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
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.p3,
  },
  metaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
