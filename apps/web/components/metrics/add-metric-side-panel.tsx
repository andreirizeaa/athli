'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, Info, Target, Check, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { defaultMetrics, type DefaultMetric } from '@/constants/metrics';
import { getAllMetrics, type Metric } from '@/api/coach/coach-metric-service';
import { type MetricScheduleData, convertMetricScheduleToCron } from '@/api/client/client-metric-service';
import { ScheduleSelector, type ScheduleFrequency, type MonthlyOption } from '@/components/app/schedule-selector';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';

type MetricFormValues = {
  name: string;
  unit?: string;
  description?: string;
};

type AddMetricSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    name: string,
    unit: string,
    description?: string,
    existingMetricId?: string,
    scheduleConfig?: MetricScheduleData,
    cronExpression?: string
  ) => Promise<void>;
  clientName?: string;
  clientId?: string;
  showLibraryTab?: boolean;
  metric?: {
    id: string;
    name: string;
    unit: string;
    description?: string;
    schedule_config?: MetricScheduleData;
    cron_expression?: string;
  } | null;
  onDelete?: (metricId: string) => Promise<void>;
  /** Whether to allow schedule configuration (used for client metrics in edit mode) */
  allowSchedule?: boolean;
};

export const AddMetricSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientName,
  clientId,
  showLibraryTab = true,
  metric,
  onDelete,
  allowSchedule = false,
}: AddMetricSidePanelProps) => {
  const t = useTranslations();
  const isEditing = !!metric;

  const [activeTab, setActiveTab] = useState<'yourLibrary' | 'athliLibrary' | 'newMetric'>(
    showLibraryTab ? 'yourLibrary' : 'athliLibrary'
  );
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [athliLibrarySearchQuery, setAthliLibrarySearchQuery] = useState<string>('');
  const [coachMetrics, setCoachMetrics] = useState<Metric[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedCoachMetrics, setSelectedCoachMetrics] = useState<Set<string>>(new Set());

  // Schedule state - optional (add mode uses showSchedule, edit mode uses scheduleEnabled)
  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [logFrequency, setLogFrequency] = useState<ScheduleFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  const [monthlyOption, setMonthlyOption] = useState<MonthlyOption>('last');
  const [specificDay, setSpecificDay] = useState<number>(1);

  const metricSchema = z.object({
    name: z.string().min(1, t('metrics.form.nameRequired')),
    unit: z.string().optional(),
    description: z.string().optional(),
  });

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      unit: '',
      description: '',
    },
  });

  // --- Edit mode: track original values for change detection ---
  const originalValues = useMemo(() => {
    if (!metric) return null;
    return {
      name: metric.name,
      unit: metric.unit,
      description: metric.description || '',
    };
  }, [metric]);

  const originalSchedule = useMemo(() => metric?.schedule_config, [metric]);
  const originalScheduleEnabled = useMemo(() => !!metric?.schedule_config?.frequency, [metric]);

  const currentValues = form.watch();

  const hasChanges = useMemo(() => {
    if (!isEditing || !originalValues) return false;

    const formChanged =
      currentValues.name !== originalValues.name ||
      currentValues.unit !== originalValues.unit ||
      currentValues.description !== originalValues.description;

    if (!allowSchedule) return formChanged;

    // Check if schedule enablement changed
    if (scheduleEnabled !== originalScheduleEnabled) return true;

    // If schedule is not enabled, only check form changes
    if (!scheduleEnabled) return formChanged;

    // Check if schedule changed
    const scheduleChanged =
      logFrequency !== (originalSchedule?.frequency || 'daily') ||
      JSON.stringify(Array.from(selectedDays).sort()) !== JSON.stringify((originalSchedule?.selectedDays || []).sort()) ||
      monthlyOption !== (originalSchedule?.monthlyOption || 'last') ||
      specificDay !== (originalSchedule?.specificDay || 1);

    return formChanged || scheduleChanged;
  }, [currentValues, originalValues, isEditing, allowSchedule, scheduleEnabled, originalScheduleEnabled, logFrequency, selectedDays, monthlyOption, specificDay, originalSchedule]);

  // --- Edit mode: populate form when panel opens ---
  useEffect(() => {
    if (open && isEditing && metric) {
      form.reset({
        name: metric.name,
        unit: metric.unit,
        description: metric.description || '',
      });

      // Reset schedule state from metric
      if (metric.schedule_config?.frequency) {
        setScheduleEnabled(true);
        setLogFrequency(metric.schedule_config.frequency || 'daily');
        setSelectedDays(new Set(metric.schedule_config.selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
        setMonthlyOption(metric.schedule_config.monthlyOption || 'last');
        setSpecificDay(metric.schedule_config.specificDay || 1);
      } else {
        setScheduleEnabled(false);
        setLogFrequency('daily');
        setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
        setMonthlyOption('last');
        setSpecificDay(1);
      }
    }
  }, [open, metric, isEditing, form]);

  useEffect(() => {
    if (open && !isEditing && activeTab === 'yourLibrary') {
      fetchCoachMetrics();
    }
  }, [open, activeTab, isEditing]);

  const fetchCoachMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const metrics = await getAllMetrics();
      setCoachMetrics(metrics);
    } catch (error) {
      console.error('Failed to fetch coach metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const handleClose = () => {
    form.reset();
    if (!isEditing) {
      setActiveTab(showLibraryTab ? 'yourLibrary' : 'athliLibrary');
      setLibrarySearchQuery('');
      setAthliLibrarySearchQuery('');
      setSelectedCoachMetrics(new Set());
      setShowSchedule(false);
    }
    setScheduleEnabled(false);
    setLogFrequency('daily');
    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
    setMonthlyOption('last');
    setSpecificDay(1);
    onOpenChange(false);
  };

  const buildScheduleData = (): { scheduleConfig: MetricScheduleData; cronExpression: string } => {
    const scheduleData: MetricScheduleData = {
      type: 'metric',
      frequency: logFrequency,
      selectedDays: Array.from(selectedDays),
      monthlyOption,
      specificDay,
    };

    const cronExpression = convertMetricScheduleToCron(scheduleData);

    return {
      scheduleConfig: scheduleData,
      cronExpression,
    };
  };

  const handleSave = async (values: MetricFormValues) => {
    setIsSaving(true);
    try {
      if (isEditing) {
        if (allowSchedule && scheduleEnabled) {
          const { scheduleConfig, cronExpression } = buildScheduleData();
          await onSave(values.name, values.unit || '', values.description, undefined, scheduleConfig, cronExpression);
        } else {
          // Pass undefined to clear schedule if it was previously set
          await onSave(values.name, values.unit || '', values.description, undefined, undefined);
        }
      } else {
        if (showSchedule) {
          const { scheduleConfig, cronExpression } = buildScheduleData();
          await onSave(values.name, values.unit || '', values.description, undefined, scheduleConfig, cronExpression);
        } else {
          await onSave(values.name, values.unit || '', values.description);
        }
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save metric:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFromYourLibrary = async () => {
    if (selectedCoachMetrics.size > 0) {
      setIsSaving(true);
      try {
        if (clientId && showSchedule) {
          const { scheduleConfig, cronExpression } = buildScheduleData();
          for (const metricId of selectedCoachMetrics) {
            const m = coachMetrics.find(cm => cm.id === metricId);
            if (m) {
              await onSave(m.name, m.unit, m.description, metricId, scheduleConfig, cronExpression);
            }
          }
        } else {
          for (const metricId of selectedCoachMetrics) {
            const m = coachMetrics.find(cm => cm.id === metricId);
            if (m) {
              await onSave(m.name, m.unit, m.description, metricId);
            }
          }
        }
        handleClose();
      } catch (error) {
        console.error('Failed to assign metrics:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!metric || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(metric.id);
      handleClose();
    } catch (error) {
      console.error('Failed to delete metric:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAthliMetric = (m: DefaultMetric) => {
    form.setValue('name', m.name);
    form.setValue('unit', m.unit);
    form.setValue('description', '');
    setActiveTab('newMetric');
  };

  const handleMetricCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, m: DefaultMetric) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectAthliMetric(m);
    }
  };

  const columns: ColumnDefinition<Metric>[] = useMemo(() => [
    {
      id: 'name',
      label: t('metrics.form.name'),
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <Target className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">{t('metrics.form.name')}</span>
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
              setSelectedCoachMetrics((prev) => {
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
          <span className="truncate text-sm">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'unit',
      label: 'Unit',
      width: { class: 'min-w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.unit?.toLowerCase() || '',
      renderCell: (row) => (
        <span className="truncate text-sm">{row.unit || '--'}</span>
      ),
    },
  ], [t, setSelectedCoachMetrics]);

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

  const filteredAthliLibraryMetrics = useMemo(() => {
    if (!athliLibrarySearchQuery.trim()) {
      return defaultMetrics;
    }

    const query = athliLibrarySearchQuery.trim().toLowerCase();
    return defaultMetrics.map((section) => ({
      ...section,
      metrics: section.metrics.filter((m) =>
        isFuzzyMatch(m.name, query) ||
        isFuzzyMatch(m.unit, query)
      ),
    })).filter((section) => section.metrics.length > 0);
  }, [athliLibrarySearchQuery]);

  const showAlert = !!clientName;

  const getButtonText = () => {
    if (activeTab === 'yourLibrary') {
      const count = selectedCoachMetrics.size;
      const baseText = clientId ? t('general.assign') : t('general.add');
      return count > 0 ? `${baseText} ${count} ${count === 1 ? 'Metric' : 'Metrics'}` : baseText;
    }
    return clientId ? t('general.assign') : t('general.add');
  };

  // --- Title ---
  const title = isEditing
    ? t('metrics.editMetricTitle')
    : (clientId ? "Assign Metric" : t('metrics.addMetricTitle'));

  // --- Content class name ---
  const contentClassName = isEditing
    ? (allowSchedule ? "w-full sm:w-[600px] sm:max-w-[600px]" : "w-full sm:w-[400px] sm:max-w-[400px]")
    : "w-full sm:w-[600px] sm:max-w-[600px]";

  // --- Footer ---
  const footer = isEditing ? (
    <div className="flex w-full justify-end gap-2">
      <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting || isSaving}>
        {t('general.cancel')}
      </Button>
      {onDelete && (
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          disabled={isDeleting || isSaving}
          className="gap-2"
          aria-label={metric ? t('metrics.actions.deleteAria', { name: metric.name }) : undefined}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {t('general.delete')}
        </Button>
      )}
      <Button
        type="button"
        onClick={form.handleSubmit(handleSave)}
        disabled={!form.formState.isValid || !hasChanges || isDeleting || isSaving}
        className="gap-2"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {t('general.save')}
      </Button>
    </div>
  ) : activeTab === 'yourLibrary' ? (
    <div className="flex w-full justify-end gap-2">
      <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
        {t('general.cancel')}
      </Button>
      <Button type="button" onClick={handleSaveFromYourLibrary} disabled={selectedCoachMetrics.size === 0 || isSaving} className="gap-2">
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {getButtonText()}
      </Button>
    </div>
  ) : activeTab === 'newMetric' ? (
    <div className="flex w-full justify-end gap-2">
      <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
        {t('general.cancel')}
      </Button>
      <Button
        type="button"
        onClick={form.handleSubmit(handleSave)}
        disabled={!form.watch('name') || isSaving}
        className="gap-2"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {clientId ? t('general.assign') : t('general.add')}
      </Button>
    </div>
  ) : null;

  // --- Shared form content (used in both add newMetric tab and edit mode) ---
  const metricFormContent = (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span>{t('metrics.form.name')}<RequiredAsterisk /></span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('metrics.form.namePlaceholder')}
                  aria-label={t('metrics.form.nameAria')}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('metrics.form.unit')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('metrics.form.unitPlaceholder')}
                  aria-label={t('metrics.form.unitAria')}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('metrics.form.description')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('metrics.form.descriptionPlaceholder')}
                  aria-label={t('metrics.form.descriptionAria')}
                  rows={3}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isEditing ? (
          allowSchedule && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="scheduleEnabled"
                  checked={scheduleEnabled}
                  onCheckedChange={(checked) => setScheduleEnabled(!!checked)}
                />
                <Label htmlFor="scheduleEnabled" className="text-sm font-medium cursor-pointer">
                  {t('metrics.schedule.addLogFrequency')}
                </Label>
              </div>
              {scheduleEnabled && (
                <ScheduleSelector
                  frequency={logFrequency}
                  onFrequencyChange={setLogFrequency}
                  selectedDays={selectedDays}
                  onSelectedDaysChange={setSelectedDays}
                  monthlyOption={monthlyOption}
                  onMonthlyOptionChange={setMonthlyOption}
                  specificDay={specificDay}
                  onSpecificDayChange={setSpecificDay}
                  translationPrefix="metrics.schedule"
                  showTopBorder={false}
                />
              )}
            </div>
          )
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="showScheduleNew"
                checked={showSchedule}
                onCheckedChange={(checked) => setShowSchedule(!!checked)}
              />
              <Label htmlFor="showScheduleNew" className="text-sm font-medium cursor-pointer">
                {t('metrics.schedule.addLogFrequency')}
              </Label>
            </div>
            {showSchedule && (
              <ScheduleSelector
                frequency={logFrequency}
                onFrequencyChange={setLogFrequency}
                selectedDays={selectedDays}
                onSelectedDaysChange={setSelectedDays}
                monthlyOption={monthlyOption}
                onMonthlyOptionChange={setMonthlyOption}
                specificDay={specificDay}
                onSpecificDayChange={setSpecificDay}
                translationPrefix="metrics.schedule"
                showTopBorder={false}
              />
            )}
          </div>
        )}
      </form>
    </Form>
  );

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
      title={title}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName={contentClassName}
      footer={footer}
    >
      {isEditing ? (
        metricFormContent
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'yourLibrary' | 'athliLibrary' | 'newMetric')} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full mb-6">
            {showLibraryTab && (
              <TabsTrigger
                value="yourLibrary"
                className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                {t('metrics.tabs.yourLibrary')}
              </TabsTrigger>
            )}
            <TabsTrigger
              value="athliLibrary"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              {t('metrics.tabs.athliLibrary')}
            </TabsTrigger>
            <TabsTrigger
              value="newMetric"
              className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
            >
              {t('metrics.tabs.newMetric')}
            </TabsTrigger>
          </TabsList>

          {showLibraryTab && (
            <TabsContent value="yourLibrary" className="mt-0 h-full flex flex-col min-h-0">
              {isLoadingMetrics ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('general.loading')}</p>
                </div>
              ) : coachMetrics.length === 0 ? (
                <Alert className="bg-primary/5 border-primary/20 text-primary">
                  <Info className="size-4" />
                  <AlertDescription className="min-w-0 line-clamp-4">
                    {t('metrics.noLibraryMetrics')}{' '}
                    <Link href="/metrics" className="underline hover:no-underline">
                      <strong>{t('metrics.libraryLink')}</strong>
                    </Link>
                    .
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
                    <DataGrid
                      data={coachMetrics}
                      columns={columns}
                      getRowId={(row) => row.id}
                      gridKey="add-metric-library"
                      searchPlaceholder={t('metrics.searchPlaceholder')}
                      searchFields={[(row) => `${row.name} ${row.unit || ''}`]}
                      enableSearch={true}
                      enableEditColumns={false}
                      enableExport={false}
                      enableRowSelection={true}
                      selectOnRowClick={true}
                      selectedRowIds={selectedCoachMetrics}
                      onSelectionChange={setSelectedCoachMetrics}
                      emptyMessage={t('metrics.emptyMessage')}
                      rowHeight="54px"
                      compactMode={true}
                      showPagination={false}
                      gridPadding={false}
                    />
                  </div>
                  {selectedCoachMetrics.size > 0 && clientId && (
                    <div className="space-y-4 border-t pt-6 mt-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="showScheduleLibrary"
                          checked={showSchedule}
                          onCheckedChange={(checked) => setShowSchedule(!!checked)}
                        />
                        <Label htmlFor="showScheduleLibrary" className="text-sm font-medium cursor-pointer">
                          {t('metrics.schedule.addLogFrequency')}
                        </Label>
                      </div>
                      {showSchedule && (
                        <ScheduleSelector
                          frequency={logFrequency}
                          onFrequencyChange={setLogFrequency}
                          selectedDays={selectedDays}
                          onSelectedDaysChange={setSelectedDays}
                          monthlyOption={monthlyOption}
                          onMonthlyOptionChange={setMonthlyOption}
                          specificDay={specificDay}
                          onSpecificDayChange={setSpecificDay}
                          translationPrefix="metrics.schedule"
                          showTopBorder={false}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="athliLibrary" className="mt-0">
            <div className="flex flex-col gap-6">
              {showAlert && (
                <Alert className="bg-primary/5 border-primary/20 text-primary">
                  <Info className="size-4" />
                  <AlertDescription className="min-w-0 line-clamp-4">
                    Metrics added here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general metric, navigate to the respective main page in <Link href="/metrics" className="underline hover:no-underline"><strong>Library</strong></Link>.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-6 overflow-y-auto px-1 pt-1 pb-1">
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('metrics.searchPlaceholder')}
                    value={athliLibrarySearchQuery}
                    onChange={(e) => setAthliLibrarySearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label={t('metrics.searchAria')}
                  />
                </div>
                {filteredAthliLibraryMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('metrics.noMetricsFound', { query: athliLibrarySearchQuery })}</p>
                  </div>
                ) : (
                  filteredAthliLibraryMetrics.map((section) => (
                    <div key={section.label} className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {section.metrics.map((m) => (
                          <Card
                            key={`${section.label}-${m.name}`}
                            className="p-4 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleSelectAthliMetric(m)}
                            onKeyDown={(e) => handleMetricCardKeyDown(e, m)}
                            tabIndex={0}
                            role="button"
                            aria-label={`Select metric: ${m.name}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{m.name}</span>
                              <span className="text-sm text-muted-foreground">{m.unit}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="newMetric" className="mt-0">
            <div className="flex flex-col gap-6">
              {showAlert && (
                <Alert className="bg-primary/5 border-primary/20 text-primary">
                  <Info className="size-4" />
                  <AlertDescription className="min-w-0 line-clamp-4">
                    Metrics added here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general metric, navigate to the respective main page in <Link href="/metrics" className="underline hover:no-underline"><strong>Library</strong></Link>.
                  </AlertDescription>
                </Alert>
              )}
              {metricFormContent}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </SidePanel>
  );
};
