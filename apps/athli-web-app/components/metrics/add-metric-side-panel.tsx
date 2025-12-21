'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { defaultMetrics, type DefaultMetric } from '@/constants/metrics';

type MetricFormValues = {
  name: string;
  unit?: string;
  description?: string;
};

type AddMetricSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, unit: string, description?: string) => Promise<void>;
};

export const AddMetricSidePanel = ({
  open,
  onOpenChange,
  onSave,
}: AddMetricSidePanelProps) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'manual' | 'library'>('library');
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');

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

  const handleClose = () => {
    form.reset();
    setActiveTab('library');
    setLibrarySearchQuery('');
    onOpenChange(false);
  };

  const handleSave = async (values: MetricFormValues) => {
    await onSave(values.name, values.unit || '', values.description);
    handleClose();
  };

  const handleSelectMetric = (metric: DefaultMetric) => {
    form.setValue('name', metric.name);
    form.setValue('unit', metric.unit);
    form.setValue('description', '');
    setActiveTab('manual');
  };

  const handleMetricCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, metric: DefaultMetric) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectMetric(metric);
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

  const filteredLibraryMetrics = useMemo(() => {
    if (!librarySearchQuery.trim()) {
      return defaultMetrics;
    }

    const query = librarySearchQuery.trim().toLowerCase();
    return defaultMetrics.map((section) => ({
      ...section,
      metrics: section.metrics.filter((metric) =>
        isFuzzyMatch(metric.name, query) ||
        isFuzzyMatch(metric.unit, query)
      ),
    })).filter((section) => section.metrics.length > 0);
  }, [librarySearchQuery]);

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
        activeTab === 'manual' ? (
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'library')} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger
            value="library"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('metrics.tabs.athliLibrary')}
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="flex-1 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
          >
            {t('metrics.tabs.newMetric')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-0">
          <div className="flex flex-col gap-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-1">
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
            {filteredLibraryMetrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('metrics.noMetricsFound', { query: librarySearchQuery })}</p>
              </div>
            ) : (
              filteredLibraryMetrics.map((section) => (
                <div key={section.label} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {section.metrics.map((metric) => (
                      <Card
                        key={`${section.label}-${metric.name}`}
                        className="p-4 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelectMetric(metric)}
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
        </TabsContent>

        <TabsContent value="manual" className="mt-0">
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
        </TabsContent>
      </Tabs>
    </SidePanel>
  );
};
