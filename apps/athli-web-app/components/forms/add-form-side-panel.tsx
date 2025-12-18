'use client';

import { useState } from 'react';
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
import { Edit } from 'lucide-react';
import { addForm, type AddFormData } from '@/lib/forms/form-service';
import { formTemplates, type FormTemplate } from '@/lib/constants/forms';

type AddFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (form: ReturnType<typeof addForm> extends Promise<infer T> ? T : never, questions?: FormTemplate['questions']) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AddFormSidePanel = ({ open, onOpenChange, onSave }: AddFormSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'new' | 'templates'>('new');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

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
      const newForm = await addForm(values);
      if (onSave) {
        onSave(newForm);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    form.setValue('name', template.name, { shouldValidate: true });
    form.setValue('description', template.description || '', { shouldValidate: true });
  };

  const handleChangeTemplate = () => {
    setSelectedTemplate(null);
    form.setValue('name', '');
    form.setValue('description', '');
  };

  const handleTemplateKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, template: FormTemplate) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectTemplate(template);
    }
  };

  const handleSaveFromTemplate = async () => {
    if (selectedTemplate) {
      const values: AddFormData = {
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        questions: selectedTemplate.questions,
      };
      try {
        const newForm = await addForm(values);
        if (onSave) {
          onSave(newForm, selectedTemplate.questions);
        }
        handleClose();
      } catch (error) {
        console.error('Failed to save form:', error);
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
      title={t('forms.addFormTitle')}
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
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                {t('forms.template')}
                <RequiredAsterisk />
              </label>
              {selectedTemplate ? (
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
                      onClick={handleChangeTemplate}
                      className="h-8 w-8 flex-shrink-0"
                      aria-label={t('general.change')}
                    >
                      <Edit className="size-4" />
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 max-h-[calc(100vh-300px)] overflow-y-auto px-1 pt-1">
                  {formTemplates.map((template) => (
                    <Card
                      key={template.name}
                      className="p-4 cursor-pointer hover:bg-accent transition-colors w-full"
                      onClick={() => handleSelectTemplate(template)}
                      onKeyDown={(e) => handleTemplateKeyDown(e, template)}
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
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};
