import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, Activity, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab, useLibraryStore } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useModalCallbacks } from '@/stores';
import { deleteMetric, duplicateMetric } from '@/services/coach/coach-metric-service';
import { EmptyState } from '@/components/ui/empty-state';

const noMetricsAvatar = require('@/assets/avatars/no-metrics-avatar.png');

export const MetricsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();

  // Get metrics from Zustand store
  const getFilteredMetrics = useLibraryStore((state) => state.getFilteredMetrics);
  const filteredMetrics = useMemo(
    () => getFilteredMetrics(searchQuery),
    [getFilteredMetrics, searchQuery]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
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
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-metric-modal',
      params: {
        editingId: item.id,
        name: item.name,
        unit: item.unit,
        description: item.description,
      },
    });
  };

  const { setClientsSelectCallback } = useModalCallbacks();

  const handleAssign = (item: typeof filteredMetrics[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.name} to clients:`, selectedClients.map(c => c.name));
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

  const handleDelete = useCallback((item: typeof filteredMetrics[0]) => {
    Alert.alert(
      `${t('general.delete')} ${item.name}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id)
        },
      ]
    );
  }, [deleteMutation, t]);

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredMetrics.length === 0 && (
        <EmptyState
          image={noMetricsAvatar}
          message={t('library.empty.metrics')}
        />
      )}

      {/* Metrics List */}
      {filteredMetrics.map((item, index) => {
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
            onPress: () => handleDelete(item),
          }
        ];

        return (
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => handleDelete(item)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.name}?`}
            >
              <ContextMenuWrapper options={dropdownOptions}>
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
      })}
    </View>
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
    paddingVertical: 12,
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
    width: 44,
    height: 44,
    borderRadius: 12,
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
    paddingLeft: 72,
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
