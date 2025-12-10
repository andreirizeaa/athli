'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockAthletes } from '@/components/app/app-shell';
import { format } from 'date-fns';

type TaskFormValues = {
  title: string;
  information?: string;
  taskType: 'client' | 'general';
  clientId?: string;
  completeBy?: Date;
};

type Task = {
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

const DUMMY_TASKS: Task[] = [
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
  {
    id: '6',
    title: 'Schedule check-in with Mike Wilson',
    information: 'Quarterly review meeting',
    type: 'client',
    clientId: '3',
    clientName: 'Mike Wilson',
    clientAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces',
    dueDate: new Date(2025, 11, 7),
    completed: false,
  },
  {
    id: '7',
    title: 'Prepare monthly report',
    type: 'general',
    dueDate: new Date(2025, 11, 8),
    completed: true,
  },
  {
    id: '8',
    title: 'Review client progress reports',
    information: 'Compile and analyze monthly progress data',
    type: 'general',
    dueDate: new Date(2025, 11, 9),
    completed: false,
  },
];

export const ToDoCard = () => {
  const t = useTranslations();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>(DUMMY_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'outstanding' | 'completed' | 'overdue'>('outstanding');
  const [sortOrder, setSortOrder] = useState<'earliest' | 'latest'>('earliest');

  const taskSchema = z
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
    );

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      information: '',
      taskType: 'client',
      clientId: '',
      completeBy: undefined,
    },
  });

  const editForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
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

  const isTaskOverdue = (task: Task): boolean => {
    if (task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.information?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

      const isOverdue = isTaskOverdue(task);

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'outstanding' && !task.completed) ||
        (typeFilter === 'completed' && task.completed) ||
        (typeFilter === 'overdue' && isOverdue);

      return matchesSearch && matchesType;
    });

    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.dueDate.getTime();
      const dateB = b.dueDate.getTime();
      return sortOrder === 'earliest' ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  }, [tasks, searchQuery, typeFilter, sortOrder]);

  const handleSaveTask = async (values: TaskFormValues) => {
    const selectedClient = mockAthletes.find((a) => a.id === values.clientId);
    const newTask: Task = {
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
    setTasks((prev) => [newTask, ...prev]);
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

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleTaskRowClick = (task: Task) => {
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

  const handleSaveEditTask = async (values: TaskFormValues) => {
    if (!selectedTask) return;
    const selectedClient = mockAthletes.find((a) => a.id === values.clientId);
    const updatedTask: Task = {
      ...selectedTask,
      title: values.title,
      information: values.information,
      type: values.taskType,
      clientId: values.taskType === 'client' ? values.clientId : undefined,
      clientName: values.taskType === 'client' ? selectedClient?.name : undefined,
      clientAvatar: values.taskType === 'client' ? selectedClient?.avatar : undefined,
      dueDate: values.completeBy!,
    };
    setTasks((prev) => prev.map((task) => (task.id === selectedTask.id ? updatedTask : task)));
    handleCloseEditTaskPanel();
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    setTasks((prev) => prev.filter((task) => task.id !== selectedTask.id));
    handleCloseEditTaskPanel();
  };

  const formatDueDate = (date: Date): string => {
    return format(date, 'MMM d, yyyy');
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <>
      <Card className="bg-background flex flex-col w-full" style={{ height: '600px', minHeight: '600px', maxHeight: '600px' }}>
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('home.toDoList')} ({tasks.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-7 text-xs w-[200px]"
                  aria-label="Search tasks"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddTaskOpen(true)}
                className="h-7 text-xs gap-2"
                aria-label={t('home.addTask')}
              >
                <Plus className="h-3 w-3" />
                {t('home.addTask')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px] flex-shrink-0" />
        <CardContent className="px-0 flex flex-col flex-1 min-h-0">
          <div className="px-4 pb-2">
            <div className="flex flex-col gap-[24px]">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'earliest' | 'latest')}>
                    <SelectTrigger size="sm" className="h-7 text-xs w-[140px] !py-0 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="earliest">{t('home.sortEarliest')}</SelectItem>
                      <SelectItem value="latest">{t('home.sortLatest')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'outstanding' | 'completed' | 'overdue')}>
                    <SelectTrigger size="sm" className="h-7 text-xs w-[180px] !py-0 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('home.filterAll')}</SelectItem>
                      <SelectItem value="outstanding">{t('home.filterOutstanding')}</SelectItem>
                      <SelectItem value="completed">{t('home.filterCompleted')}</SelectItem>
                      <SelectItem value="overdue">{t('home.filterOverdue')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_120px_100px_60px] gap-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t('home.task')} ({filteredAndSortedTasks.length})
                </div>
                <div className="text-xs font-semibold uppercase text-muted-foreground text-right">{t('home.due')}</div>
                <div className="text-xs font-semibold uppercase text-muted-foreground text-right">{t('home.type')}</div>
                <div className="text-xs font-semibold uppercase text-muted-foreground text-right">{t('home.action')}</div>
              </div>
            </div>
          </div>
          <Separator className="w-full" />
          <div className="w-full" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {filteredAndSortedTasks.length === 0 ? (
              <div className="px-4 py-4">
                <p className="text-sm text-muted-foreground">{t('home.noTasksFound')}</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredAndSortedTasks.map((task) => {
                  const isOverdue = isTaskOverdue(task);
                  return (
                  <div
                    key={task.id}
                    className={cn(
                      'border-b transition-colors hover:bg-accent cursor-pointer',
                      isOverdue && 'bg-primary/5 border-primary/20'
                    )}
                    onClick={() => handleTaskRowClick(task)}
                  >
                    <div className="grid grid-cols-[1fr_120px_100px_60px] gap-4 py-4 px-4 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col min-w-0">
                          <span className={cn('text-sm font-medium', task.completed && 'line-through text-muted-foreground')}>
                            {task.title}
                          </span>
                          {task.information && (
                            <span className={cn('text-xs text-muted-foreground', task.completed && 'line-through')}>
                              {truncateText(task.information, 80)}
                            </span>
                          )}
                        </div>
                        {task.type === 'client' && task.clientAvatar && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={task.clientAvatar} alt={task.clientName} />
                            <AvatarFallback>{task.clientName?.charAt(0) || 'C'}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="text-sm whitespace-nowrap text-right">
                        {isOverdue ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {formatDueDate(task.dueDate)}
                          </Badge>
                        ) : (
                          <span className={cn('text-muted-foreground', task.completed && 'line-through')}>
                            {formatDueDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap text-right">
                        {task.type === 'client' ? t('home.taskTypeClient') : t('home.taskTypeGeneral')}
                      </div>
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleComplete(task.id)}
                          aria-label={task.completed ? t('home.markIncomplete') : t('home.markComplete')}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
        <Separator className="w-full" />
      </Card>

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
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => {
                        if (value === 'client' || value === 'general') {
                          field.onChange(value);
                          if (value === 'general') {
                            form.setValue('clientId', '');
                          }
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="w-full">
                        <TabsTrigger
                          value="client"
                          className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        >
                          {t('home.taskTypeClient')}
                        </TabsTrigger>
                        <TabsTrigger
                          value="general"
                          className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        >
                          {t('home.taskTypeGeneral')}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
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
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => {
                        if (value === 'client' || value === 'general') {
                          field.onChange(value);
                          if (value === 'general') {
                            editForm.setValue('clientId', '');
                          }
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="w-full">
                        <TabsTrigger
                          value="client"
                          className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        >
                          {t('home.taskTypeClient')}
                        </TabsTrigger>
                        <TabsTrigger
                          value="general"
                          className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                        >
                          {t('home.taskTypeGeneral')}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
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
    </>
  );
};

