'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, Info, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { defaultMetrics, type DefaultMetric } from '@/constants/metrics';
import { getAllMetrics, type Metric } from '@/lib/api/coach/coach-metric-service';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';

type MetricFormValues = {
  name: string;
  unit?: string;
  description?: string;
};

type AddMetricSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, unit: string, description?: string) => Promise<void>;
  clientName?: string;
  clientId?: string;
};

export const AddMetricSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientName,
  clientId,
}: AddMetricSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'yourLibrary' | 'athliLibrary' | 'newMetric'>('yourLibrary');
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [athliLibrarySearchQuery, setAthliLibrarySearchQuery] = useState<string>('');
  const [coachMetrics, setCoachMetrics] = useState<Metric[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [selectedCoachMetric, setSelectedCoachMetric] = useState<Metric | null>(null);

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

  useEffect(() => {
    if (open && activeTab === 'yourLibrary') {
      fetchCoachMetrics();
    }
  }, [open, activeTab]);

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
    setActiveTab('yourLibrary');
    setLibrarySearchQuery('');
    setAthliLibrarySearchQuery('');
    setSelectedCoachMetric(null);
    onOpenChange(false);
  };

  const handleSave = async (values: MetricFormValues) => {
    await onSave(values.name, values.unit || '', values.description);
    handleClose();
  };

  const handleSaveFromYourLibrary = async () => {
    if (selectedCoachMetric) {
      await onSave(selectedCoachMetric.name, selectedCoachMetric.unit, selectedCoachMetric.description);
      handleClose();
    }
  };

  const handleSelectCoachMetric = (metric: Metric) => {
    setSelectedCoachMetric(metric);
  };

  const handleDeselectCoachMetric = () => {
    setSelectedCoachMetric(null);
  };

  const handleSelectAthliMetric = (metric: DefaultMetric) => {
    form.setValue('name', metric.name);
    form.setValue('unit', metric.unit);
    form.setValue('description', '');
    setActiveTab('newMetric');
  };

  const handleMetricCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, metric: DefaultMetric) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectAthliMetric(metric);
    }
  };

  const handleCoachMetricCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, metric: Metric) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectCoachMetric(metric);
    }
  };

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

  const filteredCoachMetrics = useMemo(() => {
    if (!librarySearchQuery.trim()) {
      return coachMetrics;
    }

    const query = librarySearchQuery.trim().toLowerCase();
    return coachMetrics.filter(
      (metric) =>
        isFuzzyMatch(metric.name, query) ||
        isFuzzyMatch(metric.unit, query) ||
        (metric.description && isFuzzyMatch(metric.description, query))
    );
  }, [coachMetrics, librarySearchQuery]);

  const filteredAthliLibraryMetrics = useMemo(() => {
    if (!athliLibrarySearchQuery.trim()) {
      return defaultMetrics;
    }

    const query = athliLibrarySearchQuery.trim().toLowerCase();
    return defaultMetrics.map((section) => ({
      ...section,
      metrics: section.metrics.filter((metric) =>
        isFuzzyMatch(metric.name, query) ||
        isFuzzyMatch(metric.unit, query)
      ),
    })).filter((section) => section.metrics.length > 0);
  }, [athliLibrarySearchQuery]);

  const showAlert = !!clientName;
  const isValid = activeTab === 'yourLibrary'
    ? selectedCoachMetric !== null
    : form.formState.isValid;

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
      title={t('metrics.addMetricTitle')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentClassName="w-full sm:w-[600px] sm:max-w-[600px]"
      footer={
        activeTab === 'yourLibrary' ? (
          <div className="flex w-full justify-start gap-2">
            <Button type="button" onClick={handleSaveFromYourLibrary} disabled={!selectedCoachMetric}>
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        ) : activeTab === 'newMetric' ? (
          <div className="flex w-full justify-start gap-2">
            <Button
              type="button"
              onClick={form.handleSubmit(handleSave)}
              disabled={!form.formState.isValid}
            >
              {t('general.save')}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
          </div>
        ) : null
      }
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'yourLibrary' | 'athliLibrary' | 'newMetric')} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="yourLibrary"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('metrics.tabs.yourLibrary')}
          </TabsTrigger>
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

        <TabsContent value="yourLibrary" className="mt-0">
          <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
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
              <>
                <div className="relative mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('metrics.searchPlaceholder')}
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label={t('metrics.searchAria')}
                  />
                </div>
                {filteredCoachMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('metrics.emptyMessage')}</p>
                  </div>
                ) : selectedCoachMetric ? (
                  <>
                    <Card className="p-4 ring-2 ring-primary">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{selectedCoachMetric.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{selectedCoachMetric.unit}</span>
                            {selectedCoachMetric.description && (
                              <span className="text-xs text-muted-foreground">• {selectedCoachMetric.description}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDeselectCoachMetric}
                          className="h-8 w-8 flex-shrink-0"
                          aria-label={t('general.edit')}
                        >
                          <Info className="size-4" />
                        </Button>
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredCoachMetrics.map((metric) => (
                      <Card
                        key={metric.id}
                        className="p-4 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelectCoachMetric(metric)}
                        onKeyDown={(e) => handleCoachMetricCardKeyDown(e, metric)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select metric: ${metric.name}`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium text-foreground">{metric.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{metric.unit}</span>
                            {metric.description && (
                              <span className="text-xs text-muted-foreground">• {metric.description}</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

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
            <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
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
                      {section.metrics.map((metric) => (
                        <Card
                          key={`${section.label}-${metric.name}`}
                          className="p-4 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectAthliMetric(metric)}
                          onKeyDown={(e) => handleMetricCardKeyDown(e, metric)}
                          tabIndex={0}
                          role="button"
                          aria-label={`Select metric: ${metric.name}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{metric.name}</span>
                            <span className="text-sm text-muted-foreground">{metric.unit}</span>
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
              </form>
            </Form>
          </div>
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};
