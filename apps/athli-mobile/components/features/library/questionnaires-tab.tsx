import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, ClipboardList, UserPlus, Trash2 } from 'lucide-react-native';
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
import { deleteQuestionnaire, duplicateQuestionnaire } from '@/services/coach/coach-questionnaire-service';
import { EmptyState } from '@/components/ui/empty-state';

const noFormsAvatar = require('@/assets/avatars/no-forms-avatar.png');

export const QuestionnairesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const { setClientsSelectCallback } = useModalCallbacks();
  const queryClient = useQueryClient();

  // Get questionnaires from Zustand store
  const getFilteredQuestionnaires = useLibraryStore((state) => state.getFilteredQuestionnaires);
  const filteredQuestionnaires = useMemo(
    () => getFilteredQuestionnaires(searchQuery),
    [getFilteredQuestionnaires, searchQuery]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestionnaire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
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
    mutationFn: ({ id, original }: { id: string; original: typeof filteredQuestionnaires[0] }) =>
      duplicateQuestionnaire(id, original),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
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

  const handleQuestionnairePress = (item: typeof filteredQuestionnaires[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-questionnaire-modal',
      params: {
        editingId: item.id,
        name: item.name,
      },
    });
  };

  const handleAssign = (item: typeof filteredQuestionnaires[0]) => {
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

  const handleDelete = useCallback((item: typeof filteredQuestionnaires[0]) => {
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
      {filteredQuestionnaires.length === 0 && (
        <EmptyState
          image={noFormsAvatar}
          message={t('library.empty.questionnaires')}
        />
      )}

      {/* Questionnaire List */}
      {filteredQuestionnaires.map((item, index) => {
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
                  onPress={() => handleQuestionnairePress(item)}
                >
                  <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                    <View style={styles.iconContainer}>
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
                        {item.questionCount !== undefined && (
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                            {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'}
                          </Text>
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
