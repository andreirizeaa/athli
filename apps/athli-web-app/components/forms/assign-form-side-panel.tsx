'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Search, Edit, FileText, ChevronDownIcon, Info } from 'lucide-react';
import { getCheckIns, type CheckIn } from '@/lib/api/coach/coach-check-in-service';
import { getQuestionnaires, type Questionnaire } from '@/lib/api/coach/coach-questionnaire-service';

type Form = CheckIn | Questionnaire;
import { assignForm, convertScheduleToCron, type AssignFormScheduleData } from '@/lib/api/client/client-form-service';
import { cn } from '@/lib/general/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

type AssignFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (formId: string, scheduleType: 'check-in' | 'one-time', scheduleData: any) => Promise<void>;
  clientId?: string;
};

export const AssignFormSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
}: AssignFormSidePanelProps) => {
  const t = useTranslations();
  const [step, setStep] = useState<1 | 2>(1);
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [scheduleType, setScheduleType] = useState<'check-in' | 'one-time'>('check-in');
  const [checkInFrequency, setCheckInFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<'first' | 'last' | 'specific'>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);
  const [sendNow, setSendNow] = useState<boolean>(true);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (open && step === 1) {
      fetchForms();
    }
  }, [open, step]);

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const [checkIns, questionnaires] = await Promise.all([
        getCheckIns(),
        getQuestionnaires(),
      ]);
      setForms([...checkIns, ...questionnaires]);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedForm(null);
    setSearchQuery('');
    setScheduleType('check-in');
    setCheckInFrequency('daily');
    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
    setMonthlyOption('last');
    setSpecificDay(1);
    setSendNow(true);
    setScheduledDate(undefined);
    setIsCalendarOpen(false);
    onOpenChange(false);
  };

  const handleSelectForm = (form: Form) => {
    setSelectedForm(form);
    setStep(2);
  };

  const handleBackToStep1 = () => {
    setStep(1);
  };

  const handleContinue = () => {
    if (selectedForm) {
      setStep(2);
    }
  };

  const getScheduleExplanation = (): string => {
    if (scheduleType === 'one-time') {
      if (sendNow) {
        return t('athletes.profile.checkIns.schedule.explanation.oneTimeNow');
      } else if (scheduledDate) {
        return t('athletes.profile.checkIns.schedule.explanation.oneTimeScheduled', {
          date: scheduledDate.toLocaleDateString(),
        });
      } else {
        return t('athletes.profile.checkIns.schedule.explanation.oneTimePending');
      }
    } else {
      // check-in type
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
    }
    return '';
  };

  const handleSave = async () => {
    if (!selectedForm || !clientId) return;

    const scheduleData: AssignFormScheduleData = {
      type: scheduleType,
      frequency: scheduleType === 'check-in' ? checkInFrequency : undefined,
      selectedDays: scheduleType === 'check-in' && (checkInFrequency === 'daily' || checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') ? Array.from(selectedDays) : undefined,
      monthlyOption: scheduleType === 'check-in' && checkInFrequency === 'monthly' ? monthlyOption : undefined,
      specificDay: scheduleType === 'check-in' && checkInFrequency === 'monthly' && monthlyOption === 'specific' ? specificDay : undefined,
      sendNow: scheduleType === 'one-time' ? sendNow : undefined,
      scheduledDate: scheduleType === 'one-time' && !sendNow ? scheduledDate : undefined,
    };

    const cronExpression = convertScheduleToCron(scheduleData);

    try {
      await assignForm({
        formId: selectedForm.id,
        clientId: clientId,
        cronExpression: cronExpression,
        scheduleData: scheduleData,
      });

      if (onSave) {
        await onSave(selectedForm.id, scheduleType, scheduleData);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to assign form:', error);
      // TODO: Show error toast to user
    }
  };

  const isFuzzyMatch = (text: string, query: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return true;
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }

    return queryIndex === normalizedQuery.length;
  };

  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) {
      return forms;
    }

    const query = searchQuery.trim().toLowerCase();
    return forms.filter(
      (form) =>
        isFuzzyMatch(form.name, query) ||
        (form.description && isFuzzyMatch(form.description, query))
    );
  }, [forms, searchQuery]);

  const isValidStep2 = () => {
    if (scheduleType === 'one-time' && !sendNow) {
      return scheduledDate !== undefined;
    }
    return true;
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
      title={t('athletes.profile.checkIns.assignForm')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      footer={
        step === 1 ? (
          forms.length > 0 ? (
            <div className="flex w-full justify-start gap-2">
              <Button
                type="button"
                onClick={handleContinue}
                disabled={!selectedForm}
              >
                {t('general.continue')}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('general.cancel')}
              </Button>
            </div>
          ) : null
        ) : (
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isValidStep2()}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
          {!isLoading && forms.length === 0 && (
            <Alert className="bg-primary/5 border-primary/20 text-primary">
              <Info className="size-4" />
              <AlertDescription className="min-w-0 line-clamp-4">
                {t('athletes.profile.checkIns.noFormsMessage')}{' '}
                <Link href="/forms" className="underline hover:no-underline">
                  <strong>{t('athletes.profile.checkIns.formsLink')}</strong>
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}
          {forms.length > 0 && (
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('forms.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label={t('forms.searchPlaceholder')}
              />
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('general.loading')}</p>
            </div>
          ) : forms.length > 0 ? (
            filteredForms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('forms.emptyMessage')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredForms.map((form) => (
                  <Card
                    key={form.id}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-accent transition-colors',
                      selectedForm?.id === form.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => handleSelectForm(form)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectForm(form);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select form: ${form.name}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium text-foreground">{form.name}</h4>
                      </div>
                      {form.description && (
                        <p className="text-xs text-muted-foreground">{form.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {form.questionCount} {form.questionCount === 1 ? t('athletes.profile.checkIns.questions', { count: form.questionCount }) : t('athletes.profile.checkIns.questionsPlural', { count: form.questionCount })}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {selectedForm && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">{selectedForm.name}</h4>
                  </div>
                  {selectedForm.description && (
                    <p className="text-xs text-muted-foreground">{selectedForm.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToStep1}
                  className="h-8 w-8 flex-shrink-0"
                  aria-label={t('general.edit')}
                >
                  <Edit className="size-4" />
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-4">
            <Label>
              <span>
                {t('athletes.profile.checkIns.schedule.type')}
                <span className="text-destructive">*</span>
              </span>
            </Label>
            <ToggleGroup
              type="single"
              value={scheduleType}
              onValueChange={(value) => {
                if (value) {
                  setScheduleType(value as 'check-in' | 'one-time');
                }
              }}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              <ToggleGroupItem value="check-in" aria-label={t('athletes.profile.checkIns.schedule.checkIn')} className="flex-1">
                {t('athletes.profile.checkIns.schedule.checkIn')}
              </ToggleGroupItem>
              <ToggleGroupItem value="one-time" aria-label={t('athletes.profile.checkIns.schedule.oneTime')} className="flex-1">
                {t('athletes.profile.checkIns.schedule.oneTime')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-4">
            <Label>
              <span>
                {t('athletes.profile.checkIns.schedule.label')}
                <span className="text-destructive">*</span>
              </span>
            </Label>
            {scheduleType === 'one-time' && (
              <div className="space-y-4">
                <ToggleGroup
                  type="single"
                  value={sendNow ? 'send-now' : 'another-time'}
                  onValueChange={(value) => {
                    if (value === 'send-now') {
                      setSendNow(true);
                    } else if (value === 'another-time') {
                      setSendNow(false);
                    }
                  }}
                  variant="outline"
                  spacing={0}
                  className="w-full"
                >
                  <ToggleGroupItem value="send-now" aria-label={t('athletes.profile.checkIns.schedule.sendNow')} className="flex-1">
                    {t('athletes.profile.checkIns.schedule.sendNow')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="another-time" aria-label={t('athletes.profile.checkIns.schedule.anotherTime')} className="flex-1">
                    {t('athletes.profile.checkIns.schedule.anotherTime')}
                  </ToggleGroupItem>
                </ToggleGroup>
                {!sendNow && (
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="schedule-date">
                      <span>{t('athletes.profile.checkIns.schedule.date')}
                        <span className="text-destructive">*</span>
                      </span>
                    </Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="schedule-date"
                          className="w-full justify-between font-normal"
                          aria-label={t('athletes.profile.checkIns.schedule.date')}
                        >
                          {scheduledDate ? scheduledDate.toLocaleDateString() : t('athletes.profile.checkIns.schedule.selectDate')}
                          <ChevronDownIcon className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            setScheduledDate(date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            )}
            {scheduleType === 'check-in' && (
              <div className="space-y-4">
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
                  <ToggleGroupItem value="daily" aria-label={t('athletes.profile.checkIns.schedule.frequency.daily')} className="flex-1">
                    {t('athletes.profile.checkIns.schedule.frequency.daily')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.weekly')} className="flex-1">
                    {t('athletes.profile.checkIns.schedule.frequency.weekly')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="biweekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.biweekly')} className="flex-1">
                    {t('athletes.profile.checkIns.schedule.frequency.biweekly')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="monthly" aria-label={t('athletes.profile.checkIns.schedule.frequency.monthly')} className="flex-1">
                    {t('athletes.profile.checkIns.schedule.frequency.monthly')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {scheduleType === 'check-in' && (
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
                      <ToggleGroupItem value="first" aria-label={t('athletes.profile.checkIns.schedule.monthly.first')} className="flex-1">
                        {t('athletes.profile.checkIns.schedule.monthly.first')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="last" aria-label={t('athletes.profile.checkIns.schedule.monthly.last')} className="flex-1">
                        {t('athletes.profile.checkIns.schedule.monthly.last')}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="specific" aria-label={t('athletes.profile.checkIns.schedule.monthly.specific')} className="flex-1">
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
            )}

            {step === 2 && (
              <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3">
                <Info className="size-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {getScheduleExplanation()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </SidePanel>
  );
};
