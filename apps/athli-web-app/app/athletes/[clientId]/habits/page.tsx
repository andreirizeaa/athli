'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Target, Clock, Bell, X, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { addHabit, assignHabit, deleteClientHabits, type Habit } from '@/lib/habits/habit-service';
import { mockAthletes } from '@/components/app/app-shell';
import { AddHabitSidePanel, type HabitFormValues } from '@/components/habits/add-habit-side-panel';

// Mock data - in production this would be filtered by clientId
const mockHabits: Habit[] = [
  {
    id: '1',
    name: 'Daily steps',
    description: 'Track your daily step count to stay active',
    amount: 10000,
    unit: 'steps',
    period: 'daily',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: '2',
    name: 'Drink water',
    description: 'Stay hydrated throughout the day',
    amount: 8,
    unit: 'cups',
    period: 'daily',
    reminderTime: '08:00',
    reminderMessage: 'Time to hydrate!',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: '3',
    name: 'Meditate',
    description: 'Take time for mindfulness and mental clarity',
    amount: 10,
    unit: 'min',
    period: 'daily',
    duration: 30,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const ClientHabitsPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  
  const athlete = mockAthletes.find((item) => item.id === clientId);
  const clientName = athlete?.name || 'this client';
  
  const [habits, setHabits] = useState<Habit[]>(mockHabits);
  const [filteredCount, setFilteredCount] = useState<number>(mockHabits.length);
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [isAddHabitOpen, setIsAddHabitOpen] = useState<boolean>(false);

  const itemsPerPage = 25;

  const handleClearSelected = () => {
    setSelectedHabits(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedHabits.size === 0 || !clientId) return;

    try {
      await deleteClientHabits({
        habitIds: Array.from(selectedHabits),
        clientId: clientId,
      });
      
      setHabits((prev) => prev.filter((h) => !selectedHabits.has(h.id)));
      setSelectedHabits(new Set());
    } catch (error) {
      console.error('Failed to delete habits:', error);
    }
  };

  const handleOpenAddHabit = () => {
    setIsAddHabitOpen(true);
  };

  const handleSaveHabit = async (values: HabitFormValues) => {
    if (!clientId) return;
    
    try {
      // Create the habit
      const newHabit = await addHabit(values);
      
      // Assign it to this client
      await assignHabit({
        habitIds: [newHabit.id],
        clientIds: [clientId],
      });
      
      // Add to local state
      setHabits((prev) => [...prev, newHabit]);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to add habit:', error);
      // TODO: Show error toast
    }
  };

  const getAimText = (habit: Habit): string => {
    const unitLabel = t(`habits.form.units.${habit.unit as any}`);
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

  // Render first column header with checkbox
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

  // Render first column with checkbox
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

  // Create column definitions
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
  ];


  // Sort habits by name
  const sortedHabits = useMemo(() => {
    return [...habits].sort((a, b) => a.name.localeCompare(b.name));
  }, [habits]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <DataGrid
        data={sortedHabits}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`client-habits-${clientId}`}
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('habits.title')}
        searchFields={['name', 'description']}
        filterBarActions={
          <Button onClick={handleOpenAddHabit} className="gap-2">
            <Plus className="size-4" />
            <span>{t('habits.addHabit')}</span>
          </Button>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedHabits}
        onSelectionChange={setSelectedHabits}
        firstColumnId="name"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage="No habits found."
        emptyState={
          <EmptyGridState
            title="No habits assigned"
            subtitle="This client has no habits assigned yet"
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
                Clear {selectedHabits.size} selected
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleDeleteSelected}
              className="gap-2"
              aria-label={t('habits.actions.deleteSelected')}
            >
              <Trash2 className="size-4" />
              <span>{t('general.delete')}</span>
            </Button>
          </div>
        }
      />
      <AddHabitSidePanel
        open={isAddHabitOpen}
        onOpenChange={setIsAddHabitOpen}
        onSave={handleSaveHabit}
        clientName={clientName}
        clientId={clientId}
      />
    </div>
  );
};

export default ClientHabitsPage;
