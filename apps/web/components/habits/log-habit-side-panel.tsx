'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { type Habit } from '@/api/coach/coach-habit-service';
import { checkExistingHabitLog } from '@/api/client/client-habit-log-service';
import { Info, ChevronDownIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type LogHabitFormValues = {
  assignmentId: string;
  value: string;
};

type LogHabitSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: (Habit & { assignmentId?: string })[];
  onSave: (assignmentId: string, value: number, date: Date) => Promise<void>;
  preselectedHabitId?: string;
  clientId: string;
  coachId: string;
};

export const LogHabitSidePanel = ({
  open,
  onOpenChange,
  habits,
  onSave,
  preselectedHabitId,
  clientId,
  coachId,
}: LogHabitSidePanelProps) => {
  const t = useTranslations();
  const [existingLog, setExistingLog] = useState<{ value: number; status: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

  const watchedAssignmentId = form.watch('assignmentId');

  useEffect(() => {
    if (open) {
      form.reset({
        assignmentId: preselectedHabitId || '',
        value: '',
      });
      setSelectedDate(new Date());
      setExistingLog(null);
    }
  }, [open, form, preselectedHabitId]);

  // Check for existing log when assignment or date changes
  useEffect(() => {
    const checkLog = async () => {
      if (!watchedAssignmentId || !selectedDate || !clientId || !coachId) {
        setExistingLog(null);
        return;
      }

      setIsChecking(true);
      try {
        const result = await checkExistingHabitLog({
          assignmentId: watchedAssignmentId,
          date: selectedDate,
          clientId,
          coachId,
        });

        if (result.exists && result.log) {
          setExistingLog({
            value: result.log.value,
            status: result.log.status,
          });
        } else {
          setExistingLog(null);
        }
      } catch (error) {
        console.error('Error checking existing log:', error);
        setExistingLog(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkLog();
  }, [watchedAssignmentId, selectedDate, clientId, coachId]);

  const handleClose = () => {
    form.reset();
    setExistingLog(null);
    onOpenChange(false);
  };

  const handleSave = async (values: LogHabitFormValues) => {
    setIsSaving(true);
    try {
      await onSave(values.assignmentId, Number(values.value), selectedDate);
      handleClose();
    } catch (error) {
      console.error('Failed to log habit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = !form.watch('assignmentId') || !form.watch('value') || !selectedDate;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('habits.logHabitTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onSave={form.handleSubmit(handleSave)}
      isSaving={isSaving}
      isSaveDisabled={isSaveDisabled}
      onCancel={handleClose}
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
                <Select onValueChange={field.onChange} value={field.value} disabled={!!preselectedHabitId}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('habits.logHabitForm.habitPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {habits.map((habit) => {
                      const unitLabel = habit.unit ? t(`habits.form.units.${habit.unit as any}`) : '';
                      const value = habit.assignmentId || habit.id;
                      return (
                        <SelectItem key={value} value={value}>
                          {habit.name} {habit.amount && unitLabel && `(${habit.amount} ${unitLabel})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="date" className="text-xs text-muted-foreground uppercase px-1 font-semibold flex items-center">
              Date
              <RequiredAsterisk />
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date"
                  className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors"
                  aria-label="Select date"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{selectedDate ? selectedDate.toLocaleDateString() : 'Select date'}</span>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    if (date) setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

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

          {existingLog && selectedDate && (
            <Alert className="bg-primary/5 border-primary/20 text-primary">
              <Info className="size-4" />
              <AlertDescription className="min-w-0 line-clamp-4">
                A log exists for <strong>{format(selectedDate, 'd MMM, yyyy')}</strong> with value <strong>{existingLog.value}</strong>. If you proceed, that log will be overwritten.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </SidePanel>
  );
};
