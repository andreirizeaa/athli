'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Tag, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { useCoachTodo } from '@/hooks/use-coach-todo';
import { AthliAssistantTask } from '@/api/coach/coach-todo-service';



const AthliAssistantPage = () => {
  const t = useTranslations();
  const { autoTodos: athliAssistantTasks, completeAutoTodo } = useCoachTodo();
  const [athliFilteredCount, setAthliFilteredCount] = useState(0);
  const [athliTaskTypeFilter, setAthliTaskTypeFilter] = useState<'all' | 'client' | 'general'>('all');

  const handleToggleAthliAssistantComplete = async (taskId: string) => {
    await completeAutoTodo(taskId);
  };

  // Filter Athli Assistant tasks
  const filteredAthliAssistantTasks = useMemo(() => {
    let filtered = [...athliAssistantTasks];

    // Filter by task type
    if (athliTaskTypeFilter !== 'all') {
      filtered = filtered.filter((task) => task.type === athliTaskTypeFilter);
    }

    return filtered;
  }, [athliAssistantTasks, athliTaskTypeFilter]);

  // Athli Assistant columns
  const athliAssistantColumns: ColumnDefinition<AthliAssistantTask>[] = [
    {
      id: 'title',
      label: t('home.task'),
      icon: <CheckSquare className="size-3" />,
      sortable: true,
      width: { class: 'flex-1', pixel: '1fr' },
      getSortValue: (row) => row.title.toLowerCase(),
      getSearchValue: (row) => row.title,
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <CheckSquare className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('home.task')}</span>
        </div>
      ),
      renderCell: (row) => (
        <span className={cn('text-sm font-medium', row.completed && 'line-through text-muted-foreground')}>
          {row.title}
        </span>
      ),
    },
    {
      id: 'type',
      label: t('home.type'),
      sortable: true,
      width: { class: 'w-[100px]', pixel: '100px' },
      getSortValue: (row) => row.type,
      getSearchValue: (row) => row.type,
      renderHeader: () => (
        <div className="flex items-center gap-2 justify-end">
          <Tag className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('home.type')}</span>
        </div>
      ),
      renderCell: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap text-right">
          {row.type === 'client' ? t('home.taskTypeClient') : t('home.taskTypeGeneral')}
        </span>
      ),
    },
    {
      id: 'action',
      label: t('home.action'),
      sortable: false,
      width: { class: 'w-[80px]', pixel: '80px' },
      getSortValue: () => '',
      getSearchValue: () => '',
      renderHeader: () => (
        <div className="flex items-center gap-2 justify-end">
          <CheckCircle2 className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('home.action')}</span>
        </div>
      ),
      renderCell: (row) => (
        <div className="flex items-center justify-end">
          <Checkbox
            checked={row.completed}
            onCheckedChange={() => handleToggleAthliAssistantComplete(row.id)}
            aria-label={row.completed ? t('home.markIncomplete') : t('home.markComplete')}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={filteredAthliAssistantTasks}
        columns={athliAssistantColumns}
        getRowId={(row) => row.id}
        gridKey="todo-athli-assistant"
        itemsPerPage={25}
        onFilteredDataChange={setAthliFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('general.search')}
        searchFields={['title']}
        filterBarActions={
          <div className="flex items-center gap-2 ml-auto">
            <Select value={athliTaskTypeFilter} onValueChange={(value) => setAthliTaskTypeFilter(value as 'all' | 'client' | 'general')}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('home.filterAll')}</SelectItem>
                <SelectItem value="client">{t('home.taskTypeClient')}</SelectItem>
                <SelectItem value="general">{t('home.taskTypeGeneral')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={false}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('home.noTasksFound')}
        emptyState={
          <EmptyGridState
            title={t('home.athliAssistantEmptyStateTitle')}
            subtitle="Automated tasks and reminders will appear here when there's something that needs your attention"
          />
        }
      />
    </div>
  );
};

export default AthliAssistantPage;

