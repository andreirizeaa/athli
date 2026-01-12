import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, Activity, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getAllMetrics, deleteMetric, duplicateMetric } from '@/services/coach/coach-metric-service';
import { EmptyState } from '@/components/ui/empty-state';

export const MetricsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow, openRowCloseFn } = useLibraryTab();
  const queryClient = useQueryClient();
  const isRowOpen = openRowCloseFn !== null;
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch metrics directly with TanStack Query
  const { data: metrics = [], isLoading, isError } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      console.log('[MetricsTab] Fetching metrics...');
      const data = await getAllMetrics();
      console.log('[MetricsTab] Received metrics:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Filter metrics based on search query
  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) return metrics;
    const lowerQuery = searchQuery.toLowerCase();
    return metrics.filter(metric =>
      metric.name.toLowerCase().includes(lowerQuery) ||
      metric.unit?.toLowerCase().includes(lowerQuery) ||
      metric.description?.toLowerCase().includes(lowerQuery)
    );
  }, [metrics, searchQuery]);

  console.log('[MetricsTab] Render:', {
    isAuthenticated,
    isLoading,
    isError,
    totalMetrics: metrics.length,
    filteredMetrics: filteredMetrics.length,
    searchQuery
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMetric(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['metrics'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateMetric(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['metrics'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDuplicating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  const handleMetricPress = (item: typeof filteredMetrics[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-metric-modal',
      params: {
        editingId: item.id,
        name: item.name,
        unit: item.unit,
        description: item.description,
        schedule_config: item.schedule_config ? JSON.stringify(item.schedule_config) : undefined,
      },
    });
  };

  const handleAssign = (item: typeof filteredMetrics[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=metric&itemIds=${item.id}`);
  };

  // Prefetch clients when long press happens to make modal open instantly
  const handleLongPress = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        const { getClients } = await import('@/services/coach/coach-client-service');
        return getClients();
      },
    });
  }, [queryClient]);

  const renderItem = useCallback(({ item, index }: { item: typeof filteredMetrics[0]; index: number }) => {
    const isLastItem = index === filteredMetrics.length - 1;

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: `${t('general.delete')} Metric`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(item.id),
      }
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(item.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={`${t('general.delete')} ${item.name}?`}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <PressableOpacity
              style={styles.rowWrapper}
              onPress={() => handleMetricPress(item)}
            >
              <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                <View style={styles.iconContainer}>
                  <PlatformIcon
                    sf="chart.bar.fill"
                    IconComponent={Activity}
                    size={24}
                    color={themeColors.text}
                  />
                </View>
                <View style={styles.textContent}>
                  <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                      {item.unit}
                    </Text>
                    {item.description && (
                      <>
                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
              </View>
            </PressableOpacity>
          </ContextMenuWrapper>
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
  }, [filteredMetrics.length, themeColors, t, deleteMutation, registerOpenRow, handleMetricPress, handleAssign]);

  return (
    <FlashList
      data={filteredMetrics}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          message={t('library.empty.metrics')}
        />
      }
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    // No, workouts-tab didn't use rounded cards for rows, it used separators.
    // "rows like the ... workouts-tab". Workouts tab has separators. Usually that implies edge-to-edge or consistent padding.
    // Looking at workouts-tab styles: rowContent has paddingHorizontal 16. The container has NO padding. The separation line has paddingLeft 72.
    // The previous sections-tab (my update) used styled container. 
    // If workouts-tab is the reference, let me check workouts-tab styles again.
    // WorkoutsTab styles: container: { flex: 1 }, rowContent: { paddingHorizontal: 16, ... }, separatorContainer: { paddingLeft: 72, paddingRight: 16 }.
    // So the list itself is NOT padded.
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...typography.p2,
    marginTop: 12,
  },
  errorText: {
    ...typography.p2,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
