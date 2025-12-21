'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight, Plus, GripVertical, Edit } from 'lucide-react';
import { type Form, addQuestion, reorderQuestions } from '@/lib/coach/coach-form-service';
import { formTemplates } from '@/constants/forms';
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EditCheckInFormSidePanel } from '@/components/forms/edit-check-in-form-side-panel';
import { AddQuestionSidePanel } from '@/components/forms/add-question-side-panel';
import { FormDetailContent } from '@/components/forms/form-detail-content';

// Mock forms data - in production this would come from an API
const mockForms: Form[] = [
  {
    id: 'form-1',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'form-2',
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    questionCount: 0,
    createdAt: Date.now() - 86400000 * 3,
  },
];

import type { Question } from '@/components/forms/form-detail-content';

const CheckInFormDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ formId: string }>();
  const router = useRouter();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const reorderedQuestionsRef = useRef<Question[] | null>(null);

  // Load questions from sessionStorage on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check for questions from template in sessionStorage
    const storedQuestions = sessionStorage.getItem(`form-questions-${formId}`);
    if (storedQuestions) {
      try {
        const parsedQuestions = JSON.parse(storedQuestions);
        // Clear the stored questions
        sessionStorage.removeItem(`form-questions-${formId}`);
        // Convert template questions to Question format with IDs
        const convertedQuestions = parsedQuestions.map((q: any, index: number) => ({
          id: `q${Date.now()}-${index}`,
          question: q.question,
          required: q.required,
          format: q.format,
          options: q.options,
          scaleFrom: q.scaleFrom,
          scaleTo: q.scaleTo,
          mediaCount: q.mediaCount,
          metricId: q.metricId,
        }));
        setQuestions(convertedQuestions);
        return;
      } catch (error) {
        console.error('Failed to parse stored questions:', error);
      }
    }
    
    // Mock questions for Weekly Check-in
    if (formId === 'form-2') {
      setQuestions([
        {
          id: 'q1',
          question: 'How would you rate your week overall?',
          required: true,
          format: 'rating',
        },
        {
          id: 'q2',
          question: 'Did you complete all scheduled workouts this week?',
          required: true,
          format: 'yesNo',
        },
        {
          id: 'q3',
          question: 'How are you feeling physically?',
          required: true,
          format: 'scale',
          scaleFrom: '1 / Very poor',
          scaleTo: '10 / Excellent',
        },
      ]);
    }
  }, [formId]);

  const form = mockForms.find((f) => f.id === formId);

  // Determine form type from template
  const formType = useMemo(() => {
    if (!form) return 'check-in';
    const template = formTemplates.find((t) => t.name === form.name);
    return template?.schedule?.type || 'check-in';
  }, [form]);

  useEffect(() => {
    if (form) {
      setCurrentForm(form);
    }
  }, [form]);

  // Ensure preview index is within bounds
  useEffect(() => {
    if (questions.length === 0) {
      setPreviewQuestionIndex(0);
    } else if (previewQuestionIndex >= questions.length) {
      setPreviewQuestionIndex(questions.length - 1);
    }
  }, [questions.length, previewQuestionIndex]);

  if (!form) {
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
      router.push(`${path}?tab=${tabType}`);
    } else {
      router.push(path);
    }
  };

  const handleEditForm = (updatedForm: Form) => {
    setCurrentForm(updatedForm);
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
          questionIds: questionsToReorder.map((q) => q.id),
        });
        reorderedQuestionsRef.current = null;
      } catch (error) {
        console.error('Failed to reorder questions:', error);
      }
    }
  };

  const handleOpenAddQuestion = () => {
    setIsAddQuestionOpen(true);
  };

  const handleAddQuestion = async (questionData: any) => {
    try {
      const newQuestion = await addQuestion({
        formId: formId,
        question: questionData.question,
        required: questionData.required,
        format: questionData.format,
        options: questionData.options,
        scaleFrom: questionData.scaleFrom,
        scaleTo: questionData.scaleTo,
        mediaCount: questionData.mediaCount,
        metricId: questionData.metricId,
      });
      
      // Ensure metricId is preserved if it exists in questionData
      const questionWithMetric = {
        ...newQuestion,
        metricId: questionData.metricId || newQuestion.metricId,
      };
      
      setQuestions([...questions, questionWithMetric]);
      // Navigate to the newly added question in preview
      setPreviewQuestionIndex(questions.length);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const handleReorder = (newData: any[]) => {
    // Filter out the add row before saving
    const filteredData = newData.filter((item) => !item._isAddRow) as Question[];
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
                    onClick={() => handleBreadcrumbClick('/forms')}
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
                    onClick={() => handleBreadcrumbClick('/forms', 'check-ins')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('forms.tabs.checkIns')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {currentForm?.name || form.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold">{currentForm?.name || form.name}</h1>
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

      <FormDetailContent
        formId={formId}
        form={form}
        questions={questions}
        setQuestions={setQuestions}
        previewQuestionIndex={previewQuestionIndex}
        setPreviewQuestionIndex={setPreviewQuestionIndex}
        onEditForm={() => setIsEditFormOpen(true)}
        isReorderMode={isReorderMode}
        onToggleReorder={handleToggleReorder}
        onOpenAddQuestion={handleOpenAddQuestion}
        onReorder={handleReorder}
      />

      <AddQuestionSidePanel
        open={isAddQuestionOpen}
        onOpenChange={setIsAddQuestionOpen}
        onSave={handleAddQuestion}
      />

      <EditCheckInFormSidePanel
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        form={currentForm}
        onSave={handleEditForm}
      />
    </div>
  );
};

export default CheckInFormDetailPage;

