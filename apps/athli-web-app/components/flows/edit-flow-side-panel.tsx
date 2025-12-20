'use client';

import React from 'react';
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

type EditFlowSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  initialName: string;
  initialDescription?: string;
  onSave: (data: { name: string; description?: string }) => Promise<void>;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const EditFlowSidePanel = ({
  open,
  onOpenChange,
  flowId,
  initialName,
  initialDescription,
  onSave,
}: EditFlowSidePanelProps) => {
  const t = useTranslations();

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('flows.form.nameRequired'))
      .max(100, t('flows.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const reactForm = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: initialName,
      description: initialDescription || '',
    },
  });

  // Reset form when modal opens with new initial values
  React.useEffect(() => {
    if (open) {
      reactForm.reset({
        name: initialName,
        description: initialDescription || '',
      });
    }
  }, [open, initialName, initialDescription, reactForm]);

  const handleClose = () => {
    reactForm.reset();
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    try {
      await onSave({
        name: values.name,
        description: values.description,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to update flow details:', error);
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('flows.editFlow')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={reactForm.handleSubmit(handleSave)}
            disabled={!reactForm.formState.isValid}
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
                    {t('flows.form.name')}
                    <RequiredAsterisk />
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('flows.form.namePlaceholder')}
                    aria-label={t('flows.form.name')}
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
                <FormLabel>{t('flows.form.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('flows.form.descriptionPlaceholder')}
                    aria-label={t('flows.form.description')}
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
    </SidePanel>
  );
};
