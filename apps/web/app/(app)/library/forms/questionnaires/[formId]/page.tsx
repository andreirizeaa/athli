'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight, Plus, GripVertical, Edit, Loader2 } from 'lucide-react';
import { LibrarySidebarToggle } from '../../../library-sidebar-toggle';
import { type Questionnaire as Form, addQuestion, reorderQuestions, getQuestionnaires } from '@/api/coach/coach-questionnaire-service';
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { AddQuestionnaireFormSidePanel } from '@/components/forms/add-questionnaire-form-side-panel';
import { AddQuestionSidePanel } from '@/components/forms/add-question-side-panel';
import { FormBuilder } from '@/components/forms/form-builder';

// Removed mock forms data as we now fetch from the API

import type { Question } from '@/components/forms/form-builder';

const QuestionnaireFormDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ formId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const reorderedQuestionsRef = useRef<Question[] | null>(null);

  const fetchForm = async () => {
    try {
      setIsLoading(true);
      const allQuestionnaires = await getQuestionnaires();
      const foundForm = allQuestionnaires.find(f => f.id === formId);

      console.log('fetchForm (Questionnaire)', {
        foundForm,
        questions: foundForm?.questions,
        firstQ: foundForm?.questions?.[0]
      });

      if (foundForm) {
        setCurrentForm(foundForm);
        setQuestions(foundForm.questions || []);
      }
    } catch (error) {
      console.error('Failed to fetch questionnaire:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForm();
  }, [formId]);

  // Ensure preview index is within bounds
  useEffect(() => {
    if (questions.length === 0) {
      setPreviewQuestionIndex(0);
    } else if (previewQuestionIndex >= questions.length) {
      setPreviewQuestionIndex(questions.length - 1);
    }
  }, [questions.length, previewQuestionIndex]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-foreground" />
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('forms.detail.notFound')}</h1>
          <p className="text-muted-foreground">{t('forms.detail.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const handleBreadcrumbClick = (path: string, tabType?: 'check-ins' | 'questionnaires') => {
    if (tabType) {
      router.push(`/forms/${tabType}`);
    } else {
      router.push(path);
    }
  };

  const handleEditForm = async (updatedForm: Form) => {
    // Update local state immediately for responsive UI
    setCurrentForm(updatedForm);

    // Optionally refetch to ensure data consistency
    try {
      const allQuestionnaires = await getQuestionnaires();
      const refreshedForm = allQuestionnaires.find(f => f.id === formId);
      if (refreshedForm) {
        setCurrentForm(refreshedForm);
        setQuestions(refreshedForm.questions || []);
      }
    } catch (error) {
      console.error('Failed to refresh questionnaire after edit:', error);
    }
  };

  const handleToggleReorder = async () => {
    const wasInReorderMode = isReorderMode;
    setIsReorderMode(!isReorderMode);

    // If we're exiting reorder mode, save the new order
    if (wasInReorderMode) {
      try {
        // Use the ref if available (from handleReorder), otherwise use state
        const questionsToReorder = reorderedQuestionsRef.current || questions;
        await reorderQuestions({
          formId: formId,
          questions: questionsToReorder,
        });
        toast.success(t('forms.reorder.success'));
        reorderedQuestionsRef.current = null;
        // No need to refresh form data as IDs are now stable UUIDs
      } catch (error) {
        console.error('Failed to reorder questions:', error);
        toast.error(t('general.error'));
      }
    }
  };

  const handleOpenAddQuestion = () => {
    setIsAddQuestionOpen(true);
  };


  const handleReorder = (newData: any[]) => {
    // Filter out the add row before saving
    const filteredData = newData.filter((item) => !item._isAddRow) as Question[];

    console.log('handleReorder (Questionnaire)', {
      inputLength: newData.length,
      filteredLength: filteredData.length,
      sampleIds: filteredData.slice(0, 3).map(q => q.id)
    });

    setQuestions(filteredData);
    // Store in ref for use when exiting reorder mode
    reorderedQuestionsRef.current = filteredData;
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/library/forms')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('forms.detail.breadcrumb.forms')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/library/forms', 'questionnaires')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('forms.tabs.questionnaires')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {currentForm?.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <LibrarySidebarToggle />
              <h1 className="text-[22px] font-semibold">{currentForm?.name}</h1>
            </div>
          </div>
          <ButtonGroup className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsEditFormOpen(true)}
              className="gap-2"
            >
              <Edit className="size-4" />
              <span>{t('general.edit')}</span>
            </Button>
            <Button
              variant={isReorderMode ? "default" : "outline"}
              onClick={handleToggleReorder}
              className="gap-2"
            >
              <GripVertical className="size-4" />
              <span>{isReorderMode ? t('forms.detail.actions.done') : t('forms.detail.actions.reorder')}</span>
            </Button>
            <Button onClick={handleOpenAddQuestion} className="gap-2" disabled={isReorderMode}>
              <Plus className="size-4" />
              <span>{t('forms.detail.actions.addQuestion')}</span>
            </Button>
          </ButtonGroup>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <FormBuilder
        formId={formId}
        formType="questionnaire"
        form={currentForm as Form}
        questions={questions}
        setQuestions={setQuestions}
        previewQuestionIndex={previewQuestionIndex}
        setPreviewQuestionIndex={setPreviewQuestionIndex}
        onEditForm={() => setIsEditFormOpen(true)}
        isReorderMode={isReorderMode}
        onToggleReorder={handleToggleReorder}
        onOpenAddQuestion={handleOpenAddQuestion}
        onReorder={handleReorder}
        isAddQuestionOpen={isAddQuestionOpen}
        onAddQuestionOpenChange={setIsAddQuestionOpen}
        onQuestionsChanged={() => {
          queryClient.invalidateQueries({ queryKey: ['coach-questionnaires'] });
        }}
      />


      <AddQuestionnaireFormSidePanel
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        editingForm={currentForm}
        onSave={handleEditForm}
        onDelete={() => router.push('/library/forms/questionnaires')}
      />
    </div>
  );
};

export default QuestionnaireFormDetailPage;

