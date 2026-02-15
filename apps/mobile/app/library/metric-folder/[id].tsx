import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Activity, Trash2, UserPlus, ArrowRightLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashList } from '@shopify/flash-list';
import type { Metric, MetricFolder } from '@athli/shared-types';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore, useEntitlements } from '@/stores';
import { useTranslations } from '@/stores';
import { useTerminology } from '@/hooks/useTerminology';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { FAB } from '@/components/ui/fab';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput } from '@/components/ui/form-inputs/select-input';
import { deleteMetric } from '@/services/coach/coach-metric-service';
import {
  getMetricsInFolder,
  getAllMetricFolders,
  deleteMetricFolder,
  moveMetric,
} from '@/services/coach/coach-metric-folder-service';
import { UpgradeDialog } from '@/components/permissions/upgrade-dialog';

const HEADER_HEIGHT = 52;

export default function MetricFolderDetailScreen() {
  const router = useRouter();
  const { id: folderId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  const { hasFeature } = useEntitlements();
  const hasMetricsAccess = hasFeature('habits_metrics');

  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // Fetch folder info
  const { data: folders = [] } = useQuery({
    queryKey: ['metric-folders'],
    queryFn: getAllMetricFolders,
    enabled: isAuthenticated,
  });

  const folder = folders.find(f => f.id === folderId);

  // Fetch items in folder
  const { data: metrics = [] } = useQuery({
    queryKey: ['metrics-in-folder', folderId],
    queryFn: () => getMetricsInFolder(folderId),
    enabled: isAuthenticated && !!folderId,
  });

  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) return metrics;
    const lowerQuery = searchQuery.toLowerCase();
    return metrics.filter(metric =>
      metric.name.toLowerCase().includes(lowerQuery) ||
      metric.unit?.toLowerCase().includes(lowerQuery) ||
      metric.description?.toLowerCase().includes(lowerQuery)
    );
  }, [metrics, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-in-folder', folderId] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async () => {
      // Delete all metrics in the folder first, then the folder
      for (const metric of metrics) {
        await deleteMetric(metric.id);
      }
      await deleteMetricFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-folders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      haptics.success();
      router.back();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ metricId, targetFolderId }: { metricId: string; targetFolderId: string | null }) =>
      moveMetric(metricId, targetFolderId),
    onMutate: async ({ metricId }) => {
      await queryClient.cancelQueries({ queryKey: ['metrics-in-folder', folderId] });
      await queryClient.cancelQueries({ queryKey: ['metrics'] });
      const previousFolderMetrics = queryClient.getQueryData<Metric[]>(['metrics-in-folder', folderId]);
      queryClient.setQueryData<Metric[]>(['metrics-in-folder', folderId], (old) =>
        old?.filter(m => m.id !== metricId) ?? []
      );
      const previousMetrics = queryClient.getQueryData<Metric[]>(['metrics']);
      if (previousMetrics) {
        queryClient.setQueryData<Metric[]>(['metrics'], (old) =>
          old?.map(m => m.id === metricId ? { ...m, folder_id: null } : m) ?? []
        );
      }
      return { previousFolderMetrics, previousMetrics };
    },
    onSuccess: () => {
      haptics.success();
      setShowMoveDialog(false);
      setMovingItemId(null);
      setMoveTargetFolder(null);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousFolderMetrics) {
        queryClient.setQueryData(['metrics-in-folder', folderId], context.previousFolderMetrics);
      }
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

  const handleMetricPress = (item: Metric) => {
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
    const targetFolderId = moveTargetFolder === '__home__' ? null : moveTargetFolder;
    moveMutation.mutate({ metricId: movingItemId, targetFolderId });
  };

  const handleAddMetric = () => {
    router.push({
      pathname: '/modals/library/add-metric-modal',
      params: { folderId },
    } as any);
  };

  const moveOptions = useMemo(() => [
    { value: '__home__' as string, label: 'Home (No folder)' },
    ...folders.filter(f => f.id !== folderId).map(f => ({ value: f.id, label: f.name })),
  ], [folders, folderId]);

  const handleLongPress = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        const { getClients } = await import('@/services/coach/coach-client-service');
        return getClients();
      },
    });
  }, [queryClient]);

  const renderItem = useCallback(({ item, index }: { item: Metric; index: number }) => {
    const isLastItem = index === filteredMetrics.length - 1;

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: terminology.assignToPlural,
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: 'Move to Folder',
        icon: { sf: 'folder', IconComponent: ArrowRightLeft },
        onPress: () => handleMove(item.id),
      },
      {
        label: `${t('general.delete')} Metric`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(item.id),
      },
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(item.id)}
          deleteConfirmTitle={t('general.deleteMetric')}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <PressableScale
              style={styles.rowWrapper}
              onPress={() => handleMetricPress(item)}
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
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.unit && (
                      <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                        <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                          {item.unit}
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
            <View style={[styles.separator, { backgroundColor: themeColors.mutedText, opacity: 0.2 }]} />
          </View>
        )}
        {isLastItem && <View style={{ height: 24 }} />}
      </View>
    );
  }, [filteredMetrics.length, themeColors, t, deleteMutation, handleLongPress, terminology]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <FlashList
        data={filteredMetrics}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('library.searchPlaceholders.metrics')}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState message="No metrics in this folder" />
        }
      />

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={() => router.back()}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {folder?.name || 'Folder'}
        </Text>
        <IconButton
          icon={{ sf: 'trash', IconComponent: Trash2 }}
          onPress={() => setShowDeleteFolderDialog(true)}
          size="md"
          color={themeColors.text}
        />
      </View>

      {/* FAB */}
      <FAB onPress={handleAddMetric} variant="plus" bottom={insets.bottom + 20} />

      {/* Delete folder dialog */}
      <Dialog
        visible={showDeleteFolderDialog}
        onClose={() => setShowDeleteFolderDialog(false)}
        title="Delete Folder"
        message="Delete this folder and all its contents? This action cannot be undone."
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowDeleteFolderDialog(false), variant: 'secondary' },
          { label: t('general.delete'), onPress: () => deleteFolderMutation.mutate(), variant: 'destructive', loading: deleteFolderMutation.isPending },
        ]}
      />

      {/* Move dialog */}
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

      {/* Error dialog */}
      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />

      <UpgradeDialog
        visible={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        feature={t('library.tabs.metrics')}
        featureKey="metrics"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
});
