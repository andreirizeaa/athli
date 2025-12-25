'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, FileText, Info, Edit } from 'lucide-react';
import { getQuestionnaires, type Questionnaire as Form } from '@/api/coach/coach-questionnaire-service';
import { assignForm, convertScheduleToCron, type AssignFormScheduleData } from '@/api/client/client-form-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

type AddQuestionnaireSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (formId: string, scheduleData: any) => Promise<void>;
  clientId?: string;
};

export const AddQuestionnaireSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
}: AddQuestionnaireSidePanelProps) => {
  const t = useTranslations();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  useEffect(() => {
    if (open) {
      fetchForms();
    }
  }, [open]);

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const fetchedForms = await getQuestionnaires();
      setForms(fetchedForms);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedForm(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleSelectForm = (form: Form) => {
    setSelectedForm(form);
  };

  const handleDeselectForm = () => {
    setSelectedForm(null);
  };

  const getDefaultScheduleData = (): AssignFormScheduleData => {
    // Questionnaires are always one-time and sent immediately
    return {
      type: 'one-time',
      sendNow: true,
    };
  };

  const getScheduleReminderText = (): string => {
    return t('athletes.profile.questionnaires.schedule.explanation.sendNow');
  };

  const handleSave = async () => {
    if (!selectedForm || !clientId) return;

    const scheduleData = getDefaultScheduleData();
    const cronExpression = convertScheduleToCron(scheduleData);

    try {
      await assignForm({
        formId: selectedForm.id,
        clientId: clientId,
        cronExpression: cronExpression,
        scheduleData: scheduleData,
      });

      if (onSave) {
        await onSave(selectedForm.id, scheduleData);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to assign form:', error);
      // TODO: Show error toast to user
    }
  };

  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return true;
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }

    return queryIndex === normalizedQuery.length;
  };

  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) {
      return forms;
    }

    const query = searchQuery.trim().toLowerCase();
    return forms.filter(
      (form) =>
        isFuzzyMatch(form.name, query) ||
        (form.description && isFuzzyMatch(form.description, query))
    );
  }, [forms, searchQuery]);


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
      title={t('athletes.profile.questionnaires.addQuestionnaire')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      footer={
        forms.length > 0 ? (
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!selectedForm}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
        {!isLoading && forms.length === 0 && (
          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              {t('athletes.profile.questionnaires.noFormsMessage')}{' '}
              <Link href="/forms" className="underline hover:no-underline">
                <strong>{t('athletes.profile.questionnaires.formsLink')}</strong>
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}
        {forms.length > 0 && (
          <div className="relative mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('forms.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label={t('forms.searchPlaceholder')}
            />
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('general.loading')}</p>
          </div>
        ) : forms.length > 0 ? (
          filteredForms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('forms.emptyMessage')}</p>
            </div>
          ) : selectedForm ? (
            <>
              <Card className="p-4 ring-2 ring-primary">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-foreground">{selectedForm.name}</h4>
                    </div>
                    {selectedForm.description && (
                      <p className="text-xs text-muted-foreground">{selectedForm.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {selectedForm.questionCount} {selectedForm.questionCount === 1 ? t('athletes.profile.questionnaires.questions', { count: selectedForm.questionCount }) : t('athletes.profile.questionnaires.questionsPlural', { count: selectedForm.questionCount })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeselectForm}
                    className="h-8 w-8 flex-shrink-0"
                    aria-label={t('general.edit')}
                  >
                    <Edit className="size-4" />
                  </Button>
                </div>
              </Card>
              <div className="flex items-start gap-2 rounded-md border bg-primary/5 border-primary/20 p-3">
                <Info className="size-4 mt-0.5 text-primary flex-shrink-0" />
                <p className="text-sm text-primary">
                  {t('athletes.profile.questionnaires.schedule.reminder')} {getScheduleReminderText()}
                </p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredForms.map((form) => (
                <Card
                  key={form.id}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelectForm(form)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectForm(form);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select form: ${form.name}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-foreground">{form.name}</h4>
                    </div>
                    {form.description && (
                      <p className="text-xs text-muted-foreground">{form.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {form.questionCount} {form.questionCount === 1 ? t('athletes.profile.questionnaires.questions', { count: form.questionCount }) : t('athletes.profile.questionnaires.questionsPlural', { count: form.questionCount })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : null}
      </div>
    </SidePanel>
  );
};
