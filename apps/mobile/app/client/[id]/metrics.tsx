import React, { useRef, useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Activity, ClipboardCheck, BarChart3, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { SearchBar } from '@/components/ui/search-bar';
import { removeMetric } from '@/services/client/client-metric-service';
import { haptics } from '@/utils/haptics';

export default function MetricsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get metrics from store (already loaded by parent screen)
  const metrics = useClientDetailStore((state) => state.metrics);
  const isLoadingMetrics = useClientDetailStore((state) => state.isLoadingMetrics);
  const coachId = useClientDetailStore((state) => state.coachId);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  // Filter metrics based on search query
  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) return metrics;
    const query = searchQuery.toLowerCase();
    return metrics.filter((metric) =>
      metric.name.toLowerCase().includes(query) ||
      metric.unit?.toLowerCase().includes(query) ||
      metric.description?.toLowerCase().includes(query)
    );
  }, [metrics, searchQuery]);

  // Track currently open swipeable row
  const openRowCloseRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);
  const isClosingRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowCloseRef.current) {
      isClosingRef.current = true;
      openRowCloseRef.current();
      openRowCloseRef.current = null;
      // Reset after animation completes
      setTimeout(() => {
        isClosingRef.current = false;
      }, 300);
    }
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    // Ignore onOpen calls that happen during close animation
    if (isClosingRef.current) return;

    // Close any previously open row
    if (openRowCloseRef.current && openRowCloseRef.current !== close) {
      openRowCloseRef.current();
    }
    openRowCloseRef.current = close;
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignMetric = () => {
    router.push(`/modals/client/assign-metric-to-client-modal?clientId=${id}` as any);
  };

  const handleAddMetric = () => {
    router.push(`/modals/library/add-metric-modal?clientId=${id}&coachId=${coachId}` as any);
  };

  const handleLogMetric = () => {
    router.push(`/modals/client/log-metric-for-client-modal?clientId=${id}` as any);
  };

  const handleMetricPress = useCallback((metricId: string) => {
    // If a row was just closed, prevent navigation
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    // If a row is open, just close it and prevent navigation
    if (openRowCloseRef.current) {
      closeOpenRow();
      return;
    }
    router.push(`/client/${id}/metric-detail?metricId=${metricId}` as any);
  }, [closeOpenRow, router, id]);

  const handleDeleteMetric = async (metric: typeof metrics[0]) => {
    if (!coachId) return;
    await removeMetric({
      metricIds: [metric.assignment_id],
      clientId: id,
      coachId,
    });
    haptics.success();
    refreshSection('metrics');
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
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

        <Pressable
          style={styles.contentContainer}
          onPressIn={() => {
            if (openRowCloseRef.current) {
              hadOpenRowRef.current = true;
              closeOpenRow();
            } else {
              hadOpenRowRef.current = false;
            }
          }}
        >
          {/* Loading state */}
          {isLoadingMetrics && metrics.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : filteredMetrics.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyContainer}>
              <PlatformIcon
                sf="chart.bar.fill"
                IconComponent={BarChart3}
                size={48}
                color={themeColors.mutedText}
              />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {searchQuery.trim()
                  ? t('general.noResults')
                  : t('clientDetail.metrics.emptyTitle')}
              </Text>
              {!searchQuery.trim() && (
                <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                  {t('clientDetail.metrics.emptyDescription')}
                </Text>
              )}
            </View>
          ) : (
            /* Metrics list */
            <View>
              {filteredMetrics.map((metric, index) => {
                const isLastItem = index === filteredMetrics.length - 1;
                return (
                  <View key={metric.id || metric.assignment_id}>
                    <SwipeableRow
                      onDelete={() => handleDeleteMetric(metric)}
                      deleteConfirmTitle={t('general.deleteMetric')}
                      onOpen={handleRowOpen}
                    >
                      <PressableScale onPress={() => handleMetricPress(metric.assignment_id || metric.id)}>
                        <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                          <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                            <PlatformIcon
                              sf="chart.bar.fill"
                              IconComponent={Activity}
                              size={24}
                              color={themeColors.text}
                            />
                          </SquircleView>
                          <View style={styles.textContent}>
                            <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                              {metric.name}
                            </Text>
                            <View style={styles.metaRow}>
                              {metric.unit && (
                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                  <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                    {metric.unit}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                        </View>
                      </PressableScale>
                    </SwipeableRow>
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
            </View>
          )}
        </Pressable>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentContainer: {
    flex: 1,
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
    gap: 8,
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
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
