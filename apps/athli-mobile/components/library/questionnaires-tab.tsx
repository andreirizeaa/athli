import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, ClipboardList, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { SwipeableRow } from '@/components/swipeable-row';
import { useLibraryTab } from '@/contexts/useLibraryTab';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';
import { useModalCallbacks } from '@/contexts/modal-callbacks';

// Mock data
const MOCK_QUESTIONNAIRES = [
  { id: '1', name: 'Initial Assessment', type: 'Onboarding', questions: 15 },
  { id: '2', name: 'Lifestyle Audit', type: 'Nutrition', questions: 22 },
  { id: '3', name: 'Equipment Checklist', type: 'Training', questions: 8 },
];

export const QuestionnairesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const { setClientsSelectCallback } = useModalCallbacks();

  const filteredQuestionnaires = useMemo(() => {
    if (!searchQuery) return MOCK_QUESTIONNAIRES;
    const query = searchQuery.toLowerCase();
    return MOCK_QUESTIONNAIRES.filter(
      (item) => item.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleQuestionnairePress = (item: typeof MOCK_QUESTIONNAIRES[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-questionnaire-modal',
      params: {
        editingId: item.id,
        name: item.name,
      },
    });
  };

  const handleAssign = (item: typeof MOCK_QUESTIONNAIRES[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.name} to clients:`, selectedClients.map(c => c.fullName));
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

  const deleteQuestionnaire = (id: string) => {
    console.log('Delete questionnaire:', id);
    // In a real app, this would dispatch a delete action
  };

  const handleDelete = useCallback((item: typeof MOCK_QUESTIONNAIRES[0]) => {
    Alert.alert(
      `${t('general.delete')} ${item.name}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteQuestionnaire(item.id)
        },
      ]
    );
  }, [t]);

  if (filteredQuestionnaires.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('library.sections.empty').replace('sections', 'questionnaires')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            onPress: () => deleteQuestionnaire(item.id),
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
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                          {item.type}
                        </Text>
                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {item.questions} questions
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
});
