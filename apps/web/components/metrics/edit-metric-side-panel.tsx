'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Trash2, Check, Loader2 } from 'lucide-react';
import { type MetricScheduleData, convertMetricScheduleToCron } from '@/api/client/client-metric-service';
import { ScheduleSelector, type ScheduleFrequency, type MonthlyOption } from '@/components/app/schedule-selector';

type MetricFormValues = {
  name: string;
  unit?: string;
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
    schedule_config?: MetricScheduleData;
    cron_expression?: string;
  };
  onSave: (
    name: string,
    unit: string,
    description?: string,
    scheduleConfig?: MetricScheduleData,
    cronExpression?: string
  ) => Promise<void>;
  onDelete: (metricId: string) => Promise<void>;
  /** Whether to allow schedule configuration (used for client metrics) */
  allowSchedule?: boolean;
};

export const EditMetricSidePanel = ({
  open,
  onOpenChange,
  metric,
  onSave,
  onDelete,
  allowSchedule = false,
}: EditMetricSidePanelProps) => {
  const t = useTranslations();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Schedule state - optional, controlled by checkbox
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [logFrequency, setLogFrequency] = useState<ScheduleFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<MonthlyOption>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);

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

  // Track original values to detect changes
  const originalValues = useMemo(() => ({
    name: metric.name,
    unit: metric.unit,
    description: metric.description || '',
  }), [metric]);

  // Original schedule values for comparison
  const originalSchedule = useMemo(() => metric.schedule_config, [metric]);
  const originalScheduleEnabled = useMemo(() => !!metric.schedule_config?.frequency, [metric]);

  // Watch form values to detect changes
  const currentValues = form.watch();

  // Check if form values have changed
  const hasChanges = useMemo(() => {
    const formChanged =
      currentValues.name !== originalValues.name ||
      currentValues.unit !== originalValues.unit ||
      currentValues.description !== originalValues.description;

    if (!allowSchedule) return formChanged;

    // Check if schedule enablement changed
    if (scheduleEnabled !== originalScheduleEnabled) return true;

    // If schedule is not enabled, only check form changes
    if (!scheduleEnabled) return formChanged;

    // Check if schedule changed
    const scheduleChanged =
      logFrequency !== (originalSchedule?.frequency || 'daily') ||
      JSON.stringify(Array.from(selectedDays).sort()) !== JSON.stringify((originalSchedule?.selectedDays || []).sort()) ||
      monthlyOption !== (originalSchedule?.monthlyOption || 'last') ||
      specificDay !== (originalSchedule?.specificDay || 1);

    return formChanged || scheduleChanged;
  }, [currentValues, originalValues, allowSchedule, scheduleEnabled, originalScheduleEnabled, logFrequency, selectedDays, monthlyOption, specificDay, originalSchedule]);

  useEffect(() => {
    if (open) {
      form.reset({
        name: metric.name,
        unit: metric.unit,
        description: metric.description || '',
      });

      // Reset schedule state from metric
      if (metric.schedule_config?.frequency) {
        setScheduleEnabled(true);
        setLogFrequency(metric.schedule_config.frequency || 'daily');
        setSelectedDays(new Set(metric.schedule_config.selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
        setMonthlyOption(metric.schedule_config.monthlyOption || 'last');
        setSpecificDay(metric.schedule_config.specificDay || 1);
      } else {
        setScheduleEnabled(false);
        setLogFrequency('daily');
        setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
        setMonthlyOption('last');
        setSpecificDay(1);
      }
    }
  }, [open, metric, form]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const buildScheduleData = (): { scheduleConfig: MetricScheduleData; cronExpression: string } => {
    const scheduleData: MetricScheduleData = {
      type: 'metric',
      frequency: logFrequency,
      selectedDays: Array.from(selectedDays),
      monthlyOption,
      specificDay,
    };

    const cronExpression = convertMetricScheduleToCron(scheduleData);

    return {
      scheduleConfig: scheduleData,
      cronExpression,
    };
  };

  const handleSave = async (values: MetricFormValues) => {
    setIsSaving(true);
    try {
      if (allowSchedule && scheduleEnabled) {
        const { scheduleConfig, cronExpression } = buildScheduleData();
        await onSave(values.name, values.unit || '', values.description, scheduleConfig, cronExpression);
      } else {
        // Pass undefined to clear schedule if it was previously set
        await onSave(values.name, values.unit || '', values.description, undefined, undefined);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save metric:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(metric.id);
      handleClose();
    } catch (error) {
      console.error('Failed to delete metric:', error);
    } finally {
      setIsDeleting(false);
    }
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
      contentClassName={allowSchedule ? "w-full sm:w-[600px] sm:max-w-[600px]" : "w-full sm:w-[400px] sm:max-w-[400px]"}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting || isSaving}>
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="gap-2"
            aria-label={t('metrics.actions.deleteAria', { name: metric.name })}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t('general.delete')}
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSave)}
            disabled={!form.formState.isValid || !hasChanges || isDeleting || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('general.save')}
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

          {allowSchedule && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="scheduleEnabled"
                  checked={scheduleEnabled}
                  onCheckedChange={(checked) => setScheduleEnabled(!!checked)}
                />
                <Label htmlFor="scheduleEnabled" className="text-sm font-medium cursor-pointer">
                  {t('metrics.schedule.addLogFrequency')}
                </Label>
              </div>
              {scheduleEnabled && (
                <ScheduleSelector
                  frequency={logFrequency}
                  onFrequencyChange={setLogFrequency}
                  selectedDays={selectedDays}
                  onSelectedDaysChange={setSelectedDays}
                  monthlyOption={monthlyOption}
                  onMonthlyOptionChange={setMonthlyOption}
                  specificDay={specificDay}
                  onSpecificDayChange={setSpecificDay}
                  translationPrefix="metrics.schedule"
                  showTopBorder={false}
                />
              )}
            </div>
          )}
        </form>
      </Form>
    </SidePanel>
  );
};
