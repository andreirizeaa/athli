import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, Calendar, UserPlus, Trash2 } from 'lucide-react-native';
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
import { useModalCallbacks } from '@/stores';
import { getCheckIns, deleteCheckIn, duplicateCheckIn } from '@/services/coach/coach-check-in-service';
import { EmptyState } from '@/components/ui/empty-state';

export const CheckInsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow, openRowCloseFn } = useLibraryTab();
  const { setClientsSelectCallback } = useModalCallbacks();
  const isRowOpen = openRowCloseFn !== null;
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch check-ins directly with TanStack Query
  const { data: checkIns = [], isLoading, isError } = useQuery({
    queryKey: ['checkIns'],
    queryFn: async () => {
      console.log('[CheckInsTab] Fetching check-ins...');
      const data = await getCheckIns();
      console.log('[CheckInsTab] Received check-ins:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Filter check-ins based on search query
  const filteredCheckIns = useMemo(() => {
    if (!searchQuery.trim()) return checkIns;
    const lowerQuery = searchQuery.toLowerCase();
    return checkIns.filter(checkIn =>
      checkIn.name.toLowerCase().includes(lowerQuery) ||
      checkIn.schedule_config?.frequency?.toLowerCase().includes(lowerQuery)
    );
  }, [checkIns, searchQuery]);

  console.log('[CheckInsTab] Render:', {
    isAuthenticated,
    isLoading,
    isError,
    totalCheckIns: checkIns.length,
    filteredCheckIns: filteredCheckIns.length,
    searchQuery
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCheckIn(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['checkIns'] });
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
    mutationFn: ({ id, original }: { id: string; original: typeof filteredCheckIns[0] }) =>
      duplicateCheckIn(id, original),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['checkIns'] });
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

  const handleCheckInPress = (item: typeof filteredCheckIns[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-check-in-modal',
      params: {
        editingId: item.id,
        name: item.name,
        description: item.description || '',
      },
    });
  };

  const handleAssign = (item: typeof filteredCheckIns[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

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

  const renderItem = useCallback(({ item, index }: { item: typeof filteredCheckIns[0]; index: number }) => {
    const isLastItem = index === filteredCheckIns.length - 1;

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: `${t('general.delete')} Check-in`,
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
          <ContextMenuWrapper options={dropdownOptions}>
            <PressableOpacity
              style={styles.rowWrapper}
              onPress={() => handleCheckInPress(item)}
            >
              <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                <View style={styles.iconContainer}>
                  <PlatformIcon
                    sf="calendar.badge.clock"
                    IconComponent={Calendar}
                    size={24}
                    color={themeColors.text}
                  />
                </View>
                <View style={styles.textContent}>
                  <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.schedule_config?.frequency && (
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {item.schedule_config.frequency}
                      </Text>
                    )}
                    {item.questionCount !== undefined && (
                      <>
                        {item.schedule_config?.frequency && (
                          <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        )}
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'}
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
  }, [filteredCheckIns.length, themeColors, t, deleteMutation, registerOpenRow, handleCheckInPress, handleAssign]);

  return (
    <FlashList
      data={filteredCheckIns}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          message={t('library.empty.checkIns')}
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
