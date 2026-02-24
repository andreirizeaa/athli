'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Edit, Plus, X } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { getClientMetrics } from '@/api/client/client-metric-service';
import { getAllMetrics, type Metric } from '@/api/coach/coach-metric-service';
import { useUserProfile } from '@/hooks/use-user-profile';

type MetricOption = {
  id: string;
  name: string;
  unit?: string;
};

type QuestionFormat = {
  id: string;
  label: string;
  subtitle: string;
};

export type QuestionData = {
  id: string;
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
  metricId?: string;
};

type AddQuestionSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (question: any) => void;
  questions: any[];
  clientId?: string;
  formType?: 'check-in' | 'questionnaire';
  question?: QuestionData | null;
};

export const AddQuestionSidePanel = ({ open, onOpenChange, onSave, questions, clientId, formType, question }: AddQuestionSidePanelProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useUserProfile();
  const [questionText, setQuestionText] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>(['']);
  const [mediaCount, setMediaCount] = useState<number>(1);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [metrics, setMetrics] = useState<MetricOption[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const questionMetricIdRef = useRef<string>('');

  const isEditing = !!question;

  const syncsWithFormats: QuestionFormat[] = [
    { id: 'progressPhoto', label: t('forms.detail.addQuestion.formats.progressPhoto'), subtitle: t('forms.detail.addQuestion.formats.progressPhotoSubtitle') },
    { id: 'metrics', label: t('forms.detail.addQuestion.formats.metrics'), subtitle: t('forms.detail.addQuestion.formats.metricsSubtitle') },
  ];

  const safeQuestions = questions || [];
  const isProgressPhotoAlreadyUsed = safeQuestions.some(q =>
    q.format === 'progressPhoto' && (isEditing ? q.id !== question?.id : true)
  );
  const usedMetricIds = new Set(
    safeQuestions
      .filter(q => q.format === 'metrics' && (isEditing ? q.id !== question?.id : true))
      .map(q => q.metricId)
  );

  const generalFormats: QuestionFormat[] = [
    { id: 'text', label: t('forms.detail.addQuestion.formats.text'), subtitle: t('forms.detail.addQuestion.formats.textSubtitle') },
    { id: 'number', label: t('forms.detail.addQuestion.formats.number'), subtitle: t('forms.detail.addQuestion.formats.numberSubtitle') },
    { id: 'multipleChoice', label: t('forms.detail.addQuestion.formats.multipleChoice'), subtitle: t('forms.detail.addQuestion.formats.multipleChoiceSubtitle') },
    { id: 'scale', label: t('forms.detail.addQuestion.formats.scale'), subtitle: t('forms.detail.addQuestion.formats.scaleSubtitle') },
    { id: 'yesNo', label: t('forms.detail.addQuestion.formats.yesNo'), subtitle: t('forms.detail.addQuestion.formats.yesNoSubtitle') },
    { id: 'images', label: t('forms.detail.addQuestion.formats.images'), subtitle: t('forms.detail.addQuestion.formats.imagesSubtitle') },
    { id: 'videos', label: t('forms.detail.addQuestion.formats.videos'), subtitle: t('forms.detail.addQuestion.formats.videosSubtitle') },
    { id: 'date', label: t('forms.detail.addQuestion.formats.date'), subtitle: t('forms.detail.addQuestion.formats.dateSubtitle') },
    { id: 'rating', label: t('forms.detail.addQuestion.formats.rating'), subtitle: t('forms.detail.addQuestion.formats.ratingSubtitle') },
    { id: 'signature', label: t('forms.detail.addQuestion.formats.signature'), subtitle: t('forms.detail.addQuestion.formats.signatureSubtitle') },
  ];

  const allFormats = [...syncsWithFormats, ...generalFormats];

  const filteredSyncsWithFormats = syncsWithFormats.filter(
    (format) => {
      // Hide progress photo if already used
      if (format.id === 'progressPhoto' && isProgressPhotoAlreadyUsed) return false;
      // Hide metrics for questionnaires (metrics only apply to check-ins) - only in add mode
      if (!isEditing && format.id === 'metrics' && formType === 'questionnaire') return false;
      return true;
    }
  );

  const filteredMetrics = metrics.filter((metric) => !usedMetricIds.has(metric.id));

  const resetForm = () => {
    setQuestionText('');
    setIsRequired(true);
    setSelectedFormat(null);
    setOptions(['']);
    setMediaCount(1);
    setSelectedMetricId('');
    setMetrics([]);
    questionMetricIdRef.current = '';
  };

  // Reset form when panel closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Populate form state from question data when editing
  useEffect(() => {
    if (question && open) {
      setQuestionText(question.question);
      setIsRequired(question.required);
      setSelectedFormat(question.format);
      if (question.format === 'multipleChoice') {
        setOptions(question.options && question.options.length > 0 ? question.options : ['']);
      } else {
        setOptions(['']);
      }
      if (question.format === 'images' || question.format === 'videos') {
        setMediaCount(question.mediaCount || 1);
      } else {
        setMediaCount(1);
      }
      if (question.format === 'metrics') {
        const metricId = question.metricId || '';
        questionMetricIdRef.current = metricId;
        setSelectedMetricId(metricId);
      } else {
        questionMetricIdRef.current = '';
        setSelectedMetricId('');
      }
    }
  }, [question, open]);

  // Fetch metrics eagerly when panel opens with clientId (so metricsCardState is accurate),
  // or when metrics format is selected without clientId (edit mode in coach library)
  useEffect(() => {
    if (!open) return;
    if (clientId) {
      fetchMetrics();
    } else if (selectedFormat === 'metrics') {
      fetchMetrics();
    }
  }, [open, clientId, selectedFormat]);

  const fetchMetrics = async () => {
    if (isEditing) {
      // Edit mode: fetch all metrics from coach-metric-service
      setIsLoadingMetrics(true);
      try {
        const fetchedMetrics = await getAllMetrics();
        setMetrics(fetchedMetrics.map(m => ({ id: m.id, name: m.name, unit: m.unit })));
        // After metrics are loaded, set the selectedMetricId from the ref
        if (questionMetricIdRef.current) {
          setSelectedMetricId(questionMetricIdRef.current);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    } else {
      // Add mode: fetch client metrics
      if (!clientId) {
        setMetrics([]); // No fetching on coach side
        return;
      }
      setIsLoadingMetrics(true);
      try {
        const clientMetrics = await getClientMetrics(clientId, user?.id || '');
        setMetrics(clientMetrics.map(m => ({ id: m.id, name: m.name, unit: m.unit })));
      } catch (error) {
        console.error('Failed to fetch client metrics:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    }
  };

  const metricsCardState = useMemo(() => {
    // In edit mode, metrics card is always enabled
    if (isEditing) {
      return { enabled: true };
    }
    // Coach side - no client context
    if (!clientId) {
      return { enabled: false, reason: 'no-client-context' as const };
    }
    // Client profile - no metrics assigned
    if (filteredMetrics.length === 0 && !isLoadingMetrics) {
      return { enabled: false, reason: 'no-metrics-assigned' as const };
    }
    // Enabled
    return { enabled: true };
  }, [isEditing, clientId, filteredMetrics, isLoadingMetrics]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = () => {
    if (isEditing && !question) return;

    if (selectedFormat === 'multipleChoice') {
      const hasValidOptions = options.some((opt) => opt.trim() !== '');
      if (!hasValidOptions) {
        return;
      }
    }

    const questionData: any = isEditing
      ? {
          ...question,
          question: questionText,
          required: isRequired,
          format: selectedFormat || '',
        }
      : {
          question: questionText,
          required: isRequired,
          format: selectedFormat,
        };

    if (selectedFormat === 'multipleChoice') {
      questionData.options = options.filter((opt) => opt.trim() !== '');
    }
    if (selectedFormat === 'scale') {
      questionData.scaleFrom = '1';
      questionData.scaleTo = '10';
    }
    if (selectedFormat === 'images' || selectedFormat === 'videos') {
      questionData.mediaCount = mediaCount;
    }
    if (selectedFormat === 'metrics') {
      questionData.metricId = selectedMetricId;
    }

    onSave(questionData);
    handleClose();
  };

  const handleFormatSelect = (format: string) => {
    if (format === 'progressPhoto' && isProgressPhotoAlreadyUsed) {
      return;
    }
    setSelectedFormat(format);
    if (format === 'multipleChoice') {
      if (options.length === 0 || options.every((opt) => opt.trim() === '')) {
        setOptions(['']);
      }
    } else {
      setOptions(['']);
    }
    if (format === 'images' || format === 'videos') {
      setMediaCount(1);
    } else {
      setMediaCount(1);
    }
    if (format === 'metrics') {
      setSelectedMetricId('');
    } else {
      setSelectedMetricId('');
    }
  };

  const handleChangeFormat = () => {
    setSelectedFormat(null);
    setOptions(['']);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const isValid = questionText.trim() &&
    selectedFormat &&
    !(selectedFormat === 'multipleChoice' && !options.some((opt) => opt.trim() !== '')) &&
    !(selectedFormat === 'metrics' && !selectedMetricId);

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('forms.detail.editQuestion.title') : t('forms.detail.addQuestion.title')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onSave={handleSave}
      saveText={isEditing ? t('general.save') : t('general.add')}
      isSaveDisabled={!isValid}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            {t('forms.detail.addQuestion.question')}
            <RequiredAsterisk />
          </label>
          <Input
            type="text"
            placeholder={t('forms.detail.addQuestion.questionPlaceholder')}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground">
            {t('forms.detail.addQuestion.required')}
          </label>
          <div className="flex items-center gap-3">
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            <span className="text-sm text-muted-foreground">
              {isRequired ? t('general.yes') : t('general.no')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground">
            {t('forms.detail.addQuestion.format')}
            <RequiredAsterisk />
          </label>
          {selectedFormat ? (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {allFormats.find((f) => f.id === selectedFormat)?.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {allFormats.find((f) => f.id === selectedFormat)?.subtitle}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleChangeFormat}
                  className="h-8 w-8 flex-shrink-0"
                  aria-label={t('general.change')}
                >
                  <Edit className="size-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Syncs with section */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('forms.detail.addQuestion.syncsWith')}
                </label>
                <div className={cn(
                  "grid gap-3",
                  filteredSyncsWithFormats.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {filteredSyncsWithFormats.map((format) => {
                    const isMetrics = format.id === 'metrics';
                    const isDisabled = !isEditing && isMetrics && !metricsCardState.enabled;

                    const card = (
                      <Card
                        key={format.id}
                        role="button"
                        tabIndex={isDisabled ? -1 : 0}
                        onClick={() => !isDisabled && handleFormatSelect(format.id)}
                        onKeyDown={(e) => {
                          if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleFormatSelect(format.id);
                          }
                        }}
                        className={cn(
                          "p-4 transition-colors",
                          isDisabled
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-accent"
                        )}
                        aria-label={`Select ${format.label} format`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-foreground">{format.label}</span>
                          <span className="text-xs text-muted-foreground">{format.subtitle}</span>
                        </div>
                      </Card>
                    );

                    if (isDisabled) {
                      return (
                        <Tooltip key={format.id}>
                          <TooltipTrigger asChild>
                            <div>{card}</div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {metricsCardState.reason === 'no-client-context'
                              ? t('forms.detail.addQuestion.metricsDisabledNoClient')
                              : t('forms.detail.addQuestion.metricsDisabledNoMetrics')}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return card;
                  })}
                </div>
              </div>

              {/* General section */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('forms.detail.addQuestion.general')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {generalFormats.map((format) => (
                    <Card
                      key={format.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleFormatSelect(format.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleFormatSelect(format.id);
                        }
                      }}
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                      aria-label={`Select ${format.label} format`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-foreground">{format.label}</span>
                        <span className="text-xs text-muted-foreground">{format.subtitle}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedFormat === 'multipleChoice' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3">
              {options.map((option, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Label htmlFor={`option-${index + 1}`}>
                    {t('forms.detail.addQuestion.optionNumber', { number: index + 1 })}
                    <RequiredAsterisk />
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`option-${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={t('forms.detail.addQuestion.optionPlaceholder')}
                    />
                    {options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => handleRemoveOption(index)}
                        aria-label={t('general.remove')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="w-full gap-2"
                aria-label={t('forms.detail.addQuestion.addOption')}
              >
                <Plus className="h-4 w-4" />
                {t('forms.detail.addQuestion.addOption')}
              </Button>
            </div>
          </div>
        )}

        {(selectedFormat === 'images' || selectedFormat === 'videos') && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-foreground">
              {selectedFormat === 'images'
                ? t('forms.detail.addQuestion.numberOfImages')
                : t('forms.detail.addQuestion.numberOfVideos')}
              <RequiredAsterisk />
            </label>
            <ToggleGroup
              type="single"
              value={mediaCount.toString()}
              onValueChange={(value) => {
                if (value) {
                  setMediaCount(parseInt(value, 10));
                }
              }}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <ToggleGroupItem
                  key={num}
                  value={num.toString()}
                  aria-label={num.toString()}
                  className="flex-1"
                >
                  {num}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {selectedFormat === 'metrics' && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-foreground">
              {t('forms.detail.addQuestion.selectMetric')}
              <RequiredAsterisk />
            </label>
            <Select
              value={selectedMetricId}
              onValueChange={setSelectedMetricId}
              disabled={isLoadingMetrics}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingMetrics
                      ? t('general.loading')
                      : t('forms.detail.addQuestion.selectMetricPlaceholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredMetrics.length > 0 ? (
                  filteredMetrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name} {metric.unit && `(${metric.unit})`}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs gap-2 h-8 px-2"
                      onClick={() => router.push('/library/metrics')}
                    >
                      <Plus className="size-3" />
                      {t('forms.detail.addQuestion.pleaseAddMetric')}
                    </Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </SidePanel>
  );
};
