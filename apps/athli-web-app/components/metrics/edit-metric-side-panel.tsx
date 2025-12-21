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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Trash2 } from 'lucide-react';

type MetricFormValues = {
  name: string;
  unit: string;
  description?: string;
};

type EditMetricSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: {
    id: string;
    name: string;
    unit: string;
    description?: string;
  };
  onSave: (name: string, unit: string, description?: string) => Promise<void>;
  onDelete: (metricId: string) => Promise<void>;
};

export const EditMetricSidePanel = ({
  open,
  onOpenChange,
  metric,
  onSave,
}: EditMetricSidePanelProps) => {
  const t = useTranslations();

  const metricSchema = z.object({
    name: z.string().min(1, t('metrics.form.nameRequired')),
    unit: z.string().optional(),
    description: z.string().optional(),
  });

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    mode: 'onChange',
    defaultValues: {
      name: metric.name,
      unit: metric.unit,
      description: metric.description || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: metric.name,
        unit: metric.unit,
      });
    }
  }, [open, metric, form]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleSave = async (values: MetricFormValues) => {
    await onSave(values.name, values.unit || '', values.description);
    handleClose();
  };

  const handleDelete = async () => {
    await onDelete(metric.id);
    handleClose();
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
      title={t('metrics.editMetricTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={form.handleSubmit(handleSave)}
            disabled={!form.formState.isValid}
          >
            {t('general.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="gap-2"
            aria-label={t('metrics.actions.deleteAria', { name: metric.name })}
          >
            <Trash2 className="size-4" />
            <span>{t('general.delete')}</span>
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('metrics.form.name')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('metrics.form.namePlaceholder')}
                    aria-label={t('metrics.form.nameAria')}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('metrics.form.unit')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('metrics.form.unitPlaceholder')}
                    aria-label={t('metrics.form.unitAria')}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('metrics.form.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('metrics.form.descriptionPlaceholder')}
                    aria-label={t('metrics.form.descriptionAria')}
                    rows={3}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SidePanel>
  );
};
