'use client';

import { useState, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Info } from 'lucide-react';
import { addQuestionnaire, type AddQuestionnaireData as AddFormData } from '@/api/coach/coach-questionnaire-service';
import { formTemplates, type FormTemplate } from '@/constants/forms';
import { cn } from '@/lib/general/utils';
import { toast } from 'sonner';

type AddQuestionnaireFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (form: any, questions?: FormTemplate['questions']) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AddQuestionnaireFormSidePanel = ({ open, onOpenChange, onSave }: AddQuestionnaireFormSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'new' | 'templates'>('new');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  // Filter templates to only show questionnaire templates
  const questionnaireTemplates = useMemo(() => {
    return formTemplates.filter((template) =>
      template.schedule?.type === 'questionnaire'
    );
  }, []);

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
    setActiveTab('new');
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    try {
      const questions = selectedTemplate?.questions || [];
      const payload: any = {
        ...values,
        questions,
        num_of_questions: questions.length,
      };
      const newForm = await addQuestionnaire(payload);
      toast.success(t('forms.create.success', { name: newForm.name }));
      if (onSave) {
        onSave(newForm, selectedTemplate?.questions);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error(t('general.error'));
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    form.setValue('name', template.name, { shouldValidate: true });
    form.setValue('description', template.description || '', { shouldValidate: true });
  };

  const handleEditTemplate = () => {
    setActiveTab('templates');
  };

  const handleSaveFromTemplate = async () => {
    if (selectedTemplate) {
      const values: any = {
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        questions: selectedTemplate.questions,
        num_of_questions: selectedTemplate.questions.length,
      };
      try {
        const newForm = await addQuestionnaire(values);
        toast.success(t('forms.create.success', { name: newForm.name }));
        if (onSave) {
          onSave(newForm, selectedTemplate.questions);
        }
        handleClose();
      } catch (error) {
        console.error('Failed to save form:', error);
        toast.error(t('general.error'));
      }
    }
  };

  const isValid = activeTab === 'new'
    ? form.formState.isValid && form.watch('name').trim() !== ''
    : selectedTemplate !== null;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('forms.addQuestionnaireTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={activeTab === 'new' ? form.handleSubmit(handleSave) : handleSaveFromTemplate}
            disabled={!isValid}
          >
            {t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'templates')} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="new"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('forms.newForm')}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('forms.athliTemplates')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-0">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSave)(e);
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
                  <label className="text-sm font-medium leading-none">
                    {t('forms.template')}
                  </label>
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
                        onClick={handleEditTemplate}
                        className="h-8 w-8 flex-shrink-0"
                        aria-label={t('general.change')}
                      >
                        <Edit className="size-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              <Alert className="bg-primary/5 border-primary/20 text-primary">
                <Info className="size-4" />
                <AlertDescription className="min-w-0 line-clamp-4">
                  {t('forms.type.questionnaireInfo')}
                </AlertDescription>
              </Alert>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <span>
                  {t('forms.template')}
                  <RequiredAsterisk />
                </span>
              </label>
              <div className="flex flex-col gap-3 max-h-[calc(100vh-300px)] overflow-y-auto px-1 pt-1">
                {questionnaireTemplates.map((template) => (
                  <Card
                    key={template.name}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-accent transition-colors w-full',
                      selectedTemplate?.name === template.name && 'ring-2 ring-primary'
                    )}
                    onClick={() => {
                      handleSelectTemplate(template);
                      setActiveTab('new');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectTemplate(template);
                        setActiveTab('new');
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select template: ${template.name}`}
                  >
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {template.questions.length} {template.questions.length === 1 ? 'question' : 'questions'}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};

