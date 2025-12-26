'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, Search, Info, Trash2, UserPlus, Target, Clock, Bell, X, Copy, Loader2 } from 'lucide-react';
import { SidePanel } from '@/components/app/side-panel';
import { PageHeader } from '@/components/app/page-header';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BulkDeleteConfirmationDialog } from '@/components/app/bulk-delete-confirmation-dialog';
import { cn } from '@/lib/general/utils';
import { Habit } from '@/api/coach/coach-habit-service';
import { useCoachHabits } from '@/hooks/use-coach-habits';
import { assignHabit } from '@/api/client/client-habit-service';
import { defaultHabits, type DefaultHabit } from '@/constants/habits';
import { mockAthletes } from '@/components/app/app-shell';

type HabitFormValues = {
  name: string;
  description?: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
};

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

// HabitsPage uses useCoachHabits hook which fetches data from the API

const HabitsPage = () => {
  const t = useTranslations();
  const {
    habits,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    duplicateHabit,
    isCreating,
    isUpdating,
    isDeleting,
    isDuplicating
  } = useCoachHabits();

  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [filteredCount, setFilteredCount] = useState<number>(0);

  // Add habit side panel state
  const [isAddHabitOpen, setIsAddHabitOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'library'>('library');
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');

  // Edit habit side panel state
  const [isEditHabitOpen, setIsEditHabitOpen] = useState<boolean>(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Assign to clients side panel state
  const [isAssignToClientsOpen, setIsAssignToClientsOpen] = useState<boolean>(false);
  const [habitsToAssign, setHabitsToAssign] = useState<Habit[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);

  const habitSchema = z
    .object({
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
    })

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

  const period = form.watch('period');
  const amount = form.watch('amount');
  const unit = form.watch('unit');
  const nameValue = form.watch('name');

  const textualRepresentation = useMemo(() => {
    if (!amount || amount === 0 || !unit) return '';
    const unitLabel = t(`habits.form.units.${unit as string}`);
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

  const handleOpenAddHabit = () => {
    setIsAddHabitOpen(true);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
    setActiveTab('library');
    setLibrarySearchQuery('');
  };

  const handleCloseAddHabit = () => {
    setIsAddHabitOpen(false);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
    setActiveTab('library');
    setLibrarySearchQuery('');
  };

  const handleOpenEditHabit = (habit: Habit) => {
    setEditingHabitId(habit.id);
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

    setIsEditHabitOpen(true);
  };

  const handleCloseEditHabit = () => {
    setIsEditHabitOpen(false);
    setEditingHabitId(null);
    form.reset();
    setEnableDuration(false);
    setEnableReminder(false);
  };

  const handleSaveHabit = async (values: HabitFormValues) => {
    try {
      if (editingHabitId) {
        await updateHabit({ id: editingHabitId, ...values });
        handleCloseEditHabit();
      } else {
        await createHabit(values);
        handleCloseAddHabit();
      }
    } catch (error) {
      console.error('Failed to save habit:', error);
    }
  };

  const handleDeleteHabit = async () => {
    if (!editingHabitId) return;

    try {
      await deleteHabit(editingHabitId);
      handleCloseEditHabit();
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const handleDeleteFromGrid = async (habitId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await deleteHabit(habitId);
    } catch (error) {
      console.error('Failed to delete habit from grid:', error);
    }
  };

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

    setActiveTab('manual');
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

    return defaultHabits
      .map((section) => {
        const filteredHabitsInSection = section.habits.filter((habit) => {
          const matchesName = isFuzzyMatch(habit.name, query);
          const matchesDescription = habit.description ? isFuzzyMatch(habit.description, query) : false;
          const matchesSection = isFuzzyMatch(section.label, query);

          return matchesName || matchesDescription || matchesSection;
        });

        if (filteredHabitsInSection.length === 0) {
          return null;
        }

        return {
          ...section,
          habits: filteredHabitsInSection,
        };
      })
      .filter((section): section is typeof defaultHabits[0] => section !== null);
  }, [librarySearchQuery]);

  const handleToggleHabit = (habitId: string) => {
    setSelectedHabits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  const handleClearSelected = () => {
    setSelectedHabits(new Set());
  };

  const handleDuplicateSelected = async () => {
    if (selectedHabits.size !== 1) return;
    const habitId = Array.from(selectedHabits)[0];
    try {
      await duplicateHabit(habitId);
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to duplicate habit:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedHabits);
      await Promise.all(idsToDelete.map((id) => deleteHabit(id)));
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to bulk delete habits:', error);
    }
  };

  const handleAssignToClients = () => {
    const selectedHabitItems = habits.filter((habit) => selectedHabits.has(habit.id));
    if (selectedHabitItems.length === 0) {
      return;
    }

    setHabitsToAssign(selectedHabitItems);
    setIsAssignToClientsOpen(true);
    setSelectedClientIds(new Set());
  };

  const handleRemoveHabitFromAssignList = (habitId: string) => {
    setHabitsToAssign((prev) => {
      const newList = prev.filter((habit) => habit.id !== habitId);
      if (newList.length === 0) {
        setIsAssignToClientsOpen(false);
      }
      return newList;
    });
  };

  const handleAssignHabitsToClients = async () => {
    if (selectedClientIds.size === 0 || habitsToAssign.length === 0) {
      return;
    }

    try {
      const habitIds = habitsToAssign.map((habit) => habit.id);
      const clientIdsArray = Array.from(selectedClientIds);

      await assignHabit({
        habitIds,
        clientIds: clientIdsArray,
      });

      setIsAssignToClientsOpen(false);
      setHabitsToAssign([]);
      setSelectedHabits(new Set());
      setSelectedClientIds(new Set());
    } catch (error) {
      console.error('Failed to assign habits to clients:', error);
    }
  };

  const handleCloseAssignToClients = () => {
    setIsAssignToClientsOpen(false);
    setHabitsToAssign([]);
    setSelectedClientIds(new Set());
  };

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const getAimText = (habit: Habit): string => {
    const unitLabel = t(`habits.form.units.${habit.unit as string}`);
    const periodText = habit.period === 'daily' ? t('habits.form.daily') : t('habits.form.weekly');
    return `${habit.amount} ${unitLabel} / ${periodText}`;
  };

  const getDurationText = (habit: Habit): string => {
    if (!habit.duration) return 'Not defined';
    return `${habit.duration} ${t('habits.form.durationLabel')}`;
  };

  const getReminderText = (habit: Habit): string => {
    if (!habit.reminderTime) return 'Not defined';
    return habit.reminderTime;
  };

  const columns: ColumnDefinition<Habit>[] = [
    {
      id: 'aim',
      label: 'Aim',
      icon: <Target className="size-3" />,
      sortable: false,
      width: { class: 'w-[300px]', pixel: '300px' },
      getSortValue: (row) => getAimText(row),
      getSearchValue: (row) => getAimText(row),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <Target className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Aim</span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-foreground">{getAimText(row)}</span>
      ),
    },
    {
      id: 'duration',
      label: 'Duration',
      icon: <Clock className="size-3" />,
      sortable: false,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.duration || 0,
      getSearchValue: (row) => getDurationText(row),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <Clock className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Duration</span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{getDurationText(row)}</span>
      ),
    },
    {
      id: 'reminder',
      label: 'Reminder',
      icon: <Bell className="size-3" />,
      sortable: false,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.reminderTime || '',
      getSearchValue: (row) => getReminderText(row),
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <Bell className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">Reminder</span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground">{getReminderText(row)}</span>
      ),
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      width: { class: 'w-[80px]', pixel: '80px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-no-row-link="true">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleDeleteFromGrid(row.id, e)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleDeleteFromGrid(row.id, e);
              }
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const renderFirstColumnHeader = ({
    isAllSelected,
    onToggleAll,
  }: {
    isAllSelected: boolean;
    onToggleAll: () => void;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">{t('habits.columns.name')}</span>
        </div>
      </div>
    );
  };

  const renderFirstColumn = (row: Habit, isSelected: boolean) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div
          className="flex items-center justify-center h-full flex-shrink-0"
          data-no-row-link="true"
        >
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleHabit(row.id)} />
        </div>
        <span className="text-sm font-medium truncate">{row.name}</span>
      </div>
    );
  };

  const renderManualForm = () => (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit(handleSaveHabit)(e);
        }}
        className="flex flex-col gap-6"
      >
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
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {t(`habits.form.units.${unit}`)}
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <PageHeader
        title={t('habits.title')}
        action={
          <Button onClick={handleOpenAddHabit} className="gap-2">
            <Plus className="size-4" />
            <span>{t('habits.addHabit')}</span>
          </Button>
        }
      />

      <DataGrid
        data={habits}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="habits"
        searchPlaceholder={t('habits.searchPlaceholder')}
        enableSearch={true}
        searchFields={['name']}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedHabits}
        onSelectionChange={setSelectedHabits}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleOpenEditHabit(row);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleOpenEditHabit(row);
          }
        }}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        hideFirstColumnBorder={false}
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('habits.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('habits.emptyState.title')}
            subtitle={t('habits.emptyState.subtitle')}
            action={
              <Button onClick={handleOpenAddHabit} className="gap-2">
                <Plus className="size-4" />
                <span>{t('habits.addHabit')}</span>
              </Button>
            }
          />
        }
        selectionActions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={handleClearSelected}
              className="gap-2"
              aria-label={t('habits.actions.clearSelected')}
            >
              <X className="size-4" />
              <span>
                {t('habits.actions.clearSelected')} {selectedHabits.size}
              </span>
            </Button>
            {selectedHabits.size === 1 && (
              <Button
                variant="ghost"
                onClick={handleDuplicateSelected}
                className="gap-2"
                aria-label={t('habits.actions.duplicateAria')}
                disabled={isDuplicating}
              >
                {isDuplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                <span>{t('habits.actions.duplicate')}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleAssignToClients}
              className="gap-2"
              aria-label={t('habits.actions.addToClients')}
            >
              <UserPlus className="size-4" />
              <span>{t('habits.actions.addToClients')}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label={t('general.delete')}
            >
              <Trash2 className="size-4" />
              <span>{t('general.delete')}</span>
            </Button>
          </div>
        }
        rowHeight="54px"
      />

      <BulkDeleteConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selectedHabits.size}
        itemName={t('habits.title').toLowerCase()}
      />

      {/* Add Habit Side Panel */}
      <SidePanel
        open={isAddHabitOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseAddHabit();
        }}
        title={t('habits.addHabitTitle')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
        footer={
          activeTab === 'manual' ? (
            <div className="flex w-full justify-start gap-2">
              <Button
                type="button"
                onClick={form.handleSubmit(handleSaveHabit)}
                disabled={!form.formState.isValid}
              >
                {t('general.save')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCloseAddHabit}>
                {t('general.cancel')}
              </Button>
            </div>
          ) : null
        }
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'library')} className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger
              value="library"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              Athli library
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              Manual add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search habits..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="pl-9"
                  aria-label="Search habits"
                />
              </div>
              {filteredLibraryHabits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No habits found matching &quot;{librarySearchQuery}&quot;</p>
                </div>
              ) : (
                filteredLibraryHabits.map((section) => (
                  <div key={section.label} className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {section.habits.map((habit) => {
                        const unitLabel = t(`habits.form.units.${habit.unit as string}`);
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

          <TabsContent value="manual" className="mt-0">
            {renderManualForm()}
          </TabsContent>
        </Tabs>
      </SidePanel>

      {/* Edit Habit Side Panel */}
      <SidePanel
        open={isEditHabitOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseEditHabit();
        }}
        title="Edit Habit"
        onOpenAutoFocus={(e) => e.preventDefault()}
        contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={form.handleSubmit(handleSaveHabit)}
              disabled={!form.formState.isValid}
            >
              {t('general.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteHabit}
            >
              <Trash2 className="size-4 mr-2" />
              {t('general.delete')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseEditHabit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        {renderManualForm()}
      </SidePanel>

      {/* Assign to Clients Side Panel */}
      <SidePanel
        open={isAssignToClientsOpen}
        onOpenChange={setIsAssignToClientsOpen}
        title="Assign habits to clients"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={handleAssignHabitsToClients}
              disabled={selectedClientIds.size === 0 || habitsToAssign.length === 0}
            >
              {selectedClientIds.size === 1
                ? 'Assign to 1 client'
                : `Assign to ${selectedClientIds.size} clients`}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseAssignToClients}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6 h-full">
          {/* Habits to be assigned */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <label className="text-sm font-medium">Habits to be assigned</label>
            {habitsToAssign.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                {habitsToAssign.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{habit.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveHabitFromAssignList(habit.id)}
                      className="ml-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${habit.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No habits selected
              </div>
            )}
          </div>

          {/* Client Selection */}
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <label className="text-sm font-medium">{t('athletes.title')}</label>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataGrid
                data={mockAthletes}
                columns={[
                  {
                    id: 'name',
                    label: 'Athlete',
                    icon: <UserPlus className="size-3" />,
                    width: { class: 'w-full', pixel: '100%' },
                    getSortValue: (row) => row.name.toLowerCase(),
                    getSearchValue: (row) => `${row.name} ${row.email} ${row.country}`,
                  },
                ]}
                getRowId={(row) => row.id}
                gridKey="assign-habits-to-clients"
                searchPlaceholder="Search athletes..."
                enableSearch={true}
                enableEditColumns={false}
                enableExport={false}
                enableRowSelection={true}
                selectedRowIds={selectedClientIds}
                onSelectionChange={setSelectedClientIds}
                onRowClick={(row, event) => {
                  const targetElement = event.target as HTMLElement;
                  if (targetElement.closest('[data-no-row-link="true"]')) {
                    return;
                  }
                  handleToggleClient(row.id);
                }}
                onRowKeyDown={(row, event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    const targetElement = event.target as HTMLElement;
                    if (targetElement.closest('[data-no-row-link="true"]')) {
                      return;
                    }
                    event.preventDefault();
                    handleToggleClient(row.id);
                  }
                }}
                firstColumnId="name"
                stickyFirstColumn={true}
                firstColumnWidth="100%"
                hideFirstColumnBorder={true}
                renderFirstColumn={(row, isSelected) => {
                  const initials = row.name
                    .split(' ')
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('');
                  return (
                    <div className="flex items-center gap-3 h-full w-full">
                      <div
                        className="flex items-center justify-center h-full flex-shrink-0"
                        data-no-row-link="true"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleClient(row.id)}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={row.avatar} alt={row.name} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn('truncate text-sm font-medium')}>{row.name}</span>
                      </div>
                    </div>
                  );
                }}
                renderFirstColumnHeader={({ isAllSelected, onToggleAll }) => {
                  return (
                    <div className="flex items-center gap-3 h-full w-full">
                      <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                      <div className="flex items-center gap-2">
                        <UserPlus className="size-3 text-muted-foreground" />
                        <span className="text-xs uppercase text-muted-foreground">Athlete</span>
                      </div>
                    </div>
                  );
                }}
                emptyMessage="No athletes found."
                rowHeight="54px"
                compactMode={true}
                showPagination={true}
                itemsPerPage={10}
                gridPadding={true}
              />
            </div>
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default HabitsPage;
