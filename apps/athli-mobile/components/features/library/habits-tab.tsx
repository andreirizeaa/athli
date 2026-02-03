import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, CheckCircle, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { useLibraryTabList } from '@/hooks/use-library-tab-list';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getAllHabits, deleteHabit, duplicateHabit } from '@/services/coach/coach-habit-service';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { HABIT_UNIT_OPTIONS, HABIT_PERIOD_OPTIONS } from '@athli/shared-types';

export const HabitsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch habits directly with TanStack Query
  const { data: habits = [], refetch } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      console.log('[HabitsTab] Fetching habits...');
      const data = await getAllHabits();
      console.log('[HabitsTab] Received habits:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.habits',
    refetch,
  });

  // Filter habits based on search query
  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) return habits;
    const lowerQuery = searchQuery.toLowerCase();
    return habits.filter(habit =>
      habit.name.toLowerCase().includes(lowerQuery) ||
      habit.unit?.toLowerCase().includes(lowerQuery) ||
      habit.period?.toLowerCase().includes(lowerQuery)
    );
  }, [habits, searchQuery]);

  console.log('[HabitsTab] Render:', {
    isAuthenticated,
    totalHabits: habits.length,
    filteredHabits: filteredHabits.length,
    searchQuery
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHabit({ id }),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['habits'] });

      // Snapshot previous value
      const previousHabits = queryClient.getQueryData<typeof habits>(['habits']);

      // Optimistically remove from cache
      queryClient.setQueryData<typeof habits>(['habits'], (old) =>
        old?.filter((h) => h.id !== id) ?? []
      );

      // Return context with snapshot for rollback
      return { previousHabits };
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      if (context?.previousHabits) {
        queryClient.setQueryData(['habits'], context.previousHabits);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
    onSuccess: () => {
      haptics.success();
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

  const handleHabitPress = (item: typeof filteredHabits[0]) => {
    // If a row is open, just close it and prevent navigation
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

  const handleAssign = (item: typeof filteredHabits[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=habit&itemIds=${item.id}`);
  };

  // Prefetch clients when long press happens to make modal open instantly
  const handleLongPress = useCallback(() => {
    console.log('[HabitsTab] 🎯 Long press detected, prefetching clients...');
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        console.log('[HabitsTab] 📡 Executing prefetch queryFn...');
        const { getClients } = await import('@/services/coach/coach-client-service');
        const data = await getClients();
        console.log('[HabitsTab] ✅ Prefetch complete:', data.length, 'clients');
        return data;
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

  const renderItem = useCallback(({ item, index }: { item: typeof filteredHabits[0]; index: number }) => {
    const isLastItem = index === filteredHabits.length - 1;
    const unitLabel = getUnitLabel(item.unit);
    const periodLabel = getPeriodLabel(item.period);

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: `${t('general.delete')} Habit`,
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
  }, [filteredHabits.length, themeColors, t, deleteMutation, registerOpenRow, handleHabitPress, handleAssign, getUnitLabel, getPeriodLabel]);

  return (
    <>
      <FlashList
        data={filteredHabits}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
