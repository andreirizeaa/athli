import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, CheckCircle, UserPlus, Trash2, Folder, Pencil, ArrowRightLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';
import type { Habit, HabitFolder } from '@athli/shared-types';

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
import { getAllHabits, deleteHabit, duplicateHabit } from '@/services/coach/coach-habit-service';
import { getAllHabitFolders, deleteHabitFolder, moveHabit } from '@/services/coach/coach-habit-folder-service';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput } from '@/components/ui/form-inputs/select-input';
import { UpgradeDialog } from '@/components/permissions/upgrade-dialog';
import { HABIT_UNIT_OPTIONS, HABIT_PERIOD_OPTIONS } from '@athli/shared-types';

type ListItem =
  | { type: 'folder'; data: HabitFolder }
  | { type: 'habit'; data: Habit };

export const HabitsTab = () => {
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
  const hasHabitsAccess = hasFeature('habits_metrics');

  // Upgrade dialog state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Error dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Move dialog state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // Fetch habits directly with TanStack Query
  const { data: habits = [], refetch } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const data = await getAllHabits();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['habit-folders'],
    queryFn: getAllHabitFolders,
    enabled: isAuthenticated,
  });

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.habits',
    refetch,
  });

  // Build combined list: folders first, then unfiled habits
  const combinedList = useMemo(() => {
    const lowerQuery = searchQuery.trim().toLowerCase();
    const filteredFolders = lowerQuery
      ? folders.filter(f => f.name.toLowerCase().includes(lowerQuery))
      : folders;
    const unfiledHabits = habits.filter(h => !h.folderId);
    const filteredHabits = lowerQuery
      ? unfiledHabits.filter(habit =>
          habit.name.toLowerCase().includes(lowerQuery) ||
          habit.unit?.toLowerCase().includes(lowerQuery) ||
          habit.period?.toLowerCase().includes(lowerQuery)
        )
      : unfiledHabits;

    const items: ListItem[] = [
      ...filteredFolders.map(f => ({ type: 'folder' as const, data: f })),
      ...filteredHabits.map(h => ({ type: 'habit' as const, data: h })),
    ];
    return items;
  }, [habits, folders, searchQuery]);

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHabit({ id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData<typeof habits>(['habits']);
      queryClient.setQueryData<typeof habits>(['habits'], (old) =>
        old?.filter((h) => h.id !== id) ?? []
      );
      return { previousHabits };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(['habits'], context.previousHabits);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
    onSuccess: () => {
      haptics.success();
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteHabitFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-folders'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
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
    mutationFn: ({ habitId, folderId }: { habitId: string; folderId: string | null }) =>
      moveHabit(habitId, folderId),
    onMutate: async ({ habitId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData<Habit[]>(['habits']);
      queryClient.setQueryData<Habit[]>(['habits'], (old) =>
        old?.map(h => h.id === habitId ? { ...h, folderId } : h) ?? []
      );
      return { previousHabits };
    },
    onSuccess: () => {
      haptics.success();
      setShowMoveDialog(false);
      setMovingItemId(null);
      setMoveTargetFolder(null);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(['habits'], context.previousHabits);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorSaving'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-folders'] });
      queryClient.invalidateQueries({ queryKey: ['habits-in-folder'] });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateHabit(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['habits'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDuplicating'));
      setShowErrorDialog(true);
    },
  });

  const handleHabitPress = (item: Habit) => {
    if (isRowOpen) {
      closeOpenRow();
      return;
    }
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-habit-modal',
      params: {
        editingId: item.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        period: item.period,
        description: item.description || '',
        reminderTime: item.reminderTime || '',
        reminderMessage: item.reminderMessage || '',
        duration: item.duration?.toString() || '',
      },
    });
  };

  const handleAssign = (item: Habit) => {
    if (isRowOpen) {
      closeOpenRow();
      return;
    }
    if (!hasHabitsAccess) {
      setShowUpgradeDialog(true);
      return;
    }
    router.push(`/modals/shared/assign-to-clients-modal?type=habit&itemIds=${item.id}`);
  };

  const handleMove = (itemId: string) => {
    setMovingItemId(itemId);
    setMoveTargetFolder(null);
    setShowMoveDialog(true);
  };

  const handleConfirmMove = () => {
    if (!movingItemId) return;
    const folderId = moveTargetFolder === '__home__' ? null : moveTargetFolder;
    moveMutation.mutate({ habitId: movingItemId, folderId });
  };

  const handleFolderPress = (folder: HabitFolder) => {
    if (isRowOpen) {
      closeOpenRow();
      return;
    }
    router.push(`/library/habit-folder/${folder.id}` as any);
  };

  const handleEditFolder = (folder: HabitFolder) => {
    router.push({
      pathname: '/modals/library/create-folder-modal',
      params: { type: 'habits', editingId: folder.id, name: folder.name },
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

  // Helper to get formatted label for unit
  const getUnitLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const option = HABIT_UNIT_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Helper to get formatted label for period
  const getPeriodLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value === 'daily') return t('library.addHabit.daily');
    if (value === 'weekly') return t('library.addHabit.weekly');
    const option = HABIT_PERIOD_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  const moveOptions = useMemo(() => [
    { value: '__home__' as string, label: 'Home (No folder)' },
    ...folders.map(f => ({ value: f.id, label: f.name })),
  ], [folders]);

  const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
    const isLastItem = index === combinedList.length - 1;

    if (item.type === 'folder') {
      const folder = item.data;
      const itemCount = habits.filter(h => h.folderId === folder.id).length;
      const countLabel = itemCount === 0 ? 'Empty' : itemCount === 1 ? '1 habit' : `${itemCount} habits`;
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

    // Habit row
    const habit = item.data;
    const unitLabel = getUnitLabel(habit.unit);
    const periodLabel = getPeriodLabel(habit.period);

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: terminology.assignToPlural,
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(habit),
      },
      ...(folders.length > 0 ? [{
        label: 'Move to Folder',
        icon: { sf: 'folder', IconComponent: ArrowRightLeft },
        onPress: () => handleMove(habit.id),
      }] : []),
      {
        label: `${t('general.delete')} Habit`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(habit.id),
      }
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(habit.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={t('general.deleteHabit')}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <PressableScale
              style={styles.rowWrapper}
              onPress={() => handleHabitPress(habit)}
            >
              <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
                <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                  <PlatformIcon
                    sf="checkmark.circle.fill"
                    IconComponent={CheckCircle}
                    size={24}
                    color={themeColors.text}
                  />
                </SquircleView>
                <View style={styles.textContent}>
                  <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                      <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                        {habit.amount} {unitLabel}
                      </Text>
                    </View>
                    <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                      <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                        {periodLabel}
                      </Text>
                    </View>
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
  }, [combinedList.length, themeColors, t, deleteMutation, deleteFolderMutation, registerOpenRow, handleLongPress, folders, habits, terminology]);

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
            message={t('library.empty.habits')}
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
        feature={t('library.tabs.habits')}
        featureKey="habits"
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
