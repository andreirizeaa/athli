'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Info, Check, Loader2, Trash2 } from 'lucide-react';
import { addCheckIn, editCheckInDetails, deleteCheckIn, type AddCheckInData as AddFormData, type CheckIn } from '@/api/coach/coach-check-in-service';
import { formTemplates, type FormTemplate } from '@/constants/forms';
import { convertScheduleToCron, type AssignFormScheduleData } from '@/api/client/client-form-service';
import { cn } from '@/lib/general/utils';
import { toast } from 'sonner';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { FileText } from 'lucide-react';

type AddCheckInFormSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (form: any, questions?: FormTemplate['questions']) => void;
  editingForm?: CheckIn | null;
  onDelete?: (formId: string) => void;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AddCheckInFormSidePanel = ({ open, onOpenChange, onSave, editingForm, onDelete }: AddCheckInFormSidePanelProps) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const isEditing = !!editingForm;

  const [activeTab, setActiveTab] = useState<'new' | 'templates'>('new');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [checkInFrequency, setCheckInFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<'first' | 'last' | 'specific'>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduleChanged, setScheduleChanged] = useState(false);

  // Filter templates to only show check-in templates
  const checkInTemplates = useMemo(() => {
    return formTemplates.filter((template) =>
      template.schedule?.type === 'check-in' || !template.schedule
    );
  }, []);

  // Get schedule from database or fallback to template (edit mode)
  const editScheduleData = useMemo(() => {
    if (!editingForm) return null;

    // First, check if form has schedule_config from database
    if (editingForm.schedule_config) {
      return editingForm.schedule_config;
    }

    // Fallback to template schedule
    const template = formTemplates.find((t) => t.name === editingForm.name);
    return template?.schedule;
  }, [editingForm]);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t('forms.form.nameRequired'))
      .max(100, t('forms.form.nameMaxLength')),
    description: z.string().optional(),
  });

  const form = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Populate form fields when editing
  useEffect(() => {
    if (editingForm && open) {
      form.reset({
        name: editingForm.name,
        description: editingForm.description || '',
      });
      setScheduleChanged(false);
    }
  }, [editingForm, open, form]);

  // Populate schedule state when editing
  useEffect(() => {
    if (editingForm && open && editScheduleData?.frequency) {
      setCheckInFrequency(editScheduleData.frequency);
      if (editScheduleData.selectedDays) {
        setSelectedDays(new Set(editScheduleData.selectedDays));
      } else if (editScheduleData.frequency === 'daily') {
        setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
      } else if (editScheduleData.frequency === 'weekly' || editScheduleData.frequency === 'biweekly') {
        setSelectedDays(new Set(['sunday']));
      }
      if (editScheduleData.monthlyOption) {
        setMonthlyOption(editScheduleData.monthlyOption);
      }
      if (editScheduleData.specificDay) {
        setSpecificDay(editScheduleData.specificDay);
      }
    }
  }, [editingForm, open, editScheduleData]);

  const handleClose = () => {
    form.reset();
    if (!isEditing) {
      setActiveTab('new');
      setSelectedTemplate(null);
    }
    setCheckInFrequency('daily');
    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
    setMonthlyOption('last');
    setSpecificDay(1);
    setScheduleChanged(false);
    onOpenChange(false);
  };

  const buildScheduleData = (): { scheduleConfig: Record<string, any>; cronExpression: string } => {
    const scheduleData: AssignFormScheduleData = {
      type: 'check-in',
      frequency: checkInFrequency,
      selectedDays: Array.from(selectedDays),
      monthlyOption,
      specificDay,
    };

    const cronExpression = convertScheduleToCron(scheduleData);

    return {
      scheduleConfig: scheduleData as Record<string, any>,
      cronExpression,
    };
  };

  const handleSave = async (values: FormFormValues) => {
    setIsSaving(true);
    try {
      const { scheduleConfig, cronExpression } = buildScheduleData();

      if (isEditing) {
        // Edit mode
        const updatedForm = await editCheckInDetails({
          id: editingForm.id,
          name: values.name,
          description: values.description,
          cron_expression: cronExpression,
          schedule_config: scheduleConfig,
        });

        toast.success(t('forms.toast.updateSuccess'));

        // Invalidate cache to refresh grid data
        queryClient.invalidateQueries({ queryKey: ['coach-check-ins'] });

        if (onSave) {
          onSave(updatedForm);
        }
      } else {
        // Add mode
        const questions = selectedTemplate?.questions || [];
        const payload: any = {
          ...values,
          schedule_config: scheduleConfig,
          cron_expression: cronExpression,
          questions,
          num_of_questions: questions.length,
        };
        const newForm = await addCheckIn(payload);
        toast.success(t('forms.create.success', { name: newForm.name }));
        if (onSave) {
          onSave(newForm, selectedTemplate?.questions);
        }
      }

      handleClose();
    } catch (error) {
      console.error('Failed to save form:', error);
      if (isEditing) {
        toast.error(t('forms.toast.updateError'));
      } else {
        toast.error(t('general.error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingForm) return;

    setIsDeleting(true);
    try {
      await deleteCheckIn(editingForm.id);
      toast.success(t('forms.toast.deleteSuccess'));

      // Invalidate cache to refresh grid data
      queryClient.invalidateQueries({ queryKey: ['coach-check-ins'] });

      if (onDelete) {
        onDelete(editingForm.id);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error(t('forms.toast.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    form.setValue('name', template.name, { shouldValidate: true });
    form.setValue('description', template.description || '', { shouldValidate: true });

    // Apply scheduling defaults from template
    if (template.schedule?.frequency) {
      setCheckInFrequency(template.schedule.frequency);

      if (template.schedule.selectedDays) {
        setSelectedDays(new Set(template.schedule.selectedDays));
      } else if (template.schedule.frequency === 'daily') {
        setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
      } else if (template.schedule.frequency === 'weekly' || template.schedule.frequency === 'biweekly') {
        setSelectedDays(new Set(['sunday']));
      }

      if (template.schedule.monthlyOption) {
        setMonthlyOption(template.schedule.monthlyOption);
      }

      if (template.schedule.specificDay) {
        setSpecificDay(template.schedule.specificDay);
      }
    } else {
      // Default values
      setCheckInFrequency('daily');
      setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
      setMonthlyOption('last');
      setSpecificDay(1);
    }
  };

  const handleEditTemplate = () => {
    setActiveTab('templates');
  };

  const handleSaveFromTemplate = async () => {
    if (selectedTemplate) {
      setIsSaving(true);
      const { scheduleConfig, cronExpression } = buildScheduleData();
      const values: any = {
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        schedule_config: scheduleConfig,
        cron_expression: cronExpression,
        questions: selectedTemplate.questions,
        num_of_questions: selectedTemplate.questions.length,
      };
      try {
        const newForm = await addCheckIn(values);
        toast.success(t('forms.create.success', { name: newForm.name }));
        if (onSave) {
          onSave(newForm, selectedTemplate.questions);
        }
        handleClose();
      } catch (error) {
        console.error('Failed to save form:', error);
        toast.error(t('general.error'));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getScheduleExplanation = (): string => {
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
    return '';
  };

  const hasChanges = editingForm && (
    form.watch('name') !== editingForm.name ||
    form.watch('description') !== (editingForm.description || '') ||
    scheduleChanged
  );

  const isValid = isEditing
    ? form.formState.isValid && form.watch('name').trim() !== ''
    : activeTab === 'new'
      ? form.formState.isValid && form.watch('name').trim() !== ''
      : selectedTemplate !== null;

  const templateColumns: ColumnDefinition<FormTemplate>[] = useMemo(() => [
    {
      id: 'name',
      label: t('forms.form.name'),
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderCell: (row) => (
        <div className="flex items-center gap-3 w-full min-w-0">
          <FileText className="size-4 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'questions',
      label: 'Questions',
      width: { class: 'min-w-[120px]', pixel: '120px' },
      renderCell: (row) => (
        <span className="truncate text-sm text-muted-foreground">
          {row.questions.length} {row.questions.length === 1 ? 'question' : 'questions'}
        </span>
      ),
    },
  ], [t]);

  // Shared form fields JSX for both add and edit modes
  const renderFormFields = () => (
    <>
      <div className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span>
                  {t('forms.form.name')}
                  <RequiredAsterisk />
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('forms.form.namePlaceholder')}
                  aria-label={t('forms.form.name')}
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.form.description')}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.form.descriptionPlaceholder')}
                aria-label={t('forms.form.description')}
                rows={3}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isEditing && selectedTemplate && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium leading-none">
            {t('forms.template')}
          </Label>
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {selectedTemplate.name}
                </span>
                {selectedTemplate.description && (
                  <span className="text-xs text-muted-foreground">
                    {selectedTemplate.description}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {selectedTemplate.questions.length} {selectedTemplate.questions.length === 1 ? 'question' : 'questions'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditTemplate}
                className="h-8 w-8 flex-shrink-0"
                aria-label={t('general.change')}
              >
                <Edit className="size-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <Label>
          <span>
            {t('athletes.profile.checkIns.schedule.frequency.label')}
            <span className="text-destructive">*</span>
          </span>
        </Label>
        <ToggleGroup
          type="single"
          value={checkInFrequency}
          onValueChange={(value) => {
            if (value) {
              const newFrequency = value as 'daily' | 'weekly' | 'biweekly' | 'monthly';
              setCheckInFrequency(newFrequency);
              if (isEditing) setScheduleChanged(true);
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
          <ToggleGroupItem value="daily" aria-label={t('athletes.profile.checkIns.schedule.frequency.daily')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {t('athletes.profile.checkIns.schedule.frequency.daily')}
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.weekly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {t('athletes.profile.checkIns.schedule.frequency.weekly')}
          </ToggleGroupItem>
          <ToggleGroupItem value="biweekly" aria-label={t('athletes.profile.checkIns.schedule.frequency.biweekly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {t('athletes.profile.checkIns.schedule.frequency.biweekly')}
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" aria-label={t('athletes.profile.checkIns.schedule.frequency.monthly')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {t('athletes.profile.checkIns.schedule.frequency.monthly')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-4 w-full">
        <Label>
          <span>
            {checkInFrequency === 'daily' && t('athletes.profile.checkIns.schedule.selectDays')}
            {(checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && t('athletes.profile.checkIns.schedule.selectDay')}
            {checkInFrequency === 'monthly' && t('athletes.profile.checkIns.schedule.dayOfMonth')}
            <span className="text-destructive">*</span>
          </span>
        </Label>
        {/* Daily - multi-select */}
        {checkInFrequency === 'daily' && (
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
                    if (isEditing) setScheduleChanged(true);
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
                  if (isEditing) setScheduleChanged(true);
                }}>
                  {t(`habits.form.${day}`)}
                </Label>
              </div>
            ))}
          </div>
        )}
        {/* Weekly/Biweekly - single-select */}
        {(checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && (
          <div className="flex gap-2 flex-wrap w-full justify-between">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedDays.has(day)}
                  onCheckedChange={(checked) => {
                    // Single select: clicking always sets this day as the only selected one
                    if (checked) {
                      setSelectedDays(new Set([day]));
                      if (isEditing) setScheduleChanged(true);
                    }
                    // Don't allow unchecking the only selected day
                  }}
                  aria-label={t(`habits.form.${day}`)}
                />
                <Label className="text-sm font-normal cursor-pointer" onClick={() => {
                  // Single select: clicking always sets this day as the only selected one
                  if (!selectedDays.has(day)) {
                    setSelectedDays(new Set([day]));
                    if (isEditing) setScheduleChanged(true);
                  }
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
                  if (isEditing) setScheduleChanged(true);
                }
              }}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              <ToggleGroupItem value="first" aria-label={t('athletes.profile.checkIns.schedule.monthly.first')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {t('athletes.profile.checkIns.schedule.monthly.first')}
              </ToggleGroupItem>
              <ToggleGroupItem value="last" aria-label={t('athletes.profile.checkIns.schedule.monthly.last')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {t('athletes.profile.checkIns.schedule.monthly.last')}
              </ToggleGroupItem>
              <ToggleGroupItem value="specific" aria-label={t('athletes.profile.checkIns.schedule.monthly.specific')} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
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
                <Select value={specificDay.toString()} onValueChange={(value) => {
                  setSpecificDay(parseInt(value, 10));
                  if (isEditing) setScheduleChanged(true);
                }}>
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

      <Alert className="bg-primary/5 border-primary/20 text-primary">
        <Info className="size-4" />
        <AlertDescription className="min-w-0 line-clamp-4">
          {getScheduleExplanation()}
        </AlertDescription>
      </Alert>
    </>
  );

  // Footer for edit mode
  const editFooter = (
    <div className="flex w-full justify-end gap-2">
      <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting || isSaving}>
        {t('general.cancel')}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleDelete}
        disabled={isDeleting || isSaving}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {t('general.delete')}
      </Button>
      <Button
        type="button"
        onClick={form.handleSubmit(handleSave)}
        disabled={!form.formState.isValid || !hasChanges || isDeleting || isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {t('general.save')}
      </Button>
    </div>
  );

  // Footer for add mode
  const addFooter = (
    <div className="flex w-full justify-end gap-2">
      <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
        {t('general.cancel')}
      </Button>
      <Button
        type="button"
        onClick={activeTab === 'new' ? form.handleSubmit(handleSave) : handleSaveFromTemplate}
        disabled={!isValid || isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {t('general.save')}
      </Button>
    </div>
  );

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('forms.editDetailsAndSchedule') : t('forms.addCheckInTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={isEditing ? editFooter : addFooter}
    >
      {isEditing ? (
        // Edit mode: show form directly without tabs
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(handleSave)(e);
            }}
            className="flex flex-col gap-6"
          >
            {renderFormFields()}
          </form>
        </Form>
      ) : (
        // Add mode: show tabs
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'templates')} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full mb-6">
            <TabsTrigger
              value="new"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              {t('forms.newForm')}
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              {t('forms.athliTemplates')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit(handleSave)(e);
                }}
                className="flex flex-col gap-6"
              >
                {renderFormFields()}
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="templates" className="mt-0 h-full flex-1 flex flex-col min-h-0">
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="flex flex-col gap-2 flex-1 min-h-0">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  <span>
                    {t('forms.template')}
                    <RequiredAsterisk />
                  </span>
                </label>
                <div className="flex-1 min-h-0 [&_.border-t]:border-t-0">
                  <DataGrid
                    data={checkInTemplates}
                    columns={templateColumns}
                    getRowId={(row) => row.name}
                    gridKey="check-in-templates"
                    searchPlaceholder={t('forms.searchPlaceholder')}
                    searchFields={[(row) => `${row.name} ${row.description || ''}`]}
                    enableSearch={true}
                    enableEditColumns={false}
                    enableExport={false}
                    enableRowSelection={false}
                    selectOnRowClick={true}
                    onRowClick={(row) => {
                      handleSelectTemplate(row);
                      setActiveTab('new');
                    }}
                    emptyMessage={t('forms.emptyMessage')}
                    rowHeight="54px"
                    compactMode={true}
                    showPagination={false}
                    gridPadding={false}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </SidePanel >
  );
};
