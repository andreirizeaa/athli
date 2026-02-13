'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import { FileText, Info, Edit } from 'lucide-react';
import Link from 'next/link';
import { getCheckIns, type CheckIn as CoachCheckIn } from '@/api/coach/coach-check-in-service';
import { assignForm, convertScheduleToCron, type AssignFormScheduleData, createClientCheckIn } from '@/api/client/client-form-service';
import { formTemplates, type FormTemplate } from '@/constants/forms';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { toast } from 'sonner';

type AssignCheckInSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  clientId: string;
  coachId: string;
  clientName?: string;
};

type FormFormValues = {
  name: string;
  description?: string;
};

export const AssignCheckInSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientId,
  coachId,
  clientName,
}: AssignCheckInSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'yourLibrary' | 'athliLibrary' | 'newCheckIn'>('yourLibrary');
  const [coachCheckIns, setCoachCheckIns] = useState<CoachCheckIn[]>([]);
  const [isLoadingCheckIns, setIsLoadingCheckIns] = useState<boolean>(false);
  const [selectedCheckIns, setSelectedCheckIns] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Schedule state
  const [checkInFrequency, setCheckInFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<'first' | 'last' | 'specific'>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);

  // Filter templates to only show check-in templates
  const checkInTemplates = useMemo(() => {
    return formTemplates.filter((template) =>
      template.schedule?.type === 'check-in' || !template.schedule
    );
  }, []);

  useEffect(() => {
    if (open && activeTab === 'yourLibrary') {
      fetchCoachCheckIns();
    }
  }, [open, activeTab]);

  const fetchCoachCheckIns = async () => {
    setIsLoadingCheckIns(true);
    try {
      const checkIns = await getCheckIns();
      setCoachCheckIns(checkIns);
    } catch (error) {
      console.error('Failed to fetch coach check-ins:', error);
    } finally {
      setIsLoadingCheckIns(false);
    }
  };

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

  const handleClose = () => {
    form.reset();
    setActiveTab('yourLibrary');
    setSelectedCheckIns(new Set());
    setSelectedTemplate(null);
    setCheckInFrequency('daily');
    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
    setMonthlyOption('last');
    setSpecificDay(1);
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

  const handleSaveFromYourLibrary = async () => {
    if (selectedCheckIns.size === 0 || !clientId || !coachId) return;

    setIsSaving(true);
    try {
      for (const checkInId of selectedCheckIns) {
        const checkIn = coachCheckIns.find(c => c.id === checkInId);
        if (!checkIn) continue;

        const scheduleData: AssignFormScheduleData = {
          type: 'check-in',
          frequency: (checkIn.schedule_config?.frequency as any) || 'weekly',
          selectedDays: checkIn.schedule_config?.selectedDays || ['sunday'],
        };
        const cronExpression = convertScheduleToCron(scheduleData);

        // If 0 questions, set as draft
        const questionCount = checkIn.questionCount ?? checkIn.questions?.length ?? 0;
        const status = questionCount === 0 ? 'draft' : undefined;

        await assignForm({
          formId: checkIn.id,
          clientId: clientId,
          coachId: coachId,
          formType: 'check-in',
          cronExpression: cronExpression,
          scheduleData: scheduleData,
          status,
        });
      }

      toast.success(t('forms.assign.success'));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to assign check-ins:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFromAthliLibrary = async () => {
    if (!selectedTemplate || !clientId || !coachId) return;

    setIsSaving(true);
    try {
      const { scheduleConfig, cronExpression } = buildScheduleData();

      // Create client-specific check-in from template
      await createClientCheckIn({
        clientId,
        coachId,
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        questions: selectedTemplate.questions,
        scheduleConfig,
        cronExpression,
      });

      toast.success(t('forms.create.success', { name: selectedTemplate.name }));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to create client check-in:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewCheckIn = async (values: FormFormValues) => {
    if (!clientId || !coachId) return;

    setIsSaving(true);
    try {
      const { scheduleConfig, cronExpression } = buildScheduleData();
      const questions = selectedTemplate?.questions || [];

      // Create client-specific check-in
      await createClientCheckIn({
        clientId,
        coachId,
        name: values.name,
        description: values.description || '',
        questions,
        scheduleConfig,
        cronExpression,
      });

      toast.success(t('forms.create.success', { name: values.name }));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to create client check-in:', error);
      toast.error(t('general.error'));
    } finally {
      setIsSaving(false);
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

  const getButtonText = () => {
    if (activeTab === 'yourLibrary') {
      const count = selectedCheckIns.size;
      return count > 0 ? `${t('general.assign')} ${count} ${count === 1 ? 'Check-in' : 'Check-ins'}` : t('general.assign');
    }
    return t('general.assign');
  };

  const isValid = activeTab === 'yourLibrary'
    ? selectedCheckIns.size > 0
    : activeTab === 'athliLibrary'
      ? selectedTemplate !== null
      : form.formState.isValid && form.watch('name').trim() !== '';

  const yourLibraryColumns: ColumnDefinition<CoachCheckIn>[] = useMemo(() => [
    {
      id: 'name',
      label: t('forms.form.name'),
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">{t('forms.form.name')}</span>
          </div>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCheckIns((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(row.id)) {
                  newSet.delete(row.id);
                } else {
                  newSet.add(row.id);
                }
                return newSet;
              });
            }}
          >
            <Checkbox checked={isSelected} />
          </div>
          <div className="flex items-center gap-3 w-full min-w-0">
            <FileText className="size-4 text-muted-foreground" />
            <span className="truncate text-sm">{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'questions',
      label: 'Questions',
      width: { class: 'min-w-[120px]', pixel: '120px' },
      renderCell: (row) => (
        <span className="truncate text-sm">
          {row.questionCount ?? row.questions?.length ?? 0} {t('forms.questions')}
        </span>
      ),
    },
  ], [t, setSelectedCheckIns]);

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

  // Compute footer props based on active tab
  const footerSaveHandler = activeTab === 'yourLibrary'
    ? handleSaveFromYourLibrary
    : activeTab === 'athliLibrary'
      ? handleSaveFromAthliLibrary
      : form.handleSubmit(handleSaveNewCheckIn);

  const footerSaveText = activeTab === 'yourLibrary' ? getButtonText() : t('general.assign');

  const footerIsSaveDisabled = activeTab === 'yourLibrary'
    ? selectedCheckIns.size === 0
    : activeTab === 'athliLibrary'
      ? !selectedTemplate
      : !isValid;

  const showAlert = !!clientName && activeTab !== 'yourLibrary';

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
      title={t('general.assign') + ' Check-in'}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      onSave={footerSaveHandler}
      saveText={footerSaveText}
      isSaving={isSaving}
      isSaveDisabled={footerIsSaveDisabled}
      onCancel={handleClose}
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'yourLibrary' | 'athliLibrary' | 'newCheckIn')} className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="yourLibrary"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.yourLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="athliLibrary"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('habits.athliLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="newCheckIn"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('forms.newCheckIn')}
          </TabsTrigger>
        </TabsList>

        {showAlert && (
          <Alert className="bg-primary/5 border-primary/20 text-primary mb-6">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              Check-ins created here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general check-in, navigate to the respective main page in <Link href="/library/forms" className="underline hover:no-underline"><strong>Library</strong></Link>.
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="yourLibrary" className="mt-0 h-full flex flex-col min-h-0">
          {isLoadingCheckIns ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('general.loading')}</p>
            </div>
          ) : coachCheckIns.length === 0 ? (
            <Alert className="bg-primary/5 border-primary/20 text-primary">
              <Info className="size-4" />
              <AlertDescription className="min-w-0 line-clamp-4">
                {t('athletes.profile.checkIns.noFormsMessage')}{' '}
                <Link href="/library/forms" className="underline hover:no-underline">
                  <strong>{t('athletes.profile.checkIns.formsLink')}</strong>
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
              <DataGrid
                data={coachCheckIns}
                columns={yourLibraryColumns}
                getRowId={(row) => row.id}
                gridKey="assign-check-in-your-library"
                searchPlaceholder={t('forms.searchPlaceholder')}
                searchFields={[(row) => `${row.name} ${row.description || ''}`]}
                enableSearch={true}
                enableEditColumns={false}
                enableExport={false}
                enableRowSelection={true}
                selectOnRowClick={true}
                selectedRowIds={selectedCheckIns}
                onSelectionChange={setSelectedCheckIns}
                emptyMessage={t('forms.emptyMessage')}
                rowHeight="54px"
                compactMode={true}
                showPagination={false}
                gridPadding={false}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="athliLibrary" className="mt-0 h-full flex-1 flex flex-col min-h-0">
          {selectedTemplate ? (
            <div className="flex flex-col gap-6 overflow-y-auto">
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
                      onClick={() => setSelectedTemplate(null)}
                      className="h-8 w-8 flex-shrink-0"
                      aria-label={t('general.change')}
                    >
                      <Edit className="size-4" />
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Schedule Configuration */}
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
                        }}>
                          {t(`habits.form.${day}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                {(checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && (
                  <div className="flex gap-2 flex-wrap w-full justify-between">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedDays.has(day)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDays(new Set([day]));
                            }
                          }}
                          aria-label={t(`habits.form.${day}`)}
                        />
                        <Label className="text-sm font-normal cursor-pointer" onClick={() => {
                          if (!selectedDays.has(day)) {
                            setSelectedDays(new Set([day]));
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
                        <Select value={specificDay.toString()} onValueChange={(value) => setSpecificDay(parseInt(value, 10))}>
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
            </div>
          ) : (
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
                    gridKey="assign-check-in-athli-templates"
                    searchPlaceholder={t('forms.searchPlaceholder')}
                    searchFields={[(row) => `${row.name} ${row.description || ''}`]}
                    enableSearch={true}
                    enableEditColumns={false}
                    enableExport={false}
                    enableRowSelection={false}
                    selectOnRowClick={true}
                    onRowClick={(row) => {
                      handleSelectTemplate(row);
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
          )}
        </TabsContent>

        <TabsContent value="newCheckIn" className="mt-0">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSaveNewCheckIn)(e);
              }}
              className="flex flex-col gap-6"
            >
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

              {selectedTemplate && (
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
                        onClick={() => setSelectedTemplate(null)}
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
                        }}>
                          {t(`habits.form.${day}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                {(checkInFrequency === 'weekly' || checkInFrequency === 'biweekly') && (
                  <div className="flex gap-2 flex-wrap w-full justify-between">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedDays.has(day)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDays(new Set([day]));
                            }
                          }}
                          aria-label={t(`habits.form.${day}`)}
                        />
                        <Label className="text-sm font-normal cursor-pointer" onClick={() => {
                          if (!selectedDays.has(day)) {
                            setSelectedDays(new Set([day]));
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
                        <Select value={specificDay.toString()} onValueChange={(value) => setSpecificDay(parseInt(value, 10))}>
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
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};
