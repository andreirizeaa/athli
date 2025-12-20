'use client';

import { useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { editFormDetails, type Form as FormType } from '@/lib/forms/form-service';

type EditQuestionnaireFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormType | null;
  onSave?: (form: FormType) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const EditQuestionnaireFormSidePanel = ({ open, onOpenChange, form, onSave }: EditQuestionnaireFormSidePanelProps) => {
  const t = useTranslations();

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('forms.form.nameRequired'))
      .max(100, t('forms.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const reactForm = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (form && open) {
      reactForm.reset({
        name: form.name,
        description: form.description || '',
      });
    }
  }, [form, open, reactForm]);

  const handleClose = () => {
    reactForm.reset();
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    if (!form) return;

    try {
      const updatedForm = await editFormDetails({
        id: form.id,
        name: values.name,
        description: values.description,
      });
      if (onSave) {
        onSave(updatedForm);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
    }
  };

  const hasChanges = form && (
    reactForm.watch('name') !== form.name ||
    reactForm.watch('description') !== (form.description || '')
  );

  if (!form) return null;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('forms.editFormTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={reactForm.handleSubmit(handleSave)}
            disabled={!reactForm.formState.isValid || !hasChanges}
          >
            {t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <Form {...reactForm}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reactForm.handleSubmit(handleSave)(e);
          }}
          className="flex flex-col gap-6"
        >
          <FormField
            control={reactForm.control}
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

          <FormField
            control={reactForm.control}
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

          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              {t('forms.type.questionnaireInfo')}
            </AlertDescription>
          </Alert>
        </form>
      </Form>
    </SidePanel>
  );
};

