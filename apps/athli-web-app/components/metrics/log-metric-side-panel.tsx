'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';

type Metric = {
  id: string;
  name: string;
  unit: string;
  description?: string;
  assignmentId?: string;
};

type LogMetricFormValues = {
  assignmentId: string;
  value: string;
};

type LogMetricSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: Metric[];
  onSave: (assignmentId: string, value: number) => Promise<void>;
};

export const LogMetricSidePanel = ({
  open,
  onOpenChange,
  metrics,
  onSave,
}: LogMetricSidePanelProps) => {
  const t = useTranslations();

  const logMetricSchema = z.object({
    assignmentId: z.string().min(1, t('metrics.logMetricForm.metricRequired')),
    value: z.string().min(1, t('metrics.logMetricForm.valueRequired')).refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      t('metrics.logMetricForm.valueInvalid')
    ),
  });

  const form = useForm<LogMetricFormValues>({
    resolver: zodResolver(logMetricSchema),
    mode: 'onChange',
    defaultValues: {
      assignmentId: '',
      value: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        assignmentId: '',
        value: '',
      });
    }
  }, [open, form]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleSave = async (values: LogMetricFormValues) => {
    await onSave(values.assignmentId, Number(values.value));
    handleClose();
  };

  const isSaveDisabled = !form.watch('assignmentId') || !form.watch('value');

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('metrics.logMetricTitle')}
      footer={
        <div className="flex items-center justify-start gap-2">
          <Button onClick={form.handleSubmit(handleSave)} disabled={isSaveDisabled}>
            {t('general.save')}
          </Button>
          <Button variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="assignmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('metrics.logMetricForm.metric')}<RequiredAsterisk /></span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('metrics.logMetricForm.metricPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {metrics.map((metric) => {
                      const value = metric.assignmentId || metric.id;
                      return (
                        <SelectItem key={value} value={value}>
                          {metric.name} {metric.unit && `(${metric.unit})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>{t('metrics.logMetricForm.value')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    placeholder={t('metrics.logMetricForm.valuePlaceholder')}
                    aria-label={t('metrics.logMetricForm.valueAria')}
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
