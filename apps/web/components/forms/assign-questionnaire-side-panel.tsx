'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Info, Edit } from 'lucide-react';
import Link from 'next/link';
import { getQuestionnaires, type Questionnaire as CoachQuestionnaire } from '@/api/coach/coach-questionnaire-service';
import { assignForm, convertScheduleToCron, type AssignFormScheduleData, createClientQuestionnaire } from '@/api/client/client-form-service';
import { formTemplates, type FormTemplate } from '@/constants/forms';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { toast } from 'sonner';

type AssignQuestionnaireSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  clientId: string;
  coachId: string;
  clientName?: string;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AssignQuestionnaireSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
  coachId,
  clientName,
}: AssignQuestionnaireSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'yourLibrary' | 'athliLibrary' | 'newQuestionnaire'>('yourLibrary');
  const [coachQuestionnaires, setCoachQuestionnaires] = useState<CoachQuestionnaire[]>([]);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState<boolean>(false);
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter templates to only show questionnaire templates
  const questionnaireTemplates = useMemo(() => {
    return formTemplates.filter((template) =>
      template.schedule?.type === 'questionnaire'
    );
  }, []);

  useEffect(() => {
    if (open && activeTab === 'yourLibrary') {
      fetchCoachQuestionnaires();
    }
  }, [open, activeTab]);

  const fetchCoachQuestionnaires = async () => {
    setIsLoadingQuestionnaires(true);
    try {
      const questionnaires = await getQuestionnaires();
      setCoachQuestionnaires(questionnaires);
    } catch (error) {
      console.error('Failed to fetch coach questionnaires:', error);
    } finally {
      setIsLoadingQuestionnaires(false);
    }
  };

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('forms.form.nameRequired'))
      .max(100, t('forms.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const form = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleClose = () => {
    form.reset();
    setActiveTab('yourLibrary');
    setSelectedQuestionnaires(new Set());
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const getDefaultScheduleData = (): AssignFormScheduleData => {
    // Questionnaires are always one-time and sent immediately
    return {
      type: 'one-time',
      sendNow: true,
    };
  };

  const handleSaveFromYourLibrary = async () => {
    if (selectedQuestionnaires.size === 0 || !clientId || !coachId) return;

    setIsSaving(true);
    try {
      for (const questionnaireId of selectedQuestionnaires) {
        const questionnaire = coachQuestionnaires.find(q => q.id === questionnaireId);
        if (!questionnaire) continue;

        const scheduleData = getDefaultScheduleData();
        const cronExpression = convertScheduleToCron(scheduleData);

        // If 0 questions, set as draft
        const questionCount = questionnaire.questionCount ?? questionnaire.questions?.length ?? 0;
        const status = questionCount === 0 ? 'draft' : undefined;

        await assignForm({
          formId: questionnaire.id,
          clientId: clientId,
          coachId: coachId,
          formType: 'questionnaire',
          cronExpression: cronExpression,
          scheduleData: scheduleData,
          status,
        });
      }

      toast.success(t('forms.assign.success'));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to assign questionnaires:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFromAthliLibrary = async () => {
    if (!selectedTemplate || !clientId || !coachId) return;

    setIsSaving(true);
    try {
      // Create client-specific questionnaire from template
      await createClientQuestionnaire({
        clientId,
        coachId,
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        questions: selectedTemplate.questions,
      });

      toast.success(t('forms.create.success', { name: selectedTemplate.name }));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to create client questionnaire:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewQuestionnaire = async (values: FormFormValues) => {
    if (!clientId || !coachId) return;

    setIsSaving(true);
    try {
      const questions = selectedTemplate?.questions || [];

      // Create client-specific questionnaire
      await createClientQuestionnaire({
        clientId,
        coachId,
        name: values.name,
        description: values.description || '',
        questions,
      });

      toast.success(t('forms.create.success', { name: values.name }));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to create client questionnaire:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    form.setValue('name', template.name, { shouldValidate: true });
    form.setValue('description', template.description || '', { shouldValidate: true });
  };

  const getButtonText = () => {
    if (activeTab === 'yourLibrary') {
      const count = selectedQuestionnaires.size;
      return count > 0 ? `${t('general.assign')} ${count} ${count === 1 ? 'Questionnaire' : 'Questionnaires'}` : t('general.assign');
    }
    return t('general.assign');
  };

  const isValid = activeTab === 'yourLibrary'
    ? selectedQuestionnaires.size > 0
    : activeTab === 'athliLibrary'
      ? selectedTemplate !== null
      : form.formState.isValid && form.watch('name').trim() !== '';

  const yourLibraryColumns: ColumnDefinition<CoachQuestionnaire>[] = useMemo(() => [
    {
      id: 'name',
      label: t('forms.form.name'),
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">{t('forms.form.name')}</span>
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
              setSelectedQuestionnaires((prev) => {
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
  ], [t, setSelectedQuestionnaires]);

  const templateColumns: ColumnDefinition<FormTemplate>[] = useMemo(() => [
    {
      id: 'name',
      label: t('forms.form.name'),
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderCell: (row) => (
        <div className="flex items-center gap-3 w-full min-w-0">
          <FileText className="size-4 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'questions',
      label: 'Questions',
      width: { class: 'min-w-[120px]', pixel: '120px' },
      renderCell: (row) => (
        <span className="truncate text-sm text-muted-foreground">
          {row.questions.length} {row.questions.length === 1 ? 'question' : 'questions'}
        </span>
      ),
    },
  ], [t]);

  // Compute footer props based on active tab
  const footerSaveHandler = activeTab === 'yourLibrary'
    ? handleSaveFromYourLibrary
    : activeTab === 'athliLibrary'
      ? handleSaveFromAthliLibrary
      : form.handleSubmit(handleSaveNewQuestionnaire);

  const footerSaveText = activeTab === 'yourLibrary' ? getButtonText() : t('general.assign');

  const footerIsSaveDisabled = activeTab === 'yourLibrary'
    ? selectedQuestionnaires.size === 0
    : activeTab === 'athliLibrary'
      ? !selectedTemplate
      : !isValid;

  const showAlert = !!clientName && activeTab !== 'yourLibrary';

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
      title={t('general.assign') + ' Questionnaire'}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      onSave={footerSaveHandler}
      saveText={footerSaveText}
      isSaving={isSaving}
      isSaveDisabled={footerIsSaveDisabled}
      onCancel={handleClose}
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'yourLibrary' | 'athliLibrary' | 'newQuestionnaire')} className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="yourLibrary"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.yourLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="athliLibrary"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.athliLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="newQuestionnaire"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('forms.newQuestionnaire')}
          </TabsTrigger>
        </TabsList>

        {showAlert && (
          <Alert className="bg-primary/5 border-primary/20 text-primary mb-6">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              Questionnaires created here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general questionnaire, navigate to the respective main page in <Link href="/forms" className="underline hover:no-underline"><strong>Library</strong></Link>.
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="yourLibrary" className="mt-0 h-full flex flex-col min-h-0">
          {isLoadingQuestionnaires ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('general.loading')}</p>
            </div>
          ) : coachQuestionnaires.length === 0 ? (
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
          ) : (
            <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
              <DataGrid
                data={coachQuestionnaires}
                columns={yourLibraryColumns}
                getRowId={(row) => row.id}
                gridKey="assign-questionnaire-your-library"
                searchPlaceholder={t('forms.searchPlaceholder')}
                searchFields={[(row) => `${row.name} ${row.description || ''}`]}
                enableSearch={true}
                enableEditColumns={false}
                enableExport={false}
                enableRowSelection={true}
                selectOnRowClick={true}
                selectedRowIds={selectedQuestionnaires}
                onSelectionChange={setSelectedQuestionnaires}
                emptyMessage={t('forms.emptyMessage')}
                rowHeight="54px"
                compactMode={true}
                showPagination={false}
                gridPadding={false}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="athliLibrary" className="mt-0 h-full flex-1 flex flex-col min-h-0">
          {selectedTemplate ? (
            <div className="flex flex-col gap-6 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium leading-none">
                  {t('forms.template')}
                </Label>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {selectedTemplate.name}
                      </span>
                      {selectedTemplate.description && (
                        <span className="text-xs text-muted-foreground">
                          {selectedTemplate.description}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {selectedTemplate.questions.length} {selectedTemplate.questions.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTemplate(null)}
                      className="h-8 w-8 flex-shrink-0"
                      aria-label={t('general.change')}
                    >
                      <Edit className="size-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="flex flex-col gap-2 flex-1 min-h-0">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  <span>
                    {t('forms.template')}
                    <RequiredAsterisk />
                  </span>
                </label>
                <div className="flex-1 min-h-0 [&_.border-t]:border-t-0">
                  <DataGrid
                    data={questionnaireTemplates}
                    columns={templateColumns}
                    getRowId={(row) => row.name}
                    gridKey="assign-questionnaire-athli-templates"
                    searchPlaceholder={t('forms.searchPlaceholder')}
                    searchFields={[(row) => `${row.name} ${row.description || ''}`]}
                    enableSearch={true}
                    enableEditColumns={false}
                    enableExport={false}
                    enableRowSelection={false}
                    selectOnRowClick={true}
                    onRowClick={(row) => {
                      handleSelectTemplate(row);
                    }}
                    emptyMessage={t('forms.emptyMessage')}
                    rowHeight="54px"
                    compactMode={true}
                    showPagination={false}
                    gridPadding={false}
                  />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="newQuestionnaire" className="mt-0">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSaveNewQuestionnaire)(e);
              }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span>
                          {t('forms.form.name')}
                          <RequiredAsterisk />
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('forms.form.namePlaceholder')}
                          aria-label={t('forms.form.name')}
                          maxLength={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('forms.form.descriptionPlaceholder')}
                        aria-label={t('forms.form.description')}
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTemplate && (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium leading-none">
                    {t('forms.template')}
                  </Label>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {selectedTemplate.name}
                        </span>
                        {selectedTemplate.description && (
                          <span className="text-xs text-muted-foreground">
                            {selectedTemplate.description}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {selectedTemplate.questions.length} {selectedTemplate.questions.length === 1 ? 'question' : 'questions'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTemplate(null)}
                        className="h-8 w-8 flex-shrink-0"
                        aria-label={t('general.change')}
                      >
                        <Edit className="size-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};
