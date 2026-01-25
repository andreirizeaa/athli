import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, ClipboardList, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
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
import { getQuestionnaires, deleteQuestionnaire, duplicateQuestionnaire } from '@/services/coach/coach-questionnaire-service';
import { EmptyState } from '@/components/ui/empty-state';

export const QuestionnairesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch questionnaires directly with TanStack Query
  const { data: questionnaires = [], refetch } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: async () => {
      console.log('[QuestionnairesTab] Fetching questionnaires...');
      const data = await getQuestionnaires();
      console.log('[QuestionnairesTab] Received questionnaires:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.questionnaires',
    refetch,
  });

  // Filter questionnaires based on search query
  const filteredQuestionnaires = useMemo(() => {
    if (!searchQuery.trim()) return questionnaires;
    const lowerQuery = searchQuery.toLowerCase();
    return questionnaires.filter(questionnaire =>
      questionnaire.name.toLowerCase().includes(lowerQuery)
    );
  }, [questionnaires, searchQuery]);

  console.log('[QuestionnairesTab] Render:', {
    isAuthenticated,
    totalQuestionnaires: questionnaires.length,
    filteredQuestionnaires: filteredQuestionnaires.length,
    searchQuery
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestionnaire(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['questionnaires'] });

      // Snapshot previous value
      const previousQuestionnaires = queryClient.getQueryData<typeof questionnaires>(['questionnaires']);

      // Optimistically remove from cache
      queryClient.setQueryData<typeof questionnaires>(['questionnaires'], (old) =>
        old?.filter((q) => q.id !== id) ?? []
      );

      // Return context with snapshot for rollback
      return { previousQuestionnaires };
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      if (context?.previousQuestionnaires) {
        queryClient.setQueryData(['questionnaires'], context.previousQuestionnaires);
      }
      haptics.error();
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    },
    onSuccess: () => {
      haptics.success();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: ({ id, original }: { id: string; original: typeof filteredQuestionnaires[0] }) =>
      duplicateQuestionnaire(id, original),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['questionnaires'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDuplicating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  const handleQuestionnairePress = (item: typeof filteredQuestionnaires[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();
    router.push({
      pathname: '/library/form/form-builder',
      params: {
        formType: 'questionnaire',
        formId: item.id,
        formName: item.name,
      },
    });
  };

  const handleAssign = (item: typeof filteredQuestionnaires[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=questionnaire&itemIds=${item.id}`);
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

  const renderItem = useCallback(({ item, index }: { item: typeof filteredQuestionnaires[0]; index: number }) => {
    const isLastItem = index === filteredQuestionnaires.length - 1;

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: `${t('general.delete')} Questionnaire`,
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
              onPress={() => handleQuestionnairePress(item)}
            >
              <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
                <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                  <PlatformIcon
                    sf="list.bullet.rectangle.portrait.fill"
                    IconComponent={ClipboardList}
                    size={24}
                    color={themeColors.text}
                  />
                </View>
                <View style={styles.textContent}>
                  <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    {(() => {
                      const count = item.questionCount ?? item.questions?.length ?? 0;
                      return (
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {count} {count === 1 ? 'question' : 'questions'}
                        </Text>
                      );
                    })()}
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
  }, [filteredQuestionnaires.length, themeColors, t, deleteMutation, registerOpenRow, handleQuestionnairePress, handleAssign]);

  return (
    <FlashList
      data={filteredQuestionnaires}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <EmptyState
          message={t('library.empty.questionnaires')}
        />
      }
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
