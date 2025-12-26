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
import { type CheckIn as Form, addQuestion, reorderQuestions, getCheckIns } from '@/api/coach/coach-check-in-service';
import { formTemplates } from '@/constants/forms';
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EditCheckInFormSidePanel } from '@/components/forms/edit-check-in-form-side-panel';
import { AddQuestionSidePanel } from '@/components/forms/add-question-side-panel';
import { FormDetailContent } from '@/components/forms/form-detail-content';

// Removed mock check-ins data as we now fetch from the API

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const reorderedQuestionsRef = useRef<Question[] | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setIsLoading(true);
        // We can use getCheckIns and find the one with the correct ID, or add getCheckInById to service
        const allCheckIns = await getCheckIns();
        const foundForm = allCheckIns.find(f => f.id === formId);

        if (foundForm) {
          setCurrentForm(foundForm);
          setQuestions(foundForm.questions || []);
        }
      } catch (error) {
        console.error('Failed to fetch check-in:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('general.loading')}</p>
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
                    {currentForm?.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold">{currentForm?.name}</h1>
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
        form={currentForm}
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
      />


      <EditCheckInFormSidePanel
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        form={currentForm}
        onSave={handleEditForm}
        onDelete={() => router.push('/forms?tab=check-ins')}
      />
    </div>
  );
};

export default CheckInFormDetailPage;

