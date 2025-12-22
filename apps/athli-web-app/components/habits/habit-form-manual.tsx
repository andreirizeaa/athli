'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';
import { Info } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { type HabitFormValues } from './add-habit-side-panel';

const unitOptions = [
  'steps',
  'min',
  'times',
  'count',
  'drink',
  'cups',
  'm',
  'km',
  'mile',
  'sec',
  'hour',
  'ml',
  'l',
  'oz',
  'cal',
  'g',
  'mg',
] as const;

type HabitFormManualProps = {
  form: UseFormReturn<HabitFormValues>;
  enableDuration: boolean;
  setEnableDuration: (value: boolean) => void;
  enableReminder: boolean;
  setEnableReminder: (value: boolean) => void;
};

export const HabitFormManual = ({
  form,
  enableDuration,
  setEnableDuration,
  enableReminder,
  setEnableReminder,
}: HabitFormManualProps) => {
  const t = useTranslations();

  const period = form.watch('period');
  const amount = form.watch('amount');
  const unit = form.watch('unit');
  const nameValue = form.watch('name');

  const textualRepresentation = useMemo(() => {
    if (!amount || amount === 0 || !unit) return '';
    const unitLabel = t(`habits.form.units.${unit as any}`);
    const periodText =
      period === 'daily'
        ? t('habits.form.textualRepresentationDaily')
        : t('habits.form.textualRepresentationWeekly');
    return t('habits.form.textualRepresentation', {
      amount,
      unit: unitLabel,
      period: periodText,
    });
  }, [amount, unit, period, t]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span>
                  {t('habits.form.name')}
                  <RequiredAsterisk />
                </span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder={t('habits.form.namePlaceholder')}
                    aria-label={t('habits.form.name')}
                    maxLength={60}
                    className="pr-12"
                    {...field}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    {nameValue?.length || 0} / 60
                  </span>
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('habits.form.description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('habits.form.descriptionPlaceholder')}
                  aria-label={t('habits.form.description')}
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <Label>
            <span>
              {t('habits.form.amountUnitPeriod')}
              <RequiredAsterisk />
            </span>
          </Label>

          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="w-[20%]">
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t('habits.form.amount')}
                      aria-label={t('habits.form.amount')}
                      min="1"
                      step="1"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? 0 : value);
                      }}
                      value={field.value === 0 ? '' : field.value}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem className="w-[20%]">
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-label={t('habits.form.unit')} className="w-full">
                        <SelectValue placeholder={t('habits.form.unit')} />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unitOption) => (
                          <SelectItem key={unitOption} value={unitOption}>
                            {t(`habits.form.units.${unitOption}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="text-muted-foreground px-2">/</div>
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) {
                          field.onChange(value as 'daily' | 'weekly');
                        }
                      }}
                      variant="outline"
                      spacing={0}
                    >
                      <ToggleGroupItem value="daily" aria-label={t('habits.form.daily')}>
                        {t('habits.form.daily')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="weekly" aria-label={t('habits.form.weekly')}>
                        {t('habits.form.weekly')}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="min-h-[20px]">
            {textualRepresentation && (
              <p className="text-sm text-muted-foreground">{textualRepresentation}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={enableDuration}
              onCheckedChange={(checked) => {
                setEnableDuration(checked);
                if (checked) {
                  form.setValue('duration', 30);
                } else {
                  form.setValue('duration', undefined);
                }
              }}
              className={enableDuration ? '!data-[state=checked]:bg-primary' : ''}
              aria-label={t('habits.form.duration')}
            />
            <Label className="cursor-pointer">
              {t('habits.form.duration')}
            </Label>
          </div>
          {enableDuration && (
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        aria-label={t('habits.form.duration')}
                        min="1"
                        step="1"
                        className="w-[100%]"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                          field.onChange(value === undefined || isNaN(value) ? undefined : value);
                        }}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Label className="text-sm text-muted-foreground">
                {t('habits.form.durationLabel')}
              </Label>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={enableReminder}
              onCheckedChange={(checked) => {
                setEnableReminder(checked);
                if (checked) {
                  form.setValue('reminderTime', '07:00');
                  form.setValue('reminderMessage', '');
                } else {
                  form.setValue('reminderTime', undefined);
                  form.setValue('reminderMessage', undefined);
                }
              }}
              className={enableReminder ? '!data-[state=checked]:bg-primary' : ''}
              aria-label={t('habits.form.reminder')}
            />
            <Label className="cursor-pointer">
              {t('habits.form.reminder')}
            </Label>
          </div>
          {enableReminder && (
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="reminderTime"
                render={({ field }) => (
                  <FormItem className="w-[20%]">
                    <FormLabel className="text-sm">{t('habits.form.reminderTime')}</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        aria-label={t('habits.form.reminderTime')}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reminderMessage"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <FormLabel className="text-sm">{t('habits.form.reminderMessage')}</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This message will appear on the clients notification message</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <Input
                        placeholder={t('habits.form.reminderMessagePlaceholder')}
                        aria-label={t('habits.form.reminderMessage')}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </form>
    </Form>
  );
};



