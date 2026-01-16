import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, HelpCircle, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';

export default function ClientQuestionairesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get questionnaires from store (already loaded by parent screen)
  const questionnaires = useClientDetailStore((state) => state.questionnaires);
  const isLoadingForms = useClientDetailStore((state) => state.isLoadingForms);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignQuestionnaire = () => {
    router.push(`/modals/shared/assign-to-clients-modal?type=questionnaire&clientId=${id}`);
  };

  const handleAddQuestionnaire = () => {
    router.push(`/modals/library/add-questionnaire-modal?clientId=${id}`);
  };

  const handleQuestionnairePress = (questionnaireId: string) => {
    router.push(
      `/modals/client/questionnaire-detail-modal?clientId=${id}&questionnaireId=${questionnaireId}`
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return themeColors.success;
      case 'pending':
        return themeColors.warning || '#F5A623';
      case 'overdue':
        return themeColors.error;
      default:
        return themeColors.mutedText;
    }
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.questionnaires')}
        </Text>
        <DropdownMenuWrapper
          options={[
            {
              label: t('clientDetail.actions.assignQuestionnaire'),
              icon: { sf: 'checklist', IconComponent: ClipboardCheck },
              onPress: handleAssignQuestionnaire,
            },
            {
              label: t('clientDetail.actions.addQuestionnaire'),
              icon: { sf: 'plus', IconComponent: Plus },
              onPress: handleAddQuestionnaire,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>

      {/* Loading state */}
      {isLoadingForms && questionnaires.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : questionnaires.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <PlatformIcon
            sf="questionmark.circle"
            IconComponent={HelpCircle}
            size={48}
            color={themeColors.mutedText}
          />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.questionnaires.emptyTitle')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.questionnaires.emptyDescription')}
          </Text>
        </View>
      ) : (
        /* Questionnaires list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {questionnaires.map((questionnaire) => (
            <View key={questionnaire.id || questionnaire.assignment_id}>
              <PressableScale
                onPress={() =>
                  handleQuestionnairePress(questionnaire.id || questionnaire.assignment_id)
                }
              >
                <View style={styles.questionnaireItem}>
                  <View
                    style={[
                      styles.questionnaireIconContainer,
                      { backgroundColor: `${themeColors.primary}15` },
                    ]}
                  >
                    <PlatformIcon
                      sf="questionmark.circle"
                      IconComponent={HelpCircle}
                      size={24}
                      color={themeColors.primary}
                    />
                  </View>
                  <View style={styles.questionnaireInfo}>
                    <Text
                      style={[styles.questionnaireName, { color: themeColors.text }]}
                      numberOfLines={1}
                    >
                      {questionnaire.name || questionnaire.title}
                    </Text>
                    <View style={styles.questionnaireMeta}>
                      {questionnaire.status && (
                        <Text
                          style={[
                            styles.questionnaireStatus,
                            { color: getStatusColor(questionnaire.status) },
                          ]}
                        >
                          {questionnaire.status}
                        </Text>
                      )}
                      {questionnaire.created_at && (
                        <Text style={[styles.questionnaireDate, { color: themeColors.mutedText }]}>
                          {formatDate(questionnaire.created_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableScale>
              <Separator />
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  questionnaireItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  questionnaireIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionnaireInfo: {
    flex: 1,
    gap: 4,
  },
  questionnaireName: {
    ...typography.p1,
    fontWeight: '500',
  },
  questionnaireMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionnaireStatus: {
    ...typography.p3,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  questionnaireDate: {
    ...typography.p3,
  },
});
