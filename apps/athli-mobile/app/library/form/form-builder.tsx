import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { ChevronLeft, Check, Plus, Repeat, Pencil } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { hexToRgba } from '@/utils/colorUtils';
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

type FormBuilderParams = {
  formType: 'questionnaire' | 'checkIn';
  formId: string;
  formName: string;
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

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [formName, setFormName] = useState(params.formName || '');
  const [formDescription, setFormDescription] = useState('');

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const isQuestionnaire = params.formType === 'questionnaire';

  // Fetch form data
  const { data: formData, isLoading } = useQuery({
    queryKey: [isQuestionnaire ? 'questionnaires' : 'checkIns'],
    queryFn: async () => {
      if (isQuestionnaire) {
        return getQuestionnaires();
      }
      return getCheckIns();
    },
  });

  // Extract the specific form from the list
  useEffect(() => {
    if (formData && params.formId) {
      const form = formData.find((f: Questionnaire | CheckIn) => f.id === params.formId);
      if (form) {
        setQuestions(form.questions || []);
        setFormName(form.name || '');
        setFormDescription(form.description || '');
      }
    }
  }, [formData, params.formId]);

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
        if (q.id.startsWith('temp-')) {
          return { ...q, id: Crypto.randomUUID() };
        }
        return q;
      });

      if (isQuestionnaire) {
        return reorderQuestionnaireQuestions({ formId: params.formId, questions: questionsWithRealIds });
      }
      return reorderCheckInQuestions({ formId: params.formId, questions: questionsWithRealIds });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: [isQuestionnaire ? 'questionnaires' : 'checkIns'] });
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
      },
    });
  }, [params.formType, params.formId, questions, router, setQuestionSelectCallback]);

  const handleEditQuestion = useCallback((question: Question, index: number) => {
    // Set callback to receive edited question from modal
    setQuestionSelectCallback((editedQuestion: Question) => {
      setQuestions(prev => {
        const newQuestions = [...prev];
        newQuestions[index] = editedQuestion;
        return newQuestions;
      });
      setIsDirty(true);
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
        ...(question.options && { questionOptions: JSON.stringify(question.options) }),
        ...(question.scaleFrom && { questionScaleFrom: question.scaleFrom }),
        ...(question.scaleTo && { questionScaleTo: question.scaleTo }),
        ...(question.mediaCount && { questionMediaCount: String(question.mediaCount) }),
        ...(question.metricId && { questionMetricId: question.metricId }),
        ...(question.metricName && { questionMetricName: question.metricName }),
      },
    });
  }, [params.formType, params.formId, questions, router, setQuestionSelectCallback]);

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
      },
    });
  }, [isQuestionnaire, params.formId, formName, formDescription, router]);

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
            key={question.id}
            question={question}
            index={index}
            isReorderMode={false}
            onDelete={() => handleDeleteQuestion(index)}
            onPress={() => handleEditQuestion(question, index)}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      <View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={[
            hexToRgba(themeColors.backgroundSecondary, 1),
            hexToRgba(themeColors.backgroundSecondary, 0.85),
            hexToRgba(themeColors.backgroundSecondary, 0.5),
            hexToRgba(themeColors.backgroundSecondary, 0),
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={[styles.headerGradient, { height: gradientHeight }]}
          pointerEvents="none"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBack}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
            {formName || t('library.formBuilder.title')}
          </Text>
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
        </View>

        {renderQuestionsList()}

        <View style={{ height: 160 }} />
      </ScrollView>

      <View style={[
        styles.bottomBarContainer,
        {
          backgroundColor: themeColors.backgroundPrimary,
          paddingBottom: insets.bottom + 12,
          borderTopColor: themeColors.border,
        }
      ]}>
        <View style={styles.bottomBarContent}>
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
      </View>

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
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 16,
    height: 56,
    gap: 12,
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
  bottomBarContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
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
