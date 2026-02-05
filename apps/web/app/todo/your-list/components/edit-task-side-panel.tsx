'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SidePanel } from '@/components/app/side-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ChevronDownIcon, Trash2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { YourListTask } from '@/api/coach/coach-todo-service';
import { Combobox } from '@/components/ui/combobox';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type TaskFormValues = {
  title: string;
  information?: string;
  taskType: 'client' | 'general';
  clientId?: string;
  completeBy?: Date;
};

interface EditTaskSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: YourListTask | null;
  onSave: (values: TaskFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const EditTaskSidePanel = ({ open, onOpenChange, task, onSave, onDelete }: EditTaskSidePanelProps) => {
  const t = useTranslations();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { clients, isLoading: isLoadingClients } = useCoachClients();

  const taskSchema = useMemo(
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

  const clientOptions = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: client.name,
      avatarUrl: client.avatarUrl,
    }));
  }, [clients]);

  const taskType = form.watch('taskType');

  const formValues = form.watch();
  const hasChanges = useMemo(() => {
    if (!task) return false;
    const taskDueTime = task.dueDate ? new Date(task.dueDate).getTime() : null;
    const formDueTime = formValues.completeBy ? formValues.completeBy.getTime() : null;
    const dueDateChanged = taskDueTime !== formDueTime;
    return (
      formValues.title !== task.title ||
      formValues.information !== (task.information || '') ||
      formValues.taskType !== task.type ||
      formValues.clientId !== (task.clientId || '') ||
      dueDateChanged
    );
  }, [formValues, task]);

  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        information: task.information || '',
        taskType: task.type,
        clientId: task.clientId || '',
        completeBy: task.dueDate ? new Date(task.dueDate) : undefined,
      });
    }
  }, [task, open, form]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (values: TaskFormValues) => {
    setIsSaving(true);
    try {
      await onSave(values);
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      handleClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('home.editTask')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            aria-label={t('general.delete')}
            className="gap-2"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t('general.delete')}
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSave)}
            disabled={!hasChanges || !form.formState.isValid || isSaving || isDeleting}
            aria-label={t('general.save')}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t('general.save')}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(handleSave)(e);
          }}
          className="flex flex-col gap-6"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span>
                    {t('home.taskTitle')}
                    <RequiredAsterisk />
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('home.taskTitlePlaceholder')} aria-label={t('home.taskTitle')} {...field} />
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
                  <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
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
                    <span>
                      {t('home.selectClient')}
                      <RequiredAsterisk />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      key={task?.id || 'new'}
                      options={clientOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('home.selectClientPlaceholder')}
                      searchPlaceholder={t('general.search')}
                      emptyText={isLoadingClients ? 'Loading clients...' : 'No clients found.'}
                      disabled={isLoadingClients}
                      renderOption={(option) => (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={option.avatarUrl} alt={option.label} />
                            <AvatarFallback className="text-xs">
                              {option.label?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{option.label}</span>
                        </div>
                      )}
                      renderSelected={(option) => (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={option.avatarUrl} alt={option.label} />
                            <AvatarFallback className="text-xs">
                              {option.label?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{option.label}</span>
                        </div>
                      )}
                    />
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
                  <span>{t('home.completeBy')}</span>
                </FormLabel>
                <FormControl>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors',
                          !field.value && 'text-muted-foreground'
                        )}
                        aria-label={t('home.completeBy')}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {field.value ? field.value.toLocaleDateString() : t('home.selectDate')}
                          </span>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        captionLayout="dropdown"
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
  );
};
