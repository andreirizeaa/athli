'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { defaultHabits, type DefaultHabit } from '@/constants/habits';
import { HabitFormManual } from './habit-form-manual';
import { getAllHabits, type Habit } from '@/api/coach/coach-habit-service';
import { assignHabit } from '@/api/client/client-habit-service';

export type HabitFormValues = {
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
};

type AddHabitSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: HabitFormValues) => Promise<void>;
  clientName?: string;
  clientId?: string;
};

export const AddHabitSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientName,
  clientId,
}: AddHabitSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'newHabit' | 'library' | 'yourLibrary'>('yourLibrary');
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [coachHabits, setCoachHabits] = useState<Habit[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = useState<boolean>(false);
  const [yourLibrarySearchQuery, setYourLibrarySearchQuery] = useState<string>('');
  const [selectedLibraryHabit, setSelectedLibraryHabit] = useState<Habit | null>(null);

  useEffect(() => {
    if (open && activeTab === 'yourLibrary') {
      fetchCoachHabits();
    }
  }, [open, activeTab]);

  const fetchCoachHabits = async () => {
    setIsLoadingHabits(true);
    try {
      const habits = await getAllHabits();
      setCoachHabits(habits);
    } catch (error) {
      console.error('Failed to fetch coach habits:', error);
    } finally {
      setIsLoadingHabits(false);
    }
  };

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

  const [enableDuration, setEnableDuration] = useState<boolean>(false);
  const [enableReminder, setEnableReminder] = useState<boolean>(false);

  const handleClose = () => {
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
    setActiveTab('yourLibrary');
    setLibrarySearchQuery('');
    onOpenChange(false);
  };

  const handleSaveFromYourLibrary = async () => {
    if (selectedLibraryHabit && clientId) {
      // Assign habit from library to client
      try {
        await assignHabit({
          habitIds: [selectedLibraryHabit.id],
          clientIds: [clientId],
        });
        handleClose();
      } catch (error) {
        console.error('Failed to assign habit:', error);
      }
    }
  };

  const handleSave = async (values: HabitFormValues) => {
    await onSave(values);
    handleClose();
  };

  const handleSelectLibraryHabit = (habit: Habit) => {
    setSelectedLibraryHabit(habit);
  };

  const handleDeselectLibraryHabit = () => {
    setSelectedLibraryHabit(null);
  };

  const filteredYourLibraryHabits = useMemo(() => {
    if (!yourLibrarySearchQuery.trim()) {
      return coachHabits;
    }

    const query = yourLibrarySearchQuery.trim().toLowerCase();
    return coachHabits.filter(
      (habit) =>
        isFuzzyMatch(habit.name, query) ||
        (habit.description && isFuzzyMatch(habit.description, query))
    );
  }, [coachHabits, yourLibrarySearchQuery]);

  const handleSelectHabit = (habit: DefaultHabit) => {
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

    setActiveTab('newHabit');
  };

  const handleHabitCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, habit: DefaultHabit) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectHabit(habit);
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

  const filteredLibraryHabits = useMemo(() => {
    if (!librarySearchQuery.trim()) {
      return defaultHabits;
    }

    const query = librarySearchQuery.trim().toLowerCase();
    return defaultHabits.map((section) => ({
      ...section,
      habits: section.habits.filter((habit) =>
        isFuzzyMatch(habit.name, query) ||
        (habit.description && isFuzzyMatch(habit.description, query))
      ),
    })).filter((section) => section.habits.length > 0);
  }, [librarySearchQuery]);

  const showAlert = !!clientName;

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
      title={t('habits.addHabitTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      footer={
        activeTab === 'yourLibrary' ? (
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleSaveFromYourLibrary}
              disabled={!selectedLibraryHabit}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        ) : activeTab === 'newHabit' ? (
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={form.handleSubmit(handleSave)}
              disabled={!form.formState.isValid}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        ) : null
      }
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'newHabit' | 'library' | 'yourLibrary')} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="yourLibrary"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.yourLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.athliLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="newHabit"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.newHabit')}
          </TabsTrigger>
        </TabsList>

        {showAlert && activeTab !== 'yourLibrary' && (
          <Alert className="bg-primary/5 border-primary/20 text-primary mb-6">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              Habits added here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general habit, navigate to the respective main page in <Link href="/habits" className="underline hover:no-underline"><strong>Library</strong></Link>.
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="library" className="mt-0">
          <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('habits.searchPlaceholder')}
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-9"
                aria-label={t('habits.searchPlaceholder')}
              />
            </div>
            {filteredLibraryHabits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('habits.emptyMessage')}</p>
              </div>
            ) : (
              filteredLibraryHabits.map((section) => (
                <div key={section.label} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {section.habits.map((habit) => {
                      const unitLabel = t(`habits.form.units.${habit.unit as any}`);
                      const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
                      const subtitle = `${habit.amount} ${unitLabel} / ${periodText}`;

                      return (
                        <Card
                          key={`${section.label}-${habit.name}`}
                          className="p-4 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectHabit(habit)}
                          onKeyDown={(e) => handleHabitCardKeyDown(e, habit)}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select habit: ${habit.name}`}
                        >
                          <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-medium text-foreground">{habit.name}</h4>
                            <p className="text-xs text-muted-foreground">{subtitle}</p>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="yourLibrary" className="mt-0">
          <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
            {isLoadingHabits ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('general.loading')}</p>
              </div>
            ) : coachHabits.length === 0 ? (
              <Alert className="bg-primary/5 border-primary/20 text-primary">
                <Info className="size-4" />
                <AlertDescription className="min-w-0 line-clamp-4">
                  {t('habits.noLibraryHabits')}{' '}
                  <Link href="/habits" className="underline hover:no-underline">
                    <strong>{t('habits.libraryLink')}</strong>
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('habits.searchPlaceholder')}
                    value={yourLibrarySearchQuery}
                    onChange={(e) => setYourLibrarySearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label={t('habits.searchPlaceholder')}
                  />
                </div>
                {filteredYourLibraryHabits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('habits.emptyMessage')}</p>
                  </div>
                ) : selectedLibraryHabit ? (
                  <>
                    <Card className="p-4 ring-2 ring-primary">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Target className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{selectedLibraryHabit.name}</h4>
                          </div>
                          {selectedLibraryHabit.description && (
                            <p className="text-xs text-muted-foreground">{selectedLibraryHabit.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {selectedLibraryHabit.amount} {t(`habits.form.units.${selectedLibraryHabit.unit as any}`)} / {selectedLibraryHabit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDeselectLibraryHabit}
                          className="h-8 w-8 flex-shrink-0"
                          aria-label={t('general.edit')}
                        >
                          <Info className="size-4" />
                        </Button>
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredYourLibraryHabits.map((habit) => {
                      const unitLabel = t(`habits.form.units.${habit.unit as any}`);
                      const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
                      const subtitle = `${habit.amount} ${unitLabel} / ${periodText}`;

                      return (
                        <Card
                          key={habit.id}
                          className="p-4 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectLibraryHabit(habit)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectLibraryHabit(habit);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select habit: ${habit.name}`}
                        >
                          <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-medium text-foreground">{habit.name}</h4>
                            <p className="text-xs text-muted-foreground">{subtitle}</p>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="newHabit" className="mt-0">
          <HabitFormManual
            form={form}
            enableDuration={enableDuration}
            setEnableDuration={setEnableDuration}
            enableReminder={enableReminder}
            setEnableReminder={setEnableReminder}
          />
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};

