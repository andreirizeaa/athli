import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Pencil, MessageSquare, Send, RefreshCw, Trash2, Eye } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Card } from '@/components/ui/card';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Dialog } from '@/components/ui/dialog';
import {
  deleteClientQuestionnaires,
  sendClientQuestionnaire,
  resendClientQuestionnaire,
} from '@/services/client/client-form-service';
import { haptics } from '@/utils/haptics';

type QuestionnaireDetailParams = {
  id: string;
  questionnaireId: string;
  questionnaireName: string;
};

export default function QuestionnaireDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const params = useLocalSearchParams<QuestionnaireDetailParams>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const coachId = useClientDetailStore((state) => state.coachId);
  const questionnaires = useClientDetailStore((state) => state.questionnaires);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  // Find current questionnaire to get its status
  const currentQuestionnaire = questionnaires.find((q) => q.id === params.questionnaireId);
  const isDraft = currentQuestionnaire?.status === 'draft' || !currentQuestionnaire?.status;

  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showSendAgainDialog, setShowSendAgainDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const iconSize = iconSizes.listIcons;
  const iconColor = themeColors.text;

  const handleBackPress = () => {
    router.back();
  };

  const handleViewEditForm = () => {
    router.push({
      pathname: '/library/form/form-builder',
      params: {
        formType: 'questionnaire',
        formId: params.questionnaireId,
        formName: params.questionnaireName,
        clientId: params.id,
        viewOnly: isDraft ? 'false' : 'true',
      },
    } as any);
  };

  const handleViewResponse = () => {
    router.push({
      pathname: '/client/[id]/questionnaire-response',
      params: {
        id: params.id,
        questionnaireId: params.questionnaireId,
        questionnaireName: params.questionnaireName,
      },
    } as any);
  };

  const handleSend = () => {
    setShowSendDialog(true);
  };

  const handleConfirmSend = async () => {
    if (!coachId) return;
    setIsLoading(true);
    try {
      await sendClientQuestionnaire({
        questionnaireId: params.questionnaireId,
        clientId: params.id,
        coachId,
      });
      haptics.success();
      refreshSection('questionnaires');
      setShowSendDialog(false);
    } catch (error) {
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAgain = () => {
    setShowSendAgainDialog(true);
  };

  const handleConfirmSendAgain = async () => {
    if (!coachId) return;
    setIsLoading(true);
    try {
      await resendClientQuestionnaire({
        questionnaireId: params.questionnaireId,
        clientId: params.id,
        coachId,
      });
      haptics.success();
      refreshSection('questionnaires');
      setShowSendAgainDialog(false);
    } catch (error) {
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!coachId) return;
    setIsLoading(true);
    try {
      await deleteClientQuestionnaires({
        questionnaireIds: [params.questionnaireId],
        clientId: params.id,
        coachId,
      });
      haptics.success();
      refreshSection('questionnaires');
      setShowDeleteDialog(false);
      router.back();
    } catch (error) {
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            <Card>
              <SettingsOption
                icon={<PlatformIcon sf={isDraft ? 'pencil' : 'eye'} IconComponent={isDraft ? Pencil : Eye} size={iconSize} color={iconColor} />}
                title={isDraft ? t('clientDetail.questionnaires.viewEditForm') : t('clientDetail.questionnaires.viewForm')}
                onPress={handleViewEditForm}
                showChevron
              />
              <Separator />
              <SettingsOption
                icon={
                  <PlatformIcon
                    sf="bubble.left.and.bubble.right"
                    IconComponent={MessageSquare}
                    size={iconSize}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.questionnaires.response')}
                onPress={handleViewResponse}
                showChevron
              />
            </Card>

            <Card style={styles.actionsCard}>
              {isDraft ? (
                <SettingsOption
                  icon={<PlatformIcon sf="paperplane" IconComponent={Send} size={iconSize} color={iconColor} />}
                  title={t('clientDetail.questionnaires.sendForm')}
                  onPress={handleSend}
                  showChevron
                />
              ) : (
                <SettingsOption
                  icon={<PlatformIcon sf="arrow.clockwise" IconComponent={RefreshCw} size={iconSize} color={iconColor} />}
                  title={t('clientDetail.questionnaires.sendAgain')}
                  onPress={handleSendAgain}
                  showChevron
                />
              )}
              <Separator />
              <SettingsOption
                icon={<PlatformIcon sf="trash" IconComponent={Trash2} size={iconSize} color={iconColor} />}
                title={t('clientDetail.questionnaires.delete')}
                onPress={handleDelete}
                showChevron
              />
            </Card>
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {currentQuestionnaire?.name || params.questionnaireName}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Send Form Dialog (for draft status) */}
      <Dialog
        visible={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        title={t('clientDetail.questionnaires.sendFormTitle')}
        message={t('clientDetail.questionnaires.sendFormMessage')}
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => setShowSendDialog(false),
            variant: 'secondary',
          },
          {
            label: t('clientDetail.questionnaires.sendForm'),
            onPress: handleConfirmSend,
            variant: 'primary',
            loading: isLoading,
          },
        ]}
      />

      {/* Send Again Dialog */}
      <Dialog
        visible={showSendAgainDialog}
        onClose={() => setShowSendAgainDialog(false)}
        title={t('clientDetail.questionnaires.sendAgainTitle')}
        message={t('clientDetail.questionnaires.sendAgainMessage')}
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => setShowSendAgainDialog(false),
            variant: 'secondary',
          },
          {
            label: t('clientDetail.questionnaires.sendAgain'),
            onPress: handleConfirmSendAgain,
            variant: 'primary',
            loading: isLoading,
          },
        ]}
      />

      {/* Delete Dialog */}
      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t('clientDetail.questionnaires.deleteTitle')}
        message={t('clientDetail.questionnaires.deleteMessage')}
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => setShowDeleteDialog(false),
            variant: 'secondary',
          },
          {
            label: t('general.delete'),
            onPress: handleConfirmDelete,
            variant: 'destructive',
            loading: isLoading,
          },
        ]}
      />
    </>
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionsCard: {
    marginTop: 16,
  },
});
