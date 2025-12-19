'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
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
import { ChevronRight, Plus, Trash2, GripVertical, Edit } from 'lucide-react';
import { type Form, addQuestion, reorderQuestions } from '@/lib/forms/form-service';
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { AddQuestionSidePanel } from '@/components/forms/add-question-side-panel';
import { EditQuestionSidePanel } from '@/components/forms/edit-question-side-panel';
import { EditFormSidePanel } from '@/components/forms/edit-form-side-panel';
import { FormPreviewContainer } from '@/components/forms/form-preview-container';

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

type Question = {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
};

const FormDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ formId: string }>();
  const router = useRouter();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [currentForm, setCurrentForm] = useState<Form | null>(null);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const reorderedQuestionsRef = useRef<Question[] | null>(null);
  const [questions, setQuestions] = useState<Question[]>(() => {
    // Check for questions from template in sessionStorage
    const storedQuestions = sessionStorage.getItem(`form-questions-${formId}`);
    if (storedQuestions) {
      try {
        const parsedQuestions = JSON.parse(storedQuestions);
        // Clear the stored questions
        sessionStorage.removeItem(`form-questions-${formId}`);
        // Convert template questions to Question format with IDs
        return parsedQuestions.map((q: any, index: number) => ({
          id: `q${Date.now()}-${index}`,
          question: q.question,
          required: q.required,
          format: q.format,
          options: q.options,
          scaleFrom: q.scaleFrom,
          scaleTo: q.scaleTo,
          mediaCount: q.mediaCount,
        }));
      } catch (error) {
        console.error('Failed to parse stored questions:', error);
      }
    }
    
    // Mock questions for Initial Assessment
    if (formId === 'form-1') {
      return [
        {
          id: 'q1',
          question: 'What is your primary fitness goal?',
          required: true,
          format: 'multipleChoice',
          options: ['Weight loss', 'Muscle gain', 'General fitness', 'Athletic performance'],
        },
        {
          id: 'q2',
          question: 'How many days per week can you commit to training?',
          required: true,
          format: 'number',
        },
        {
          id: 'q3',
          question: 'Rate your current fitness level',
          required: true,
          format: 'scale',
          scaleFrom: '1',
          scaleTo: '10',
        },
      ];
    }
    return [];
  });

  const form = mockForms.find((f) => f.id === formId);

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

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
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

  const handleReorder = (newData: any[]) => {
    // Filter out the add row before saving
    const filteredData = newData.filter((item) => !item._isAddRow) as Question[];
    setQuestions(filteredData);
    // Store in ref for use when exiting reorder mode
    reorderedQuestionsRef.current = filteredData;
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
      });
      
      setQuestions([...questions, newQuestion]);
      // Navigate to the newly added question in preview
      setPreviewQuestionIndex(questions.length);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const handleEditQuestion = (questionData: Question) => {
    setQuestions(questions.map((q) => (q.id === questionData.id ? questionData : q)));
  };

  const handleDeleteQuestion = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestions(questions.filter((q) => q.id !== questionId));
    // Adjust preview index if needed
    if (previewQuestionIndex >= questions.length - 1 && previewQuestionIndex > 0) {
      setPreviewQuestionIndex(previewQuestionIndex - 1);
    }
  };

  const handlePreviewNavigate = (index: number) => {
    setPreviewQuestionIndex(index);
  };

  const handleEditForm = (updatedForm: Form) => {
    setCurrentForm(updatedForm);
  };

  const handleRowClick = (row: any) => {
    if (row._isAddRow) return;
    setEditingQuestion(row);
    setIsEditQuestionOpen(true);
  };

  const getFormatLabel = (format: string) => {
    const formatMap: Record<string, string> = {
      text: t('forms.detail.addQuestion.formats.text'),
      number: t('forms.detail.addQuestion.formats.number'),
      multipleChoice: t('forms.detail.addQuestion.formats.multipleChoice'),
      scale: t('forms.detail.addQuestion.formats.scale'),
      yesNo: t('forms.detail.addQuestion.formats.yesNo'),
      images: t('forms.detail.addQuestion.formats.images'),
      videos: t('forms.detail.addQuestion.formats.videos'),
      date: t('forms.detail.addQuestion.formats.date'),
      rating: t('forms.detail.addQuestion.formats.rating'),
      signature: t('forms.detail.addQuestion.formats.signature'),
    };
    return formatMap[format] || format;
  };

  const columns: ColumnDefinition<any>[] = [
    {
      id: 'question',
      label: t('forms.detail.columns.question'),
      sortable: false,
      width: { class: 'w-full', pixel: '100%' },
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('forms.detail.columns.question')}
          </span>
        </div>
      ),
      renderCell: (row) => {
        if (row._isAddRow) {
          if (isReorderMode) {
            return null;
          }
          return (
            <Button
              variant="default"
              onClick={handleOpenAddQuestion}
              className="gap-2"
            >
              <Plus className="size-4" />
              <span>{t('forms.detail.actions.addQuestion')}</span>
            </Button>
          );
        }
        return <span className="text-sm">{row.question || ''}</span>;
      },
    },
    {
      id: 'required',
      label: t('forms.detail.columns.required'),
      sortable: false,
      width: { class: 'w-[120px]', pixel: '120px' },
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('forms.detail.columns.required')}
          </span>
        </div>
      ),
      renderCell: (row) => {
        if (row._isAddRow) return null;
        return <span className="text-sm">{row.required ? t('general.yes') : t('general.no')}</span>;
      },
    },
    {
      id: 'type',
      label: t('forms.detail.columns.type'),
      sortable: false,
      width: { class: 'w-[150px]', pixel: '150px' },
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('forms.detail.columns.type')}
          </span>
        </div>
      ),
      renderCell: (row) => {
        if (row._isAddRow) return null;
        return <span className="text-sm">{getFormatLabel(row.format)}</span>;
      },
    },
    {
      id: 'action',
      label: t('forms.detail.columns.action'),
      sortable: false,
      width: { class: 'w-[100px]', pixel: '100px' },
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">
            {t('forms.detail.columns.action')}
          </span>
        </div>
      ),
      renderCell: (row) => {
        if (row._isAddRow) {
          if (isReorderMode) {
            return (
              <Button
                variant="default"
                onClick={handleToggleReorder}
                className="gap-2"
              >
                <span>{t('forms.detail.actions.done')}</span>
              </Button>
            );
          }
          return null;
        }
        if (isReorderMode) {
          return (
            <div className="flex items-center justify-center h-8 w-8 cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        }
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleDeleteQuestion(row.id, e)}
            className="h-8 w-8"
            aria-label={t('general.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

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

      <div className="w-full h-full flex-1 px-4 min-h-0 py-4">
        <div className="w-full h-full flex gap-4">
          <div
            className="h-full flex flex-col"
            style={{ width: 'calc(70% - 0.5rem)', flexShrink: 0 }}
          >
            <DataGrid
              data={[
                ...questions,
                {
                  id: 'add-question-row',
                  question: '',
                  required: '',
                  type: '',
                  action: '',
                  _isAddRow: true,
                },
              ]}
              columns={columns}
              getRowId={(row) => row.id || Math.random().toString()}
              gridKey="form-questions"
              enableSearch={false}
              enableEditColumns={false}
              enableExport={false}
              enableRowSelection={false}
              stickyFirstColumn={false}
              showPagination={false}
              gridPadding={false}
              emptyMessage={t('forms.detail.emptyQuestions')}
              emptyState={null}
              onRowClick={isReorderMode ? undefined : handleRowClick}
              enableRowReordering={true}
              isReorderMode={isReorderMode}
              onReorder={handleReorder}
              fixedBottomRowFilter={(row: any) => row._isAddRow === true}
            />
          </div>
          <Card
            className="flex flex-col items-center justify-center overflow-auto"
            style={{
              width: 'calc(30% - 0.5rem)',
              flexShrink: 0
            }}
          >
            <IphoneFrame>
              <FormPreviewContainer
                questions={questions}
                currentQuestionIndex={previewQuestionIndex}
                onNavigate={handlePreviewNavigate}
              />
            </IphoneFrame>
          </Card>
        </div>
      </div>

      <AddQuestionSidePanel
        open={isAddQuestionOpen}
        onOpenChange={setIsAddQuestionOpen}
        onSave={handleAddQuestion}
      />

      <EditQuestionSidePanel
        open={isEditQuestionOpen}
        onOpenChange={setIsEditQuestionOpen}
        question={editingQuestion}
        onSave={handleEditQuestion}
      />

      <EditFormSidePanel
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        form={currentForm}
        onSave={handleEditForm}
      />
    </div>
  );
};

export default FormDetailPage;
