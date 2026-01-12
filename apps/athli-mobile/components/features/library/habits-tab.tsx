import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, CheckCircle, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useModalCallbacks } from '@/stores';
import { getAllHabits, deleteHabit, duplicateHabit } from '@/services/coach/coach-habit-service';
import { EmptyState } from '@/components/ui/empty-state';
import { HABIT_UNIT_OPTIONS, HABIT_PERIOD_OPTIONS } from '@athli/shared-types';

export const HabitsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch habits directly with TanStack Query
  const { data: habits = [], isLoading, isError } = useQuery({
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
    isLoading,
    isError,
    totalHabits: habits.length,
    filteredHabits: filteredHabits.length,
    searchQuery
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHabit({ id }),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['habits'] });
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
    mutationFn: (id: string) => duplicateHabit(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['habits'] });
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

  const handleHabitPress = (item: typeof filteredHabits[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-habit-modal',
      params: {
        editingId: item.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        period: item.period,
      },
    });
  };

  const { setClientsSelectCallback } = useModalCallbacks();

  const handleAssign = (item: typeof filteredHabits[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.name} to clients:`, selectedClients.map(c => c.name));
      // Here you would normally call a service to assign the habit
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

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

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredHabits.length === 0 && (
        <EmptyState
          message={t('library.empty.habits')}
        />
      )}

      {/* Habits List */}
      {filteredHabits.map((item, index) => {
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
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => deleteMutation.mutateAsync(item.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.name}?`}
            >
              <ContextMenuWrapper options={dropdownOptions}>
                <PressableOpacity
                  style={styles.rowWrapper}
                  onPress={() => handleHabitPress(item)}
                >
                  <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                    <View style={styles.iconContainer}>
                      <PlatformIcon
                        sf="checkmark.circle.fill"
                        IconComponent={CheckCircle}
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
                          {item.amount} {unitLabel}
                        </Text>
                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {periodLabel}
                        </Text>
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
