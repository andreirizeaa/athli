'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { type Form, addQuestion, reorderQuestions } from '@/lib/coach/coach-form-service';
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { AddQuestionSidePanel } from '@/components/forms/add-question-side-panel';
import { EditQuestionSidePanel } from '@/components/forms/edit-question-side-panel';
import { FormPreviewContainer } from '@/components/forms/form-preview-container';

export type Question = {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
};

type FormDetailContentProps = {
  formId: string;
  form: Form;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  previewQuestionIndex: number;
  setPreviewQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  onEditForm?: () => void;
  isReorderMode: boolean;
  onToggleReorder: () => void;
  onOpenAddQuestion: () => void;
  onReorder?: (newData: any[]) => void;
};

export const FormDetailContent = ({
  formId,
  form,
  questions,
  setQuestions,
  previewQuestionIndex,
  setPreviewQuestionIndex,
  onEditForm,
  isReorderMode,
  onToggleReorder,
  onOpenAddQuestion,
  onReorder,
}: FormDetailContentProps) => {
  const t = useTranslations();
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const handleReorder = (newData: any[]) => {
    // Filter out the add row before saving
    const filteredData = newData.filter((item) => !item._isAddRow) as Question[];
    setQuestions(filteredData);
    // Call parent's onReorder if provided
    if (onReorder) {
      onReorder(filteredData);
    }
  };

  const handleOpenAddQuestionInternal = () => {
    setIsAddQuestionOpen(true);
    onOpenAddQuestion();
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
      progressPhoto: t('forms.detail.addQuestion.formats.progressPhoto'),
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
              onClick={handleOpenAddQuestionInternal}
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
                onClick={onToggleReorder}
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
    <>
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
    </>
  );
};


