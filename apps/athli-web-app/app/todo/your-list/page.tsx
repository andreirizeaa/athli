'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SidePanel } from '@/components/app/side-panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import { mockAthletes } from '@/components/app/app-shell';
import { format } from 'date-fns';

type YourListTaskFormValues = {
  title: string;
  information?: string;
  taskType: 'client' | 'general';
  clientId?: string;
  completeBy?: Date;
};

type YourListTask = {
  id: string;
  title: string;
  information?: string;
  type: 'client' | 'general';
  clientId?: string;
  clientName?: string;
  clientAvatar?: string;
  dueDate: Date;
  completed: boolean;
};

const DUMMY_YOUR_LIST_TASKS: YourListTask[] = [
  {
    id: '1',
    title: 'Review overdue assessment',
    information: 'Client assessment that was due last week',
    type: 'client',
    clientId: '4',
    clientName: 'Emily Davis',
    clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
    dueDate: new Date(2024, 11, 20),
    completed: false,
  },
  {
    id: '2',
    title: 'Follow up on missed check-in',
    information: 'Client missed their scheduled session',
    type: 'client',
    clientId: '1',
    clientName: 'John Smith',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    dueDate: new Date(2024, 11, 28),
    completed: false,
  },
  {
    id: '3',
    title: 'Review John Smith progress',
    information: 'Check training logs and provide feedback',
    type: 'client',
    clientId: '1',
    clientName: 'John Smith',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    dueDate: new Date(2025, 11, 4),
    completed: false,
  },
  {
    id: '4',
    title: 'Update training program templates',
    information: 'Review and update standard program templates',
    type: 'general',
    dueDate: new Date(2025, 11, 5),
    completed: false,
  },
  {
    id: '5',
    title: 'Follow up with Sarah Johnson',
    information: 'Discuss nutrition plan adjustments',
    type: 'client',
    clientId: '2',
    clientName: 'Sarah Johnson',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    dueDate: new Date(2025, 11, 6),
    completed: false,
  },
];

