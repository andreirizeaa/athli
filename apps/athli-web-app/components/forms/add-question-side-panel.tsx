'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Edit, Plus, X } from 'lucide-react';
import { cn } from '@/lib/general/utils';

type QuestionFormat = {
  id: string;
  label: string;
  subtitle: string;
};

type AddQuestionSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (question: {
    question: string;
    required: boolean;
    format: string;
    options?: string[];
    scaleFrom?: string;
    scaleTo?: string;
    mediaCount?: number;
  }) => void;
};

export const AddQuestionSidePanel = ({ open, onOpenChange, onSave }: AddQuestionSidePanelProps) => {
  const t = useTranslations();
  const [questionText, setQuestionText] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>(['']);
  const [scaleFrom, setScaleFrom] = useState<string>('1');
  const [scaleTo, setScaleTo] = useState<string>('10');
  const [mediaCount, setMediaCount] = useState<number>(1);

  const questionFormats: QuestionFormat[] = [
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
    { id: 'progressPhoto', label: t('forms.detail.addQuestion.formats.progressPhoto'), subtitle: t('forms.detail.addQuestion.formats.progressPhotoSubtitle') },
  ];

  const resetForm = () => {
    setQuestionText('');
    setIsRequired(true);
    setSelectedFormat(null);
    setOptions(['']);
    setScaleFrom('1');
    setScaleTo('10');
    setMediaCount(1);
  };

  // Reset form when panel closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = () => {
    if (selectedFormat === 'multipleChoice') {
      const hasValidOptions = options.some((opt) => opt.trim() !== '');
      if (!hasValidOptions) {
        return;
      }
    }
    if (selectedFormat === 'scale') {
      if (!scaleFrom.trim() || !scaleTo.trim()) {
        return;
      }
    }

    const questionData: any = {
      question: questionText,
      required: isRequired,
      format: selectedFormat,
    };

    if (selectedFormat === 'multipleChoice') {
      questionData.options = options.filter((opt) => opt.trim() !== '');
    }
    if (selectedFormat === 'scale') {
      questionData.scaleFrom = scaleFrom;
      questionData.scaleTo = scaleTo;
    }
    if (selectedFormat === 'images' || selectedFormat === 'videos') {
      questionData.mediaCount = mediaCount;
    }

    onSave(questionData);
    handleClose();
  };

  const handleFormatSelect = (format: string) => {
    setSelectedFormat(format);
    if (format === 'multipleChoice') {
      if (options.length === 0 || options.every((opt) => opt.trim() === '')) {
        setOptions(['']);
      }
    } else {
      setOptions(['']);
    }
    if (format === 'scale') {
      setScaleFrom('1');
      setScaleTo('10');
    } else {
      setScaleFrom('1');
      setScaleTo('10');
    }
    if (format === 'images' || format === 'videos') {
      setMediaCount(1);
    } else {
      setMediaCount(1);
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
    !(selectedFormat === 'scale' && (!scaleFrom.trim() || !scaleTo.trim()));

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('forms.detail.addQuestion.title')}
      onOpenAutoFocus={(e) => e.preventDefault()}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
          >
            {t('general.add')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
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
                    {questionFormats.find((f) => f.id === selectedFormat)?.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {questionFormats.find((f) => f.id === selectedFormat)?.subtitle}
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
            <div className="grid grid-cols-2 gap-3">
              {questionFormats.map((format) => (
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
                  className={cn(
                    "p-4 cursor-pointer hover:bg-accent transition-colors",
                    format.id === 'progressPhoto' && "col-span-2"
                  )}
                  aria-label={`Select ${format.label} format`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{format.label}</span>
                    <span className="text-xs text-muted-foreground">{format.subtitle}</span>
                  </div>
                </Card>
              ))}
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

        {selectedFormat === 'scale' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium text-foreground" htmlFor="scale-from">
                  {t('forms.detail.addQuestion.from')}
                  <RequiredAsterisk />
                </label>
                <Input
                  id="scale-from"
                  type="text"
                  value={scaleFrom}
                  onChange={(e) => setScaleFrom(e.target.value)}
                  placeholder="1 / Easy / Low"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium text-foreground" htmlFor="scale-to">
                  {t('forms.detail.addQuestion.to')}
                  <RequiredAsterisk />
                </label>
                <Input
                  id="scale-to"
                  type="text"
                  value={scaleTo}
                  onChange={(e) => setScaleTo(e.target.value)}
                  placeholder="10 / Hard / High"
                />
              </div>
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
      </div>
    </SidePanel>
  );
};



