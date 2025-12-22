'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { editFormDetails, type Form as FormType } from '@/lib/coach/coach-form-service';
import { formTemplates } from '@/constants/forms';

type EditCheckInFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormType | null;
  onSave?: (form: FormType) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const EditCheckInFormSidePanel = ({ open, onOpenChange, form, onSave }: EditCheckInFormSidePanelProps) => {
  const t = useTranslations();
  const [checkInFrequency, setCheckInFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<'first' | 'last' | 'specific'>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);

  // Get schedule from template
  const templateSchedule = useMemo(() => {
    if (!form) return null;
    const template = formTemplates.find((t) => t.name === form.name);
    return template?.schedule;
  }, [form]);

  useEffect(() => {
    if (form && open && templateSchedule?.frequency) {
      setCheckInFrequency(templateSchedule.frequency);
      if (templateSchedule.selectedDays) {
        setSelectedDays(new Set(templateSchedule.selectedDays));
      } else if (templateSchedule.frequency === 'daily') {
        setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
      } else if (templateSchedule.frequency === 'weekly' || templateSchedule.frequency === 'biweekly') {
        setSelectedDays(new Set(['sunday']));
      }
      if (templateSchedule.monthlyOption) {
        setMonthlyOption(templateSchedule.monthlyOption);
      }
      if (templateSchedule.specificDay) {
        setSpecificDay(templateSchedule.specificDay);
      }
    }
  }, [form, open, templateSchedule]);

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

  const getScheduleExplanation = (): string => {
    if (checkInFrequency === 'daily') {
      const daysArray = Array.from(selectedDays);
      const dayNames = daysArray.map(day => t(`habits.form.${day}`)).join(', ');
      return t('athletes.profile.checkIns.schedule.explanation.daily', { days: dayNames });
    } else if (checkInFrequency === 'weekly') {
      const daysArray = Array.from(selectedDays);
      const dayName = daysArray.length > 0 ? t(`habits.form.${daysArray[0]}`) : '';
      return t('athletes.profile.checkIns.schedule.explanation.weekly', { day: dayName });
    } else if (checkInFrequency === 'biweekly') {
      const daysArray = Array.from(selectedDays);
      const dayName = daysArray.length > 0 ? t(`habits.form.${daysArray[0]}`) : '';
      return t('athletes.profile.checkIns.schedule.explanation.biweekly', { day: dayName });
    } else if (checkInFrequency === 'monthly') {
      if (monthlyOption === 'first') {
        return t('athletes.profile.checkIns.schedule.explanation.monthlyFirst');
      } else if (monthlyOption === 'last') {
        return t('athletes.profile.checkIns.schedule.explanation.monthlyLast');
      } else if (monthlyOption === 'specific') {
        return t('athletes.profile.checkIns.schedule.explanation.monthlySpecific', {
          day: `${specificDay}${specificDay === 1 ? 'st' : specificDay === 2 ? 'nd' : specificDay === 3 ? 'rd' : 'th'}`,
        });
      }
    }
    return '';
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
      title={t('forms.editDetailsAndSchedule')}
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

          <div className="space-y-4">
            <Label>
              <span>
                {t('athletes.profile.checkIns.schedule.frequency.label')}
                <span className="text-destructive">*</span>
              </span>
            </Label>
            <ToggleGroup
              type="single"
              value={checkInFrequency}
              onValueChange={(value) => {
                if (value) {
                  const newFrequency = value as 'daily' | 'weekly' | 'biweekly' | 'monthly';
                  setCheckInFrequency(newFrequency);
                  // Reset selected days based on frequency
                  if (newFrequency === 'daily') {
                    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
                  } else if (newFrequency === 'weekly' || newFrequency === 'biweekly') {
                    setSelectedDays(new Set(['sunday']));
                  }
                }
              }}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              <ToggleGroupItem value="daily" aria-label={t('athletes.profile.checkIns.schedule.frequency.daily')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {t('athletes.profile.checkIns.schedule.frequency.daily')}
              </ToggleGroupItem>
              <ToggleGroupItem value="weekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.weekly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {t('athletes.profile.checkIns.schedule.frequency.weekly')}
              </ToggleGroupItem>
              <ToggleGroupItem value="biweekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.biweekly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {t('athletes.profile.checkIns.schedule.frequency.biweekly')}
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" aria-label={t('athletes.profile.checkIns.schedule.frequency.monthly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {t('athletes.profile.checkIns.schedule.frequency.monthly')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-4 w-full">
            <Label>
              <span>
                {checkInFrequency === 'daily' && t('athletes.profile.checkIns.schedule.selectDays')}
                {(checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && t('athletes.profile.checkIns.schedule.selectDay')}
                {checkInFrequency === 'monthly' && t('athletes.profile.checkIns.schedule.dayOfMonth')}
                <span className="text-destructive">*</span>
              </span>
            </Label>
            {(checkInFrequency === 'daily' || checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && (
              <div className="flex gap-2 flex-wrap w-full justify-between">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDays.has(day)}
                      onCheckedChange={(checked) => {
                        const newSelectedDays = new Set(selectedDays);
                        if (checked) {
                          newSelectedDays.add(day);
                        } else {
                          newSelectedDays.delete(day);
                        }
                        setSelectedDays(newSelectedDays);
                      }}
                      aria-label={t(`habits.form.${day}`)}
                    />
                    <Label className="text-sm font-normal cursor-pointer" onClick={() => {
                      const newSelectedDays = new Set(selectedDays);
                      if (selectedDays.has(day)) {
                        newSelectedDays.delete(day);
                      } else {
                        newSelectedDays.add(day);
                      }
                      setSelectedDays(newSelectedDays);
                    }}>
                      {t(`habits.form.${day}`)}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {checkInFrequency === 'monthly' && (
              <div className="space-y-4">
                <ToggleGroup
                  type="single"
                  value={monthlyOption}
                  onValueChange={(value) => {
                    if (value) {
                      setMonthlyOption(value as 'first' | 'last' | 'specific');
                    }
                  }}
                  variant="outline"
                  spacing={0}
                  className="w-full"
                >
                  <ToggleGroupItem value="first" aria-label={t('athletes.profile.checkIns.schedule.monthly.first')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {t('athletes.profile.checkIns.schedule.monthly.first')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="last" aria-label={t('athletes.profile.checkIns.schedule.monthly.last')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {t('athletes.profile.checkIns.schedule.monthly.last')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="specific" aria-label={t('athletes.profile.checkIns.schedule.monthly.specific')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {t('athletes.profile.checkIns.schedule.monthly.specific')}
                  </ToggleGroupItem>
                </ToggleGroup>
                {monthlyOption === 'specific' && (
                  <div className="flex flex-col gap-2 w-full">
                    <Label>
                      <span>
                        {t('athletes.profile.checkIns.schedule.monthly.selectDay')}
                        <span className="text-destructive">*</span>
                      </span>
                    </Label>
                    <Select value={specificDay.toString()} onValueChange={(value) => setSpecificDay(parseInt(value, 10))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              {getScheduleExplanation()}
            </AlertDescription>
          </Alert>
        </form>
      </Form>
    </SidePanel>
  );
};