const YourListPage = () => {
  const t = useTranslations();

  // Your List states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<YourListTask | null>(null);
  const [yourListTasks, setYourListTasks] = useState<YourListTask[]>(DUMMY_YOUR_LIST_TASKS);
  const [yourListFilteredCount, setYourListFilteredCount] = useState(0);
  const [yourListTaskTypeFilter, setYourListTaskTypeFilter] = useState<'all' | 'client' | 'general'>('all');
  const [yourListSortOrder, setYourListSortOrder] = useState<'earliest' | 'latest'>('earliest');

  const yourListTaskSchema = useMemo(
    () =>
      z
        .object({
          title: z.string().min(1, t('home.taskTitleRequiredError')),
          information: z.string().optional(),
          taskType: z.union([z.literal('client'), z.literal('general')]),
          clientId: z.string().optional(),
          completeBy: z.date().optional(),
        })
        .refine(
          (data) => {
            return data.completeBy !== undefined;
          },
          {
            message: t('home.completeByRequiredError'),
            path: ['completeBy'],
          }
        )
        .refine(
          (data) => {
            if (data.taskType === 'client') {
              return data.clientId && data.clientId.trim() !== '';
            }
            return true;
          },
          {
            message: t('home.clientIdRequiredError'),
            path: ['clientId'],
          }
        ),
    [t]
  );

  const form = useForm<YourListTaskFormValues>({
    resolver: zodResolver(yourListTaskSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      information: '',
      taskType: 'client',
      clientId: '',
      completeBy: undefined,
    },
  });

  const editForm = useForm<YourListTaskFormValues>({
    resolver: zodResolver(yourListTaskSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      information: '',
      taskType: 'client',
      clientId: '',
      completeBy: undefined,
    },
  });

  const clientOptions = useMemo(() => {
    return mockAthletes.map((athlete) => ({
      value: athlete.id,
      label: athlete.name,
    }));
  }, []);

  const taskType = form.watch('taskType');
  const editTaskType = editForm.watch('taskType');

  const editFormValues = editForm.watch();
  const hasEditChanges = useMemo(() => {
    if (!selectedTask) return false;
    const dueDateChanged = editFormValues.completeBy && selectedTask.dueDate
      ? editFormValues.completeBy.getTime() !== selectedTask.dueDate.getTime()
      : editFormValues.completeBy !== undefined;
    return (
      editFormValues.title !== selectedTask.title ||
      editFormValues.information !== (selectedTask.information || '') ||
      editFormValues.taskType !== selectedTask.type ||
      editFormValues.clientId !== (selectedTask.clientId || '') ||
      dueDateChanged
    );
  }, [editFormValues, selectedTask]);

  const isTaskOverdue = (task: YourListTask): boolean => {
    if (task.completed) return false;
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

    // Sort by due date
    filtered.sort((a, b) => {
      const dateA = a.dueDate.getTime();
      const dateB = b.dueDate.getTime();
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
          {row.type === 'client' && row.clientAvatar && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={row.clientAvatar} alt={row.clientName} />
              <AvatarFallback>{row.clientName?.charAt(0) || 'C'}</AvatarFallback>
            </Avatar>
          )}
        </div>
      ),
    },
    {
      id: 'dueDate',
      label: t('home.due'),
      sortable: true,
      width: { class: 'w-[150px]', pixel: '150px' },
      getSortValue: (row) => row.dueDate.getTime(),
      getSearchValue: (row) => formatDueDate(row.dueDate),
      renderHeader: () => (
        <div className="flex items-center gap-2 justify-end">
          <Calendar className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('home.due')}</span>
        </div>
      ),
      renderCell: (row) => {
        const isOverdue = isTaskOverdue(row);
        return (
          <div className="text-sm whitespace-nowrap text-right">
            {isOverdue ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {formatDueDate(row.dueDate)}
              </Badge>
            ) : (
              <span className={cn('text-muted-foreground', row.completed && 'line-through')}>
                {formatDueDate(row.dueDate)}
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
            onCheckedChange={() => handleToggleYourListComplete(row.id)}
            aria-label={row.completed ? t('home.markIncomplete') : t('home.markComplete')}
          />
        </div>
      ),
    },
  ];

  const handleSaveTask = async (values: YourListTaskFormValues) => {
    const selectedClient = mockAthletes.find((a) => a.id === values.clientId);
    const newTask: YourListTask = {
      id: Date.now().toString(),
      title: values.title,
      information: values.information,
      type: values.taskType,
      clientId: values.taskType === 'client' ? values.clientId : undefined,
      clientName: values.taskType === 'client' ? selectedClient?.name : undefined,
      clientAvatar: values.taskType === 'client' ? selectedClient?.avatar : undefined,
      dueDate: values.completeBy!,
      completed: false,
    };
    setYourListTasks((prev) => [newTask, ...prev]);
    handleCloseTaskPanel();
  };

  const handleCloseTaskPanel = () => {
    setIsAddTaskOpen(false);
    form.reset();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setIsAddTaskOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const handleToggleYourListComplete = (taskId: string) => {
    setYourListTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleTaskRowClick = (task: YourListTask) => {
    setSelectedTask(task);
    editForm.reset({
      title: task.title,
      information: task.information || '',
      taskType: task.type,
      clientId: task.clientId || '',
      completeBy: task.dueDate,
    });
    setIsEditTaskOpen(true);
  };

  const handleCloseEditTaskPanel = () => {
    setIsEditTaskOpen(false);
    setSelectedTask(null);
    editForm.reset();
  };

  const handleSaveEditTask = async (values: YourListTaskFormValues) => {
    if (!selectedTask) return;
    const selectedClient = mockAthletes.find((a) => a.id === values.clientId);
    const updatedTask: YourListTask = {
      ...selectedTask,
      title: values.title,
      information: values.information,
      type: values.taskType,
      clientId: values.taskType === 'client' ? values.clientId : undefined,
      clientName: values.taskType === 'client' ? selectedClient?.name : undefined,
      clientAvatar: values.taskType === 'client' ? selectedClient?.avatar : undefined,
      dueDate: values.completeBy!,
    };
    setYourListTasks((prev) => prev.map((task) => (task.id === selectedTask.id ? updatedTask : task)));
    handleCloseEditTaskPanel();
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    setYourListTasks((prev) => prev.filter((task) => task.id !== selectedTask.id));
    handleCloseEditTaskPanel();
  };

  return (
    <div className="h-full w-full flex flex-col">
      <DataGrid
        data={filteredAndSortedYourListTasks}
        columns={yourListColumns}
        getRowId={(row) => row.id}
        gridKey="todo-your-list"
        itemsPerPage={25}
        onFilteredDataChange={setYourListFilteredCount}
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
        onRowClick={(task) => handleTaskRowClick(task)}
      />

      <SidePanel
        open={isAddTaskOpen}
        onOpenChange={handleOpenChange}
        title={t('home.addTask')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={form.handleSubmit(handleSaveTask)}
              disabled={!form.formState.isValid}
              aria-label={t('general.save')}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseTaskPanel}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(handleSaveTask)(e);
            }}
            className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.taskTitle')}<RequiredAsterisk /></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('home.taskTitlePlaceholder')}
                      aria-label={t('home.taskTitle')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="information"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.taskInformation')}</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('home.taskInformationPlaceholder')}
                      aria-label={t('home.taskInformation')}
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.taskType')}</span>
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-label={t('home.taskType')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">{t('home.taskTypeClient')}</SelectItem>
                        <SelectItem value="general">{t('home.taskTypeGeneral')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {taskType === 'client' && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span>{t('home.selectClient')}<RequiredAsterisk /></span>
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full" aria-label={t('home.selectClient')}>
                          <SelectValue placeholder={t('home.selectClientPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {clientOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="completeBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.completeBy')}<RequiredAsterisk /></span>
                  </FormLabel>
                  <FormControl>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal bg-transparent',
                            !field.value && 'text-muted-foreground'
                          )}
                          aria-label={t('home.completeBy')}
                        >
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {field.value ? format(field.value, 'PPP') : t('home.selectDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </SidePanel>

      <SidePanel
        open={isEditTaskOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditTaskPanel();
          } else {
            setIsEditTaskOpen(open);
          }
        }}
        title={t('home.editTask')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={editForm.handleSubmit(handleSaveEditTask)}
              disabled={!hasEditChanges || !editForm.formState.isValid}
              aria-label={t('general.save')}
            >
              {t('general.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteTask}
              aria-label={t('general.delete')}
            >
              {t('general.delete')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseEditTaskPanel}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <Form {...editForm}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editForm.handleSubmit(handleSaveEditTask)(e);
            }}
            className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto"
          >
            <FormField
              control={editForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.taskTitle')}<RequiredAsterisk /></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('home.taskTitlePlaceholder')}
                      aria-label={t('home.taskTitle')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editForm.control}
              name="information"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.taskInformation')}</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('home.taskInformationPlaceholder')}
                      aria-label={t('home.taskInformation')}
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editForm.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.taskType')}</span>
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-label={t('home.taskType')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">{t('home.taskTypeClient')}</SelectItem>
                        <SelectItem value="general">{t('home.taskTypeGeneral')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {editTaskType === 'client' && (
              <FormField
                control={editForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span>{t('home.selectClient')}<RequiredAsterisk /></span>
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full" aria-label={t('home.selectClient')}>
                          <SelectValue placeholder={t('home.selectClientPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {clientOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={editForm.control}
              name="completeBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span>{t('home.completeBy')}<RequiredAsterisk /></span>
                  </FormLabel>
                  <FormControl>
                    <Popover open={isEditCalendarOpen} onOpenChange={setIsEditCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal bg-transparent',
                            !field.value && 'text-muted-foreground'
                          )}
                          aria-label={t('home.completeBy')}
                        >
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {field.value ? format(field.value, 'PPP') : t('home.selectDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsEditCalendarOpen(false);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </SidePanel>
    </div>
  );
};

export default YourListPage;

