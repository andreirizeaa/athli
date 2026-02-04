import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, HelpCircle, ChevronRight, ClipboardList, Link2, FilePlus } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQueryClient } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { SearchBar } from '@/components/ui/search-bar';
import { DropdownMenuWrapper, DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { deleteClientQuestionnaires } from '@/services/client/client-form-service';
import { getQuestionnaires } from '@/services/coach/coach-questionnaire-service';
import { haptics } from '@/utils/haptics';

// Get status pill style based on status
const getStatusStyle = (status: string, themeColors: any) => {
  switch (status) {
    case 'completed':
      return {
        backgroundColor: themeColors.primary,
        borderColor: themeColors.primary,
        textColor: themeColors.primaryForeground,
      };
    case 'pending':
      return {
        backgroundColor: 'transparent',
        borderColor: themeColors.primary,
        textColor: themeColors.primary,
      };
    case 'draft':
    default:
      return {
        backgroundColor: 'transparent',
        borderColor: themeColors.mutedText,
        textColor: themeColors.mutedText,
      };
  }
};

// Get formatted status label
const getStatusLabel = (status: string, t: any) => {
  switch (status) {
    case 'completed':
      return t('clientDetail.questionnaires.statusCompleted');
    case 'pending':
      return t('clientDetail.questionnaires.statusPending');
    case 'draft':
    default:
      return t('clientDetail.questionnaires.statusDraft');
  }
};

export default function ClientQuestionairesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get questionnaires from store (already loaded by parent screen)
  const questionnaires = useClientDetailStore((state) => state.questionnaires);
  const isLoadingForms = useClientDetailStore((state) => state.isLoadingForms);
  const coachId = useClientDetailStore((state) => state.coachId);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const queryClient = useQueryClient();

  // Prefetch coach's questionnaires for faster assign modal loading
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['questionnaires'],
      queryFn: getQuestionnaires,
    });
  }, [queryClient]);

  // Filter questionnaires based on search query
  const filteredQuestionnaires = useMemo(() => {
    if (!searchQuery.trim()) return questionnaires;
    const query = searchQuery.toLowerCase();
    return questionnaires.filter((questionnaire) =>
      questionnaire.name.toLowerCase().includes(query) ||
      questionnaire.status?.toLowerCase().includes(query)
    );
  }, [questionnaires, searchQuery]);

  // Track currently open swipeable row
  const openRowCloseRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);
  const isClosingRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowCloseRef.current) {
      isClosingRef.current = true;
      openRowCloseRef.current();
      openRowCloseRef.current = null;
      // Reset after animation completes
      setTimeout(() => {
        isClosingRef.current = false;
      }, 300);
    }
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    // Ignore onOpen calls that happen during close animation
    if (isClosingRef.current) return;

    // Close any previously open row
    if (openRowCloseRef.current && openRowCloseRef.current !== close) {
      openRowCloseRef.current();
    }
    openRowCloseRef.current = close;
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignQuestionnaire = useCallback(() => {
    router.push(`/modals/client/assign-questionnaire-to-client-modal?clientId=${id}` as any);
  }, [router, id]);

  const handleAddQuestionnaire = useCallback(() => {
    router.push({
      pathname: '/modals/library/add-questionnaire-modal',
      params: {
        clientId: id,
        coachId: coachId,
      },
    } as any);
  }, [router, id, coachId]);

  // Dropdown menu options for add button
  const addMenuOptions: DropdownMenuOption[] = useMemo(() => [
    {
      label: t('clientDetail.questionnaires.assignQuestionnaire'),
      icon: { sf: 'link', IconComponent: Link2 },
      onPress: handleAssignQuestionnaire,
    },
    {
      label: t('clientDetail.questionnaires.addQuestionnaire'),
      icon: { sf: 'doc.badge.plus', IconComponent: FilePlus },
      onPress: handleAddQuestionnaire,
    },
  ], [t, handleAssignQuestionnaire, handleAddQuestionnaire]);

  const handleQuestionnairePress = useCallback((questionnaire: typeof questionnaires[0]) => {
    // If a row was just closed, prevent navigation
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    // If a row is open, just close it and prevent navigation
    if (openRowCloseRef.current) {
      closeOpenRow();
      return;
    }
    router.push({
      pathname: '/client/[id]/questionnaire-detail',
      params: {
        id,
        questionnaireId: questionnaire.id,
        questionnaireName: questionnaire.name,
      },
    } as any);
  }, [closeOpenRow, router, id]);

  const handleDeleteQuestionnaire = async (questionnaire: typeof questionnaires[0]) => {
    if (!coachId) return;
    await deleteClientQuestionnaires({
      questionnaireIds: [questionnaire.id],
      clientId: id,
      coachId,
    });
    haptics.success();
    refreshSection('questionnaires');
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        <Pressable
          style={styles.contentContainer}
          onPressIn={() => {
            if (openRowCloseRef.current) {
              hadOpenRowRef.current = true;
              closeOpenRow();
            } else {
              hadOpenRowRef.current = false;
            }
          }}
        >
          {/* Loading state */}
          {isLoadingForms && questionnaires.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : filteredQuestionnaires.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyContainer}>
              <PlatformIcon
                sf="questionmark.circle"
                IconComponent={HelpCircle}
                size={48}
                color={themeColors.mutedText}
              />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {searchQuery.trim()
                  ? t('general.noResults')
                  : t('clientDetail.questionnaires.emptyTitle')}
              </Text>
              {!searchQuery.trim() && (
                <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                  {t('clientDetail.questionnaires.emptyDescription')}
                </Text>
              )}
            </View>
          ) : (
            /* Questionnaires list */
            <View>
              {filteredQuestionnaires.map((questionnaire, index) => {
                const isLastItem = index === filteredQuestionnaires.length - 1;
                const statusStyle = getStatusStyle(questionnaire.status || 'draft', themeColors);
                return (
                  <View key={questionnaire.id}>
                    <SwipeableRow
                      onDelete={() => handleDeleteQuestionnaire(questionnaire)}
                      deleteConfirmTitle={`${t('general.delete')} ${questionnaire.name}?`}
                      onOpen={handleRowOpen}
                    >
                      <PressableScale onPress={() => handleQuestionnairePress(questionnaire)}>
                        <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                          <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                            <PlatformIcon
                              sf="list.bullet.rectangle.portrait.fill"
                              IconComponent={ClipboardList}
                              size={24}
                              color={themeColors.text}
                            />
                          </SquircleView>
                          <View style={styles.textContent}>
                            <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                              {questionnaire.name}
                            </Text>
                            <View style={styles.metaRow}>
                              <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                  {questionnaire.questionCount || 0} {(questionnaire.questionCount || 0) === 1 ? t('general.question') : t('general.questions')}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.pill,
                                  {
                                    borderColor: statusStyle.borderColor,
                                    backgroundColor: statusStyle.backgroundColor,
                                  },
                                ]}
                              >
                                <Text style={[styles.pillText, { color: statusStyle.textColor }]}>
                                  {getStatusLabel(questionnaire.status || 'draft', t)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                        </View>
                      </PressableScale>
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
          )}
        </Pressable>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.questionnaires')}
        </Text>
        <DropdownMenuWrapper options={addMenuOptions}>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    marginHorizontal: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
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
