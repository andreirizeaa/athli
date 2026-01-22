'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { type CheckIn, addQuestion as addCheckInQuestion, reorderQuestions as reorderCheckInQuestions, deleteQuestion as deleteCheckInQuestion } from '@/api/coach/coach-check-in-service';
import { type Questionnaire, addQuestion as addQuestionnaireQuestion, reorderQuestions as reorderQuestionnaireQuestions, deleteQuestion as deleteQuestionnaireQuestion } from '@/api/coach/coach-questionnaire-service';

type Form = CheckIn | Questionnaire;
import { IphoneFrame } from '@/components/forms/iphone-mockup';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { AddQuestionSidePanel } from '@/components/forms/add-question-side-panel';
import { EditQuestionSidePanel } from '@/components/forms/edit-question-side-panel';
import { FormPreviewContainer } from '@/components/forms/form-preview-container';
import { getAllMetrics, type Metric } from '@/api/coach/coach-metric-service';

export type Question = {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
  metricId?: string;
};

type FormDetailContentProps = {
  formId: string;
  formType: 'check-in' | 'questionnaire';
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
  isAddQuestionOpen?: boolean;
  onAddQuestionOpenChange?: (open: boolean) => void;
};

export const FormDetailContent = ({
  formId,
  formType,
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
  isAddQuestionOpen: isAddQuestionOpenProp,
  onAddQuestionOpenChange,
}: FormDetailContentProps) => {
  const t = useTranslations();
  const [isAddQuestionOpenLocal, setIsAddQuestionOpenLocal] = useState<boolean>(false);

  const isAddQuestionOpen = isAddQuestionOpenProp !== undefined ? isAddQuestionOpenProp : isAddQuestionOpenLocal;
  const setIsAddQuestionOpen = onAddQuestionOpenChange || setIsAddQuestionOpenLocal;
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const fetchedMetrics = await getAllMetrics();
        setMetrics(fetchedMetrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };
    fetchMetrics();
  }, []);

  // Log schema for debugging as requested
  useEffect(() => {
    console.log('Form Schema:', {
      form,
      questions,
    });
  }, [form, questions]);

  const metricsMap = useMemo(() => {
    const map = new Map<string, Metric>();
    metrics.forEach((metric) => {
      map.set(metric.id, metric);
    });
    return map;
  }, [metrics]);

  /* Repair logic for questions with missing or duplicate IDs */
  useEffect(() => {
    if (!questions || questions.length === 0) return;

    const seenIds = new Set<string>();
    let needsRepair = false;

    // Check for issues
    for (const q of questions) {
      if (!q.id) {
        needsRepair = true;
        break;
      }
      if (seenIds.has(q.id)) {
        needsRepair = true;
        break;
      }
      seenIds.add(q.id);
    }

    if (needsRepair) {
      console.warn('FormDetailContent: Repairing questions with missing or duplicate IDs');
      const repairedQuestions = questions.map((q) => {
        // If ID is missing or duplicate, generate a temporary local one
        // Note: This effectively "forks" the question from the DB ID until saved
        // but it prevents the UI from crashing or checking duplicates out of existence.
        // We use a prefix to identify it.
        const isDuplicate = seenIds.has(q.id);
        if (!q.id || isDuplicate) {
          return { ...q, id: `repaired-${crypto.randomUUID()}` };
        }
        seenIds.add(q.id);
        return q;
      });

      // Update parent state with repaired questions
      // We must be careful not to trigger infinite loops, but setQuestions changes reference
      // so we should check deep equality or just trust the needsRepair flag.
      setQuestions(repairedQuestions);
    }
  }, [questions, setQuestions]);

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
      const isCheckIn = formType === 'check-in';
      const addQuestionFn = isCheckIn ? addCheckInQuestion : addQuestionnaireQuestion;

      const newQuestion = await addQuestionFn({
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


  const handleEditQuestion = (questionData: Question) => {
    setQuestions(questions.map((q) => (q.id === questionData.id ? questionData : q)));
  };

  const handleDeleteQuestion = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isCheckIn = formType === 'check-in';
      const deleteQuestionFn = isCheckIn ? deleteCheckInQuestion : deleteQuestionnaireQuestion;

      await deleteQuestionFn({
        formId: formId,
        questionId: questionId,
      });

      setQuestions(questions.filter((q) => q.id !== questionId));
      // Adjust preview index if needed
      if (previewQuestionIndex >= questions.length - 1 && previewQuestionIndex > 0) {
        setPreviewQuestionIndex(previewQuestionIndex - 1);
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
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

  const getFormatLabel = useMemo(() => {
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
      metrics: t('forms.detail.addQuestion.formats.metrics'),
    };
    return (format: string) => formatMap[format] || format;
  }, [t]);

  const columns: ColumnDefinition<any>[] = useMemo(() => [
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
        // Check if this is a metric question
        if (row.format === 'metrics' && row.metricId) {
          const metric = metricsMap.get(row.metricId);
          return (
            <div className="flex flex-col gap-0.5 py-1">
              <span className="text-sm font-medium">{row.question || ''}</span>
              {metric && (
                <span className="text-xs text-muted-foreground font-normal">{metric.name}</span>
              )}
            </div>
          );
        }

        // For non-metric questions, just show the question
        return (
          <span className="text-sm font-medium py-1">{row.question || ''}</span>
        );
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
  ], [t, isReorderMode, handleOpenAddQuestionInternal, handleDeleteQuestion, onToggleReorder, metricsMap, getFormatLabel]);

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
              getRowId={(row) => {
                if (row.id) return row.id;
                console.warn('Row missing ID in FormDetailContent:', row);
                return `temp-${JSON.stringify(row)}`;
              }}
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
            className="flex flex-col items-center justify-center overflow-hidden relative"
            style={{
              width: 'calc(30% - 0.5rem)',
              flexShrink: 0
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <IphoneFrame>
                <FormPreviewContainer
                  questions={questions}
                  currentQuestionIndex={previewQuestionIndex}
                  onNavigate={handlePreviewNavigate}
                />
              </IphoneFrame>
            </div>
          </Card>
        </div>
      </div>

      <AddQuestionSidePanel
        open={isAddQuestionOpen}
        onOpenChange={setIsAddQuestionOpen}
        onSave={handleAddQuestion}
        questions={questions}
      />

      <EditQuestionSidePanel
        open={isEditQuestionOpen}
        onOpenChange={setIsEditQuestionOpen}
        question={editingQuestion}
        onSave={handleEditQuestion}
        questions={questions}
      />
    </>
  );
};


