'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, FileText, Info, Edit, Check, Loader2 } from 'lucide-react';
import { getQuestionnaires, type Questionnaire as Form } from '@/api/coach/coach-questionnaire-service';
import { assignForm, convertScheduleToCron, type AssignFormScheduleData } from '@/api/client/client-form-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';

type AddQuestionnaireSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (formId: string, scheduleData: any) => Promise<void>;
  clientId?: string;
  coachId?: string;
};

export const AddQuestionnaireSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
  coachId,
}: AddQuestionnaireSidePanelProps) => {
  const t = useTranslations();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

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
    setSelectedForms(new Set());
    setSearchQuery('');
    onOpenChange(false);
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
    if (selectedForms.size === 0 || !clientId || !coachId) return;

    setIsSaving(true);
    try {
      for (const formId of selectedForms) {
        const form = forms.find(f => f.id === formId);
        if (!form) continue;

        const scheduleData = getDefaultScheduleData();
        const cronExpression = convertScheduleToCron(scheduleData);

        await assignForm({
          formId: form.id,
          clientId: clientId,
          coachId: coachId,
          formType: 'questionnaire',
          cronExpression: cronExpression,
          scheduleData: scheduleData,
        });

        if (onSave) {
          await onSave(form.id, scheduleData);
        }
      }

      handleClose();
    } catch (error) {
      console.error('Failed to assign forms:', error);
    } finally {
      setIsSaving(false);
    }
  };


  const columns: ColumnDefinition<Form>[] = useMemo(() => [
    {
      id: 'name',
      label: t('forms.detail.addQuestion.question'),
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">{t('forms.detail.addQuestion.question')}</span>
          </div>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedForms((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(row.id)) {
                  newSet.delete(row.id);
                } else {
                  newSet.add(row.id);
                }
                return newSet;
              });
            }}
          >
            <Checkbox checked={isSelected} />
          </div>
          <div className="flex items-center gap-3 w-full min-w-0">
            <FileText className="size-4 text-muted-foreground" />
            <span className="truncate text-sm">{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'questions',
      label: 'Questions',
      width: { class: 'min-w-[120px]', pixel: '120px' },
      renderCell: (row) => (
        <span className="truncate text-sm">
          {row.questionCount ?? row.questions?.length ?? 0} {t('forms.questions')}
        </span>
      ),
    },
  ], [t, setSelectedForms]);

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
      title={clientId ? t('general.assign') + ' Questionnaire' : t('athletes.profile.questionnaires.addQuestionnaire')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px] h-full flex flex-col"
      footer={
        forms.length > 0 ? (
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              {t('general.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={selectedForms.size === 0 || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {selectedForms.size > 0 ? `${t('general.assign')} ${selectedForms.size} ${selectedForms.size === 1 ? 'Questionnaire' : 'Questionnaires'}` : t('general.assign')}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-6 flex-1 min-h-0 px-1 pt-1">
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
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('general.loading')}</p>
          </div>
        ) : forms.length > 0 ? (
          <div className="flex-1 min-h-0 h-full">
            <DataGrid
              data={forms}
              columns={columns}
              getRowId={(row) => row.id}
              gridKey="add-questionnaire-library"
              searchPlaceholder={t('forms.searchPlaceholder')}
              searchFields={[(row) => `${row.name} ${row.description || ''}`]}
              enableSearch={true}
              enableEditColumns={false}
              enableExport={false}
              enableRowSelection={true}
              selectOnRowClick={true}
              selectedRowIds={selectedForms}
              onSelectionChange={setSelectedForms}
              emptyMessage={t('forms.emptyMessage')}
              rowHeight="54px"
              compactMode={true}
              showPagination={false}
              gridPadding={false}
            />
          </div>
        ) : null}
      </div>
    </SidePanel>
  );
};
