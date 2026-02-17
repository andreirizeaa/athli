import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { ChevronLeft, Check, Plus, Repeat, Pencil } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { QuestionCard } from '@/components/features/form-builder/question-card';
import {
  getQuestionnaires,
  reorderQuestions as reorderQuestionnaireQuestions,
  type Question,
  type Questionnaire,
} from '@/services/coach/coach-questionnaire-service';
import {
  getCheckIns,
  reorderQuestions as reorderCheckInQuestions,
  type CheckIn,
} from '@/services/coach/coach-check-in-service';
import {
  getClientCheckInDetail,
  getClientQuestionnaireDetail,
  saveClientCheckInQuestions,
  saveClientQuestionnaireQuestions,
} from '@/services/client/client-form-service';

type FormBuilderParams = {
  formType: 'questionnaire' | 'checkIn';
  formId: string;
  formName: string;
  clientId?: string;
  viewOnly?: string;
};

export default function FormBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<FormBuilderParams>();
  const navigation = useNavigation();

  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { setQuestionSelectCallback, setReorderQuestions, setQuestionsReorderCallback } = useModalCallbacks();
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const clientMetrics = useClientDetailStore((state) => state.metrics);
  const coachId = useClientDetailStore((state) => state.coachId);

  // View-only mode (for non-draft forms in client context)
  const isViewOnly = params.viewOnly === 'true';

  // Determine if metrics question type should be hidden
  // - In library context (no clientId): always hide metrics
  // - In client context with check-in: only show if client has metrics assigned
  const hideMetrics = useMemo(() => {
    // If not in client context (library page), hide metrics
    if (!params.clientId) {
      return true;
    }
    // If in client context with check-in, only show metrics if client has metrics
    if (params.formType === 'checkIn') {
      return clientMetrics.length === 0;
    }
    // For questionnaires in client context, show metrics
    return false;
  }, [params.clientId, params.formType, clientMetrics.length]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [formName, setFormName] = useState(params.formName || '');
  const [formDescription, setFormDescription] = useState('');

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const isQuestionnaire = params.formType === 'questionnaire';
  const isClientContext = !!params.clientId && !!coachId;

  // Fetch form data - use client endpoints when in client context
  const { data: formData, isLoading } = useQuery({
    queryKey: isClientContext
      ? ['clientForm', params.formType, params.formId, params.clientId]
      : [isQuestionnaire ? 'questionnaires' : 'checkIns'],
    queryFn: async () => {
      // When in client context, fetch the specific client form directly
      if (isClientContext) {
        if (isQuestionnaire) {
          return getClientQuestionnaireDetail(params.clientId!, params.formId, coachId);
        }
        return getClientCheckInDetail(params.clientId!, params.formId, coachId);
      }
      // Otherwise fetch from coach library
      if (isQuestionnaire) {
        return getQuestionnaires();
      }
      return getCheckIns();
    },
  });

  // Extract the specific form from the list (or use directly if client context)
  useEffect(() => {
    if (formData && params.formId) {
      // In client context, formData is already the specific form
      if (isClientContext) {
        const form = formData as { questions?: Question[]; name?: string; description?: string };
        setQuestions(form.questions || []);
        setFormName(form.name || '');
        setFormDescription(form.description || '');
      } else {
        // In library context, find form from the list
        const formList = formData as (Questionnaire | CheckIn)[];
        const form = formList.find((f) => f.id === params.formId);
        if (form) {
          setQuestions(form.questions || []);
          setFormName(form.name || '');
          setFormDescription(form.description || '');
        }
      }
    }
  }, [formData, params.formId, isClientContext]);

  // Disable swipe-to-go-back gesture when there are unsaved changes
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isDirty,
    });
  }, [navigation, isDirty]);

  // Save questions mutation (used for both reorder and adding new questions)
  const saveQuestionsMutation = useMutation({
    mutationFn: async (questionsToSave: Question[]) => {
      // Convert temp IDs to proper UUIDs before saving
      const questionsWithRealIds = questionsToSave.map(q => {
        if (!q.id || q.id.startsWith('temp-')) {
          return { ...q, id: Crypto.randomUUID() };
        }
        return q;
      });

      // Use client-specific endpoints when in client context
      if (isClientContext) {
        if (isQuestionnaire) {
          return saveClientQuestionnaireQuestions({
            questionnaireId: params.formId,
            clientId: params.clientId!,
            coachId: coachId!,
            questions: questionsWithRealIds,
          });
        }
        return saveClientCheckInQuestions({
          checkInId: params.formId,
          clientId: params.clientId!,
          coachId: coachId!,
          questions: questionsWithRealIds,
        });
      }

      // Use coach library endpoints otherwise
      if (isQuestionnaire) {
        return reorderQuestionnaireQuestions({ formId: params.formId, questions: questionsWithRealIds });
      }
      return reorderCheckInQuestions({ formId: params.formId, questions: questionsWithRealIds });
    },
    onSuccess: async () => {
      // Invalidate coach library queries
      await queryClient.invalidateQueries({ queryKey: [isQuestionnaire ? 'questionnaires' : 'checkIns'] });

      // If coming from client context, also refresh client's forms data
      if (params.clientId) {
        // Invalidate the specific client form query
        await queryClient.invalidateQueries({
          queryKey: ['clientForm', params.formType, params.formId, params.clientId]
        });
        // Refresh the client detail store section
        refreshSection(isQuestionnaire ? 'questionnaires' : 'check-ins');
      }
      haptics.success();
      setIsDirty(false);
      router.back();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorSaving'));
      setShowErrorDialog(true);
    },
  });

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    router.back();
  }, [router]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }

    router.back();
  }, [isDirty, router]);

  const handleSave = useCallback(() => {
    if (isDirty) {
      // Save all questions and navigate back
      saveQuestionsMutation.mutate(questions);
    }
  }, [isDirty, questions, saveQuestionsMutation]);

  const handleReorder = useCallback(() => {
    // Set up callback to receive reordered questions
    setQuestionsReorderCallback((reorderedQuestions: Question[]) => {
      setQuestions(reorderedQuestions);
      setIsDirty(true);
    });

    // Set the questions to reorder
    setReorderQuestions(questions);

    // Navigate to reorder page
    router.push('/library/form/reorder-questions');
  }, [questions, router, setQuestionsReorderCallback, setReorderQuestions]);

  const handleAddQuestion = useCallback(() => {
    // Set callback to receive new question from modal
    setQuestionSelectCallback((newQuestion: Question) => {
      setQuestions(prev => [...prev, newQuestion]);
      setIsDirty(true);
    });

    // Check if progress photo question already exists
    const hasProgressPhoto = questions.some(q => q.format === 'progressPhoto');
    // Collect metric IDs that are already used
    const usedMetricIds = questions
      .filter(q => q.metricId)
      .map(q => q.metricId as string);

    router.push({
      pathname: '/modals/library/add-question-modal',
      params: {
        formType: params.formType,
        formId: params.formId,
        hasProgressPhoto: hasProgressPhoto ? 'true' : 'false',
        usedMetricIds: JSON.stringify(usedMetricIds),
        hideMetrics: hideMetrics ? 'true' : 'false',
      },
    });
  }, [params.formType, params.formId, questions, router, setQuestionSelectCallback, hideMetrics]);

  const handleEditQuestion = useCallback((question: Question, index: number) => {
    // Set callback to receive edited question from modal
    setQuestionSelectCallback((editedQuestion: Question) => {
      // Only mark as dirty if the question actually changed
      const hasChanged = JSON.stringify(editedQuestion) !== JSON.stringify(question);

      if (hasChanged) {
        setQuestions(prev => {
          const newQuestions = [...prev];
          newQuestions[index] = editedQuestion;
          return newQuestions;
        });
        setIsDirty(true);
      }
    });

    // Check if progress photo question already exists (excluding the current question being edited)
    const hasProgressPhoto = questions.some((q, i) => i !== index && q.format === 'progressPhoto');
    // Collect metric IDs that are already used (excluding the current question being edited)
    const usedMetricIds = questions
      .filter((q, i) => i !== index && q.metricId)
      .map(q => q.metricId as string);

    router.push({
      pathname: '/modals/library/add-question-modal',
      params: {
        formType: params.formType,
        formId: params.formId,
        editMode: 'true',
        questionId: question.id,
        questionText: question.question,
        questionFormat: question.format,
        questionRequired: question.required ? 'true' : 'false',
        hasProgressPhoto: hasProgressPhoto ? 'true' : 'false',
        usedMetricIds: JSON.stringify(usedMetricIds),
        hideMetrics: hideMetrics ? 'true' : 'false',
        ...(question.options && { questionOptions: JSON.stringify(question.options) }),
        ...(question.scaleFrom && { questionScaleFrom: question.scaleFrom }),
        ...(question.scaleTo && { questionScaleTo: question.scaleTo }),
        ...(question.mediaCount && { questionMediaCount: String(question.mediaCount) }),
        ...(question.metricId && { questionMetricId: question.metricId }),
        ...(question.metricName && { questionMetricName: question.metricName }),
      },
    });
  }, [params.formType, params.formId, questions, router, setQuestionSelectCallback, hideMetrics]);

  const handleDeleteQuestion = useCallback((index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
    haptics.light();
  }, []);

  const handleEditMetadata = useCallback(() => {
    const modalPath = isQuestionnaire
      ? '/modals/library/add-questionnaire-modal'
      : '/modals/library/add-check-in-modal';

    router.push({
      pathname: modalPath,
      params: {
        editingId: params.formId,
        name: formName,
        description: formDescription,
        ...(params.clientId && { clientId: params.clientId }),
        ...(coachId && { coachId }),
      },
    });
  }, [isQuestionnaire, params.formId, params.clientId, formName, formDescription, router, coachId]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;


  const renderQuestionsList = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
            {t('library.formBuilder.loading')}
          </Text>
        </View>
      );
    }

    if (questions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
            {t('library.formBuilder.noQuestions')}
          </Text>
          <Text style={[styles.emptyHint, { color: themeColors.mutedText }]}>
            {t('library.formBuilder.addQuestionsHint')}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.questionsContainer}>
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id || `question-${index}`}
            question={question}
            index={index}
            isReorderMode={false}
            onDelete={() => handleDeleteQuestion(index)}
            onPress={isViewOnly ? undefined : () => handleEditQuestion(question, index)}
            hideDelete={isViewOnly}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + headerHeight },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderQuestionsList()}

        <View style={{ height: isViewOnly ? 40 : 160 }} />
      </ScrollView>

      <StatusBarBlur blurHeight={gradientHeight - insets.top} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top, height: headerHeight + insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
          {formName || t('library.formBuilder.title')}
        </Text>
        {!isViewOnly && (
          <View style={styles.headerActions}>
            <IconButton
              icon={{ sf: 'pencil', IconComponent: Pencil }}
              onPress={handleEditMetadata}
              size="md"
              color={themeColors.text}
            />
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleSave}
              size="md"
              variant={isDirty ? 'primary' : 'default'}
              disabled={!isDirty}
              loading={saveQuestionsMutation.isPending}
            />
          </View>
        )}
        {isViewOnly && <View style={{ width: 40 }} />}
      </View>

      {!isViewOnly && (
        <View style={styles.bottomBarWrapper}>
          <View style={[styles.bottomBarDivider, { backgroundColor: themeColors.border }]} />
          <View
            style={[
              styles.bottomBarContainer,
              { backgroundColor: themeColors.surfacePrimary },
            ]}
          >
            <View style={styles.buttonWrapper}>
              <PressableScale
                style={[styles.actionButton, { backgroundColor: themeColors.primary, opacity: questions.length < 2 ? 0.5 : 1 }]}
                onPress={handleReorder}
                enabled={questions.length >= 2}
              >
                <Repeat {...({ size: 18, color: themeColors.primaryForeground, style: styles.buttonIcon } as any)} />
                <Text style={[styles.actionButtonText, { color: themeColors.primaryForeground }]}>
                  {t('library.formBuilder.reorder')}
                </Text>
              </PressableScale>
            </View>

            <View style={styles.buttonWrapper}>
              <PressableScale
                style={[
                  styles.actionButton,
                  { backgroundColor: themeColors.primary }
                ]}
                onPress={handleAddQuestion}
              >
                <Plus {...({ size: 18, color: themeColors.primaryForeground, style: styles.buttonIcon } as any)} />
                <Text style={[styles.actionButtonText, { color: themeColors.primaryForeground }]}>
                  {t('library.formBuilder.addQuestion')}
                </Text>
              </PressableScale>
            </View>
          </View>
          <View
            style={[
              styles.bottomBarSafeAreaFill,
              {
                height: insets.bottom,
                backgroundColor: themeColors.surfacePrimary,
              },
            ]}
          />
        </View>
      )}

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />

      <Dialog
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={t('common.discardChanges')}
        message={t('common.discardChangesMessage')}
        buttons={[
          { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
          { label: t('common.discard'), onPress: handleDiscard, variant: 'destructive' }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    zIndex: 1001,
  },
  title: {
    ...typography.h6,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    ...typography.p2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    ...typography.p1,
    fontWeight: '500',
  },
  emptyHint: {
    ...typography.p2,
    textAlign: 'center',
  },
  questionsContainer: {
    flex: 1,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBarDivider: {
    height: 1,
  },
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    gap: 12,
  },
  bottomBarSafeAreaFill: {
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
  },
  actionButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.p1,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
