'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { type Habit } from '@/api/coach/coach-habit-service';
import { HabitFormManual } from './habit-form-manual';
import { type HabitFormValues } from './add-habit-side-panel';

type EditHabitSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  onSave: (values: HabitFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
};

export const EditHabitSidePanel = ({
  open,
  onOpenChange,
  habit,
  onSave,
  onDelete,
}: EditHabitSidePanelProps) => {
  const t = useTranslations();
  const [enableDuration, setEnableDuration] = useState<boolean>(false);
  const [enableReminder, setEnableReminder] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const habitSchema = z.object({
    name: z
      .string()
      .min(1, t('habits.form.nameRequired'))
      .max(60, t('habits.form.nameMaxLength')),
    description: z.string().optional(),
    amount: z.number().int().min(1, t('habits.form.amountRequired')),
    unit: z.string().min(1, t('habits.form.unitRequired')),
    period: z.union([z.literal('daily'), z.literal('weekly')]),
    duration: z.number().int().positive().optional(),
    reminderTime: z.string().optional(),
    reminderMessage: z.string().optional(),
  });

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      amount: 0,
      unit: '',
      period: 'daily',
      duration: undefined,
      reminderTime: undefined,
      reminderMessage: undefined,
    },
  });

  useEffect(() => {
    if (habit && open) {
      form.setValue('name', habit.name);
      form.setValue('description', habit.description || '');
      form.setValue('amount', habit.amount);
      form.setValue('unit', habit.unit);
      form.setValue('period', habit.period);

      if (habit.duration) {
        form.setValue('duration', habit.duration);
        setEnableDuration(true);
      } else {
        form.setValue('duration', undefined);
        setEnableDuration(false);
      }

      if (habit.reminderTime) {
        form.setValue('reminderTime', habit.reminderTime);
        form.setValue('reminderMessage', habit.reminderMessage || '');
        setEnableReminder(true);
      } else {
        form.setValue('reminderTime', undefined);
        form.setValue('reminderMessage', undefined);
        setEnableReminder(false);
      }
    }
  }, [habit, open, form]);

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
  };

  const handleSave = async (values: HabitFormValues) => {
    setIsSaving(true);
    try {
      await onSave(values);
      handleClose();
    } catch (error) {
      console.error('Failed to save habit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      handleClose();
    } catch (error) {
      console.error('Failed to delete habit:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('habits.editHabitTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      footer={
        <div className="flex w-full justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="gap-2 text-destructive hover:bg-destructive/10"
            disabled={isDeleting || isSaving}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t('general.delete')}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting || isSaving}>
              {t('general.cancel')}
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(handleSave)}
              disabled={!form.formState.isValid || isDeleting || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t('general.save')}
            </Button>
          </div>
        </div>
      }
    >
      <HabitFormManual
        form={form}
        enableDuration={enableDuration}
        setEnableDuration={setEnableDuration}
        enableReminder={enableReminder}
        setEnableReminder={setEnableReminder}
      />
    </SidePanel>
  );
};


