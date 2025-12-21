'use client';

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
import { createFlow } from '@/lib/coach/coach-flow-service';

type AddOnboardingSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AddOnboardingSidePanel = ({ open, onOpenChange }: AddOnboardingSidePanelProps) => {
  const t = useTranslations();

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('onboardings.form.nameRequired'))
      .max(100, t('onboardings.form.nameMaxLength')),
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

  const handleClose = () => {
    reactForm.reset();
    onOpenChange(false);
  };

  const handleSave = async (values: FormFormValues) => {
    try {
      await createFlow({
        name: values.name,
        description: values.description,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create onboarding automation:', error);
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('onboardings.addOnboardingAutomation')}
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
                    {t('onboardings.form.name')}
                    <RequiredAsterisk />
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('onboardings.form.namePlaceholder')}
                    aria-label={t('onboardings.form.name')}
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
                <FormLabel>{t('onboardings.form.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('onboardings.form.descriptionPlaceholder')}
                    aria-label={t('onboardings.form.description')}
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

