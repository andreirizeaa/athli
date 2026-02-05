'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { FormBuilder, type Question } from '@/components/forms/form-builder';
import { Plus, ArrowUpDown, Loader2 } from 'lucide-react';
import { type CheckIn } from '@/api/coach/coach-check-in-service';
import { type Questionnaire } from '@/api/coach/coach-questionnaire-service';
import {
  getClientCheckInById,
  getClientQuestionnaireById,
  updateClientCheckIn,
  updateClientQuestionnaire,
} from '@/api/client/client-form-service';
import { toast } from 'sonner';

type Form = CheckIn | Questionnaire;

type FormDetailSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formType: 'check-in' | 'questionnaire';
  clientId: string;
  coachId: string;
  onSave?: () => void;
};

export const FormDetailSidePanel = ({
  open,
  onOpenChange,
  formId,
  formType,
  clientId,
  coachId,
  onSave,
}: FormDetailSidePanelProps) => {
  const t = useTranslations();
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState<number>(0);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState<boolean>(false);

  useEffect(() => {
    if (open && formId) {
      fetchFormData();
    }
  }, [open, formId, formType, clientId, coachId]);

  const fetchFormData = async () => {
    setIsLoading(true);
    try {
      if (formType === 'check-in') {
        const data = await getClientCheckInById(clientId, coachId, formId);
        setForm(data as unknown as Form);
        setQuestions(data.questions || []);
      } else {
        const data = await getClientQuestionnaireById(clientId, coachId, formId);
        setForm(data as unknown as Form);
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to fetch form data:', error);
      toast.error(t('general.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setForm(null);
    setQuestions([]);
    setPreviewQuestionIndex(0);
    setIsReorderMode(false);
    setIsAddQuestionOpen(false);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!form) return;

    setIsSaving(true);
    try {
      if (formType === 'check-in') {
        await updateClientCheckIn({
          clientId,
          coachId,
          checkInId: formId,
          questions,
        });
      } else {
        await updateClientQuestionnaire({
          clientId,
          coachId,
          questionnaireId: formId,
          questions,
        });
      }

      toast.success(t('forms.update.success'));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleReorder = () => {
    setIsReorderMode(!isReorderMode);
  };

  const handleOpenAddQuestion = () => {
    setIsAddQuestionOpen(true);
  };

  const handleReorder = (newData: Question[]) => {
    setQuestions(newData);
  };

  const renderFooter = () => {
    return (
      <div className="flex w-full justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleReorder}
            className="gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            {isReorderMode ? t('forms.detail.actions.done') : t('forms.detail.actions.reorder')}
          </Button>
          {!isReorderMode && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddQuestionOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('forms.detail.actions.addQuestion')}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            {t('general.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('general.save')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
      title={form?.name || (formType === 'check-in' ? t('forms.checkInDetail') : t('forms.questionnaireDetail'))}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[900px] sm:max-w-[900px] h-full"
      footer={form ? renderFooter() : null}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : form ? (
        <div className="h-full flex flex-col min-h-0 -mx-4 -my-4">
          <FormBuilder
            formId={formId}
            formType={formType}
            form={form}
            questions={questions}
            setQuestions={setQuestions}
            previewQuestionIndex={previewQuestionIndex}
            setPreviewQuestionIndex={setPreviewQuestionIndex}
            isReorderMode={isReorderMode}
            onToggleReorder={handleToggleReorder}
            onOpenAddQuestion={handleOpenAddQuestion}
            onReorder={handleReorder}
            isAddQuestionOpen={isAddQuestionOpen}
            onAddQuestionOpenChange={setIsAddQuestionOpen}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>{t('forms.notFound')}</p>
        </div>
      )}
    </SidePanel>
  );
};
