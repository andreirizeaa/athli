import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, CheckCircle, Trash2, UserPlus, ArrowRightLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashList } from '@shopify/flash-list';
import type { Habit, HabitFolder } from '@athli/shared-types';
import { HABIT_UNIT_OPTIONS, HABIT_PERIOD_OPTIONS } from '@athli/shared-types';

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
import { deleteHabit } from '@/services/coach/coach-habit-service';
import {
  getHabitsInFolder,
  getAllHabitFolders,
  deleteHabitFolder,
  moveHabit,
} from '@/services/coach/coach-habit-folder-service';
import { UpgradeDialog } from '@/components/permissions/upgrade-dialog';

const HEADER_HEIGHT = 52;

export default function HabitFolderDetailScreen() {
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
  const hasHabitsAccess = hasFeature('habits_metrics');

  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ['habit-folders'],
    queryFn: getAllHabitFolders,
    enabled: isAuthenticated,
  });

  const folder = folders.find(f => f.id === folderId);

  const { data: habits = [] } = useQuery({
    queryKey: ['habits-in-folder', folderId],
    queryFn: () => getHabitsInFolder(folderId),
    enabled: isAuthenticated && !!folderId,
  });

  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) return habits;
    const lowerQuery = searchQuery.toLowerCase();
    return habits.filter(habit =>
      habit.name.toLowerCase().includes(lowerQuery) ||
      habit.description?.toLowerCase().includes(lowerQuery)
    );
  }, [habits, searchQuery]);

  const getUnitLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const option = HABIT_UNIT_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  const getPeriodLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value === 'daily') return t('library.addHabit.daily');
    if (value === 'weekly') return t('library.addHabit.weekly');
    const option = HABIT_PERIOD_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHabit({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habits-in-folder', folderId] });
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
      for (const habit of habits) {
        await deleteHabit({ id: habit.id });
      }
      await deleteHabitFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-folders'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
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
    mutationFn: ({ habitId, targetFolderId }: { habitId: string; targetFolderId: string | null }) =>
      moveHabit(habitId, targetFolderId),
    onMutate: async ({ habitId }) => {
      await queryClient.cancelQueries({ queryKey: ['habits-in-folder', folderId] });
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousFolderHabits = queryClient.getQueryData<Habit[]>(['habits-in-folder', folderId]);
      queryClient.setQueryData<Habit[]>(['habits-in-folder', folderId], (old) =>
        old?.filter(h => h.id !== habitId) ?? []
      );
      const previousHabits = queryClient.getQueryData<Habit[]>(['habits']);
      if (previousHabits) {
        queryClient.setQueryData<Habit[]>(['habits'], (old) =>
          old?.map(h => h.id === habitId ? { ...h, folderId: null } : h) ?? []
        );
      }
      return { previousFolderHabits, previousHabits };
    },
    onSuccess: () => {
      haptics.success();
      setShowMoveDialog(false);
      setMovingItemId(null);
      setMoveTargetFolder(null);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousFolderHabits) {
        queryClient.setQueryData(['habits-in-folder', folderId], context.previousFolderHabits);
      }
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

  const handleHabitPress = (item: Habit) => {
    router.push({
      pathname: '/modals/library/add-habit-modal',
      params: {
        editingId: item.id,
        name: item.name,
        amount: String(item.amount),
        unit: item.unit,
        period: item.period,
        description: item.description,
        duration: item.duration !== undefined ? String(item.duration) : undefined,
        reminderTime: item.reminderTime,
        reminderMessage: item.reminderMessage,
      },
    });
  };

  const handleAssign = (item: Habit) => {
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
    const targetFolderId = moveTargetFolder === '__home__' ? null : moveTargetFolder;
    moveMutation.mutate({ habitId: movingItemId, targetFolderId });
  };

  const handleAddHabit = () => {
    router.push({
      pathname: '/modals/library/add-habit-modal',
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

  const renderItem = useCallback(({ item, index }: { item: Habit; index: number }) => {
    const isLastItem = index === filteredHabits.length - 1;
    const unitLabel = getUnitLabel(item.unit);
    const periodLabel = getPeriodLabel(item.period);

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
        label: `${t('general.delete')} Habit`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(item.id),
      },
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(item.id)}
          deleteConfirmTitle={t('general.deleteHabit')}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <PressableScale
              style={styles.rowWrapper}
              onPress={() => handleHabitPress(item)}
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
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                      <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                        {item.amount} {unitLabel}
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
            <View style={[styles.separator, { backgroundColor: themeColors.mutedText, opacity: 0.2 }]} />
          </View>
        )}
        {isLastItem && <View style={{ height: 24 }} />}
      </View>
    );
  }, [filteredHabits.length, themeColors, t, deleteMutation, handleLongPress, terminology]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <FlashList
        data={filteredHabits}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('library.searchPlaceholders.habits')}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState message="No habits in this folder" />
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

      <FAB onPress={handleAddHabit} variant="plus" bottom={insets.bottom + 20} />

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
        feature={t('library.tabs.habits')}
        featureKey="habits"
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
