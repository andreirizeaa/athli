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
import { type Habit } from '@/api/coach/coach-habit-service';

type LogHabitFormValues = {
  assignmentId: string;
  value: string;
};

type LogHabitSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: (Habit & { assignmentId?: string })[];
  onSave: (assignmentId: string, value: number) => Promise<void>;
};

export const LogHabitSidePanel = ({
  open,
  onOpenChange,
  habits,
  onSave,
}: LogHabitSidePanelProps) => {
  const t = useTranslations();

  const logHabitSchema = z.object({
    assignmentId: z.string().min(1, t('habits.logHabitForm.habitRequired')),
    value: z.string().min(1, t('habits.logHabitForm.valueRequired')).refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      t('habits.logHabitForm.valueInvalid')
    ),
  });

  const form = useForm<LogHabitFormValues>({
    resolver: zodResolver(logHabitSchema),
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

  const handleSave = async (values: LogHabitFormValues) => {
    await onSave(values.assignmentId, Number(values.value));
    handleClose();
  };

  const isSaveDisabled = !form.watch('assignmentId') || !form.watch('value');

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('habits.logHabitTitle')}
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
                  <span>{t('habits.logHabitForm.habit')}<RequiredAsterisk /></span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('habits.logHabitForm.habitPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {habits.map((habit) => {
                      const unitLabel = t(`habits.form.units.${habit.unit as any}`);
                      const value = habit.assignmentId || habit.id;
                      return (
                        <SelectItem key={value} value={value}>
                          {habit.name} {habit.amount && `(${habit.amount} ${unitLabel})`}
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
                  <span>{t('habits.logHabitForm.value')}<RequiredAsterisk /></span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    placeholder={t('habits.logHabitForm.valuePlaceholder')}
                    aria-label={t('habits.logHabitForm.valueAria')}
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
