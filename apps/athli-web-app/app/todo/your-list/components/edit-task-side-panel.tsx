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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { mockAthletes } from '@/components/app/app-shell';
import { format } from 'date-fns';
import { YourListTask } from '@/api/coach/coach-todo-service';

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
    return mockAthletes.map((athlete) => ({
      value: athlete.id,
      label: athlete.name,
    }));
  }, []);

  const taskType = form.watch('taskType');

  const formValues = form.watch();
  const hasChanges = useMemo(() => {
    if (!task) return false;
    const dueDateChanged =
      formValues.completeBy && task.dueDate
        ? formValues.completeBy.getTime() !== new Date(task.dueDate).getTime()
        : formValues.completeBy !== undefined;
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
        completeBy: new Date(task.dueDate),
      });
    }
  }, [task, open, form]);

  const handleSave = async (values: TaskFormValues) => {
    await onSave(values);
    handleClose();
  };

  const handleDelete = async () => {
    await onDelete();
    handleClose();
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
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={form.handleSubmit(handleSave)}
            disabled={!hasChanges || !form.formState.isValid}
            aria-label={t('general.save')}
          >
            {t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleDelete} aria-label={t('general.delete')}>
            {t('general.delete')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
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
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={field.onChange}
                    variant="outline"
                    spacing={0}
                    className="w-full"
                  >
                    <ToggleGroupItem
                      value="client"
                      aria-label={t('home.taskTypeClient')}
                      className="flex-1 data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary dark:data-[state=on]:border-primary dark:data-[state=on]:bg-primary/5 dark:data-[state=on]:text-primary"
                    >
                      {t('home.taskTypeClient')}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="general"
                      aria-label={t('home.taskTypeGeneral')}
                      className="flex-1 data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary dark:data-[state=on]:border-primary dark:data-[state=on]:bg-primary/5 dark:data-[state=on]:text-primary"
                    >
                      {t('home.taskTypeGeneral')}
                    </ToggleGroupItem>
                  </ToggleGroup>
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
                  <span>
                    {t('home.completeBy')}
                    <RequiredAsterisk />
                  </span>
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
  );
};
