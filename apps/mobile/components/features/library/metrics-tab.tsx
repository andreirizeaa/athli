import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Activity, UserPlus, Trash2, Folder, Pencil, ArrowRightLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';
import type { Metric, MetricFolder } from '@athli/shared-types';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore, useEntitlements } from '@/stores';
import { useTranslations } from '@/stores';
import { useTerminology } from '@/hooks/useTerminology';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { useLibraryTabList } from '@/hooks/use-library-tab-list';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getAllMetrics, deleteMetric, duplicateMetric } from '@/services/coach/coach-metric-service';
import { getAllMetricFolders, deleteMetricFolder, moveMetric } from '@/services/coach/coach-metric-folder-service';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput } from '@/components/ui/form-inputs/select-input';
import { UpgradeDialog } from '@/components/permissions/upgrade-dialog';

type ListItem =
  | { type: 'folder'; data: MetricFolder }
  | { type: 'metric'; data: Metric };

export const MetricsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const router = useRouter();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Feature access
  const { hasFeature } = useEntitlements();
  const hasMetricsAccess = hasFeature('habits_metrics');

  // Upgrade dialog state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Error dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Move dialog state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // Fetch metrics directly with TanStack Query
  const { data: metrics = [], refetch } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const data = await getAllMetrics();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['metric-folders'],
    queryFn: getAllMetricFolders,
    enabled: isAuthenticated,
  });

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.metrics',
    refetch,
  });

  // Build combined list: folders first, then unfiled metrics
  const combinedList = useMemo(() => {
    const lowerQuery = searchQuery.trim().toLowerCase();
    const filteredFolders = lowerQuery
      ? folders.filter(f => f.name.toLowerCase().includes(lowerQuery))
      : folders;
    const unfiledMetrics = metrics.filter(m => !m.folder_id);
    const filteredMetrics = lowerQuery
      ? unfiledMetrics.filter(metric =>
          metric.name.toLowerCase().includes(lowerQuery) ||
          metric.unit?.toLowerCase().includes(lowerQuery) ||
          metric.description?.toLowerCase().includes(lowerQuery)
        )
      : unfiledMetrics;

    const items: ListItem[] = [
      ...filteredFolders.map(f => ({ type: 'folder' as const, data: f })),
      ...filteredMetrics.map(m => ({ type: 'metric' as const, data: m })),
    ];
    return items;
  }, [metrics, folders, searchQuery]);

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMetric(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['metrics'] });
      const previousMetrics = queryClient.getQueryData<typeof metrics>(['metrics']);
      queryClient.setQueryData<typeof metrics>(['metrics'], (old) =>
        old?.filter((m) => m.id !== id) ?? []
      );
      return { previousMetrics };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousMetrics) {
        queryClient.setQueryData(['metrics'], context.previousMetrics);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onSuccess: () => {
      haptics.success();
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteMetricFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-folders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
  });

  // Move mutation with optimistic update
  const moveMutation = useMutation({
    mutationFn: ({ metricId, folderId }: { metricId: string; folderId: string | null }) =>
      moveMetric(metricId, folderId),
    onMutate: async ({ metricId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: ['metrics'] });
      const previousMetrics = queryClient.getQueryData<Metric[]>(['metrics']);
      queryClient.setQueryData<Metric[]>(['metrics'], (old) =>
        old?.map(m => m.id === metricId ? { ...m, folder_id: folderId } : m) ?? []
      );
      return { previousMetrics };
    },
    onSuccess: () => {
      haptics.success();
      setShowMoveDialog(false);
      setMovingItemId(null);
      setMoveTargetFolder(null);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousMetrics) {
        queryClient.setQueryData(['metrics'], context.previousMetrics);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorSaving'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metric-folders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-in-folder'] });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateMetric(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['metrics'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDuplicating'));
      setShowErrorDialog(true);
    },
  });

  const handleMetricPress = (item: Metric) => {
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

  const handleAssign = (item: Metric) => {
    if (isRowOpen) {
      closeOpenRow();
      return;
    }
    if (!hasMetricsAccess) {
      setShowUpgradeDialog(true);
      return;
    }
    router.push(`/modals/shared/assign-to-clients-modal?type=metric&itemIds=${item.id}`);
  };

  const handleMove = (itemId: string) => {
    setMovingItemId(itemId);
    setMoveTargetFolder(null);
    setShowMoveDialog(true);
  };

  const handleConfirmMove = () => {
    if (!movingItemId) return;
    const folderId = moveTargetFolder === '__home__' ? null : moveTargetFolder;
    moveMutation.mutate({ metricId: movingItemId, folderId });
  };

  const handleFolderPress = (folder: MetricFolder) => {
    if (isRowOpen) {
      closeOpenRow();
      return;
    }
    router.push(`/library/metric-folder/${folder.id}` as any);
  };

  const handleEditFolder = (folder: MetricFolder) => {
    router.push({
      pathname: '/modals/library/create-folder-modal',
      params: { type: 'metrics', editingId: folder.id, name: folder.name },
    } as any);
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

  const moveOptions = useMemo(() => [
    { value: '__home__' as string, label: 'Home (No folder)' },
    ...folders.map(f => ({ value: f.id, label: f.name })),
  ], [folders]);

  const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    const isLastItem = index === combinedList.length - 1;

    if (item.type === 'folder') {
      const folder = item.data;
      const itemCount = metrics.filter(m => m.folder_id === folder.id).length;
      const countLabel = itemCount === 0 ? 'Empty' : itemCount === 1 ? '1 metric' : `${itemCount} metrics`;
      const folderOptions: DropdownMenuOption[] = [
        {
          label: 'Edit Folder',
          icon: { sf: 'pencil', IconComponent: Pencil },
          onPress: () => handleEditFolder(folder),
        },
        {
          label: 'Delete Folder',
          icon: { sf: 'trash', IconComponent: Trash2 },
          destructive: true,
          onPress: () => deleteFolderMutation.mutateAsync(folder.id),
        },
      ];

      return (
        <View>
          <ContextMenuWrapper options={folderOptions}>
            <PressableScale
              style={styles.rowWrapper}
              onPress={() => handleFolderPress(folder)}
            >
              <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
                <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                  <Folder {...({ size: 24, color: themeColors.text } as any)} />
                </SquircleView>
                <View style={styles.textContent}>
                  <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                    {folder.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                      <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                        Folder
                      </Text>
                    </View>
                    <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                      <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                        {countLabel}
                      </Text>
                    </View>
                  </View>
                </View>
                <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
              </View>
            </PressableScale>
          </ContextMenuWrapper>

          {!isLastItem && (
            <View style={styles.separatorContainer}>
              <View
                style={[styles.separator, { backgroundColor: themeColors.mutedText, opacity: 0.2 }]}
              />
            </View>
          )}
          {isLastItem && <View style={{ height: 24 }} />}
        </View>
      );
    }

    // Metric row
    const metric = item.data;
    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: terminology.assignToPlural,
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(metric),
      },
      ...(folders.length > 0 ? [{
        label: 'Move to Folder',
        icon: { sf: 'folder', IconComponent: ArrowRightLeft },
        onPress: () => handleMove(metric.id),
      }] : []),
      {
        label: `${t('general.delete')} Metric`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(metric.id),
      }
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(metric.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={t('general.deleteMetric')}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <PressableScale
              style={styles.rowWrapper}
              onPress={() => handleMetricPress(metric)}
            >
              <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
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
          </ContextMenuWrapper>
        </SwipeableRow>

        {!isLastItem && (
          <View style={styles.separatorContainer}>
            <View
              style={[styles.separator, { backgroundColor: themeColors.mutedText, opacity: 0.2 }]}
            />
          </View>
        )}
        {isLastItem && <View style={{ height: 24 }} />}
      </View>
    );
  }, [combinedList.length, themeColors, t, deleteMutation, deleteFolderMutation, registerOpenRow, handleLongPress, folders, metrics, terminology]);

  return (
    <>
      <FlashList
        data={combinedList}
        renderItem={renderItem}
        keyExtractor={(item) => item.type === 'folder' ? `folder-${item.data.id}` : item.data.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={t('library.empty.metrics')}
          />
        }
      />

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />

      <Dialog
        visible={showMoveDialog}
        onClose={() => { setShowMoveDialog(false); setMovingItemId(null); }}
        title="Move to Folder"
        message="Select a destination folder."
        buttonLayout="horizontal"
        buttons={[
          { label: t('general.cancel'), onPress: () => { setShowMoveDialog(false); setMovingItemId(null); }, variant: 'secondary' },
          { label: 'Save', onPress: handleConfirmMove, variant: 'primary', loading: moveMutation.isPending },
        ]}
      >
        <View style={{ marginBottom: 16 }}>
          <SelectInput
            label=""
            value={moveTargetFolder}
            onChange={setMoveTargetFolder}
            options={moveOptions}
            placeholder="Select folder..."
            clearable={false}
          />
        </View>
      </Dialog>

      <UpgradeDialog
        visible={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        feature={t('library.tabs.metrics')}
        featureKey="metrics"
      />
    </>
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
