'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { Plus, Calendar, CheckSquare, Tag, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { format } from 'date-fns';
import { useCoachTodo } from '@/hooks/use-coach-todo';
import { YourListTask } from '@/api/coach/coach-todo-service';
import { AddTaskSidePanel } from './components/add-task-side-panel';

type YourListTaskFormValues = {
  title: string;
  information?: string;
  taskType: 'client' | 'general';
  clientId?: string;
  completeBy?: Date;
};



const YourListPage = () => {
  const t = useTranslations();

  const { ownTodos: yourListTasks, createOwnTodo, updateOwnTodo, deleteOwnTodo } = useCoachTodo();

  // Your List states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<YourListTask | null>(null);
  const [yourListTaskTypeFilter, setYourListTaskTypeFilter] = useState<'all' | 'client' | 'general'>('all');
  const [yourListSortOrder, setYourListSortOrder] = useState<'earliest' | 'latest'>('earliest');

  const isTaskOverdue = (task: YourListTask): boolean => {
    if (task.completed || !task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const formatDueDate = (date: Date): string => {
    return format(date, 'MMM d, yyyy');
  };

  // Filter and sort Your List tasks
  const filteredAndSortedYourListTasks = useMemo(() => {
    let filtered = [...yourListTasks];

    // Filter by task type
    if (yourListTaskTypeFilter !== 'all') {
      filtered = filtered.filter((task) => task.type === yourListTaskTypeFilter);
    }

    // Sort by due date (tasks without due date go last)
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return yourListSortOrder === 'earliest' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [yourListTasks, yourListTaskTypeFilter, yourListSortOrder]);

  // Your List columns
  const yourListColumns: ColumnDefinition<YourListTask>[] = [
    {
      id: 'title',
      label: t('home.task'),
      icon: <CheckSquare className="size-3" />,
      sortable: true,
      width: { class: 'flex-1', pixel: '1fr' },
      getSortValue: (row) => row.title.toLowerCase(),
      getSearchValue: (row) => `${row.title} ${row.information || ''} ${row.clientName || ''}`,
      renderHeader: () => (
        <div className="flex items-center gap-2">
          <CheckSquare className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('home.task')}</span>
        </div>
      ),
      renderCell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.type === 'client' && row.clientAvatar && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={row.clientAvatar} alt={row.clientName} />
              <AvatarFallback>{row.clientName?.charAt(0) || 'C'}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col min-w-0">
            <span className={cn('text-sm font-medium', row.completed && 'line-through text-muted-foreground')}>
              {row.title}
            </span>
            {row.information && (
              <span className={cn('text-xs text-muted-foreground', row.completed && 'line-through')}>
                {row.information.length > 80 ? `${row.information.slice(0, 80)}...` : row.information}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'dueDate',
      label: t('home.due'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.dueDate ? new Date(row.dueDate).getTime() : Infinity,
      getSearchValue: (row) => row.dueDate ? formatDueDate(new Date(row.dueDate)) : '',
      renderHeader: () => (
        <div className="flex items-center gap-2 justify-end">
          <Calendar className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('home.due')}</span>
        </div>
      ),
      renderCell: (row) => {
        if (!row.dueDate) {
          return <div className="text-sm whitespace-nowrap text-right text-muted-foreground">—</div>;
        }
        const isOverdue = isTaskOverdue(row);
        return (
          <div className="text-sm whitespace-nowrap text-right">
            {isOverdue ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {formatDueDate(new Date(row.dueDate))}
              </Badge>
            ) : (
              <span className={cn('text-muted-foreground', row.completed && 'line-through')}>
                {formatDueDate(new Date(row.dueDate))}
              </span>
            )}
          </div>
        );
      },
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
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()} data-no-row-link="true">
          <Checkbox
            checked={row.completed}
            onCheckedChange={() => handleToggleYourListComplete(row)}
            aria-label={row.completed ? t('home.markIncomplete') : t('home.markComplete')}
          />
        </div>
      ),
    },
  ];

  const handleSaveTask = async (values: YourListTaskFormValues) => {
    await createOwnTodo({
      title: values.title,
      information: values.information,
      type: values.taskType,
      client_id: values.taskType === 'client' ? values.clientId : undefined,
      due_date: values.completeBy?.toISOString(),
    });
  };

  const handleToggleYourListComplete = async (task: YourListTask) => {
    await deleteOwnTodo(task.id);
  };

  const handleTaskRowClick = (task: YourListTask) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  const handleSaveEditTask = async (values: YourListTaskFormValues) => {
    if (!selectedTask) return;
    await updateOwnTodo({
      id: selectedTask.id,
      data: {
        title: values.title,
        information: values.information,
        type: values.taskType,
        client_id: values.taskType === 'client' ? values.clientId : undefined,
        due_date: values.completeBy?.toISOString(),
      },
    });
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    await deleteOwnTodo(selectedTask.id);
  };

  return (
    <>
      <DataGrid
        data={filteredAndSortedYourListTasks}
        columns={yourListColumns}
        getRowId={(row) => row.id}
        gridKey="todo-your-list"
        itemsPerPage={25}
        enableSearch={true}
        searchPlaceholder={t('general.search')}
        searchFields={['title', 'information', 'clientName']}
        filterBarActions={
          <div className="flex items-center gap-2 ml-auto">
            <Select value={yourListTaskTypeFilter} onValueChange={(value) => setYourListTaskTypeFilter(value as 'all' | 'client' | 'general')}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('home.filterAll')}</SelectItem>
                <SelectItem value="client">{t('home.taskTypeClient')}</SelectItem>
                <SelectItem value="general">{t('home.taskTypeGeneral')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yourListSortOrder} onValueChange={(value) => setYourListSortOrder(value as 'earliest' | 'latest')}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earliest">{t('home.sortEarliest')}</SelectItem>
                <SelectItem value="latest">{t('home.sortLatest')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddTaskOpen(true)} className="gap-2">
              <Plus className="size-4" />
              <span>{t('home.addTask')}</span>
            </Button>
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
            title={t('home.yourListEmptyStateTitle')}
            subtitle="Add and organize tasks to keep track of your coaching work and client management"
            action={
              <Button onClick={() => setIsAddTaskOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span>{t('home.addTask')}</span>
              </Button>
            }
          />
        }
        onRowClick={(task) => handleTaskRowClick(task)}
      />

      <AddTaskSidePanel open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen} onSave={handleSaveTask} />

      <AddTaskSidePanel
        open={isEditTaskOpen}
        onOpenChange={setIsEditTaskOpen}
        task={selectedTask}
        onSave={handleSaveEditTask}
        onDelete={handleDeleteTask}
      />
    </>
  );
};

export default YourListPage;

