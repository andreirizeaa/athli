'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SidePanel } from '@/components/app/side-panel';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSectionTypeOptions, type SectionType } from '../section-type-utils';

type CreateSectionSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateSection: (data: {
    title: string;
    description: string;
    sectionType: SectionType;
    roundDurationSec?: number;
    workSec?: number;
    restSec?: number;
    rounds?: number;
    intervalSec?: number;
    durationMin?: number;
  }) => void;
};

export const CreateSectionSidePanel = ({
  isOpen,
  onClose,
  onCreateSection,
}: CreateSectionSidePanelProps) => {
  const t = useTranslations();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectionType, setSectionType] = useState<SectionType>('regular');
  const [configValue, setConfigValue] = useState<string>('');
  // Tabata/HIIT config
  const [workSec, setWorkSec] = useState<string>('');
  const [restSec, setRestSec] = useState<string>('');
  const [rounds, setRounds] = useState<string>('');
  // EMOM config
  const [intervalSec, setIntervalSec] = useState<string>('');
  const [durationMin, setDurationMin] = useState<string>('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sectionTypeOptions = getSectionTypeOptions();
  const selectedOption = sectionTypeOptions.find(opt => opt.value === sectionType);

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setSectionType('regular');
    setConfigValue('');
    setWorkSec('');
    setRestSec('');
    setRounds('');
    setIntervalSec('');
    setDurationMin('');
    setTitleError(null);
    onClose();
  };

  // Check if section type needs config input
  const needsAmrapConfig = sectionType === 'amrap';
  const needsTabataHiitConfig = sectionType === 'tabata' || sectionType === 'hiit';
  const needsEmomConfig = sectionType === 'emom';
  const needsCircuitsConfig = sectionType === 'circuits';

  // Check if all required config fields are filled
  const isConfigValid = () => {
    if (sectionType === 'tabata' || sectionType === 'hiit') {
      return workSec.trim() !== '' && restSec.trim() !== '' && rounds.trim() !== '';
    }
    if (sectionType === 'emom') {
      return intervalSec.trim() !== '' && durationMin.trim() !== '';
    }
    if (sectionType === 'amrap') {
      return configValue.trim() !== '';
    }
    if (sectionType === 'circuits') {
      return rounds.trim() !== '';
    }
    return true;
  };

  const handleCreate = async () => {
    // Validate
    if (!title.trim()) {
      setTitleError('Section name is required');
      return;
    }

    if (!isConfigValid()) {
      return;
    }

    setIsSaving(true);
    try {
      // Build config based on section type
      const configData: {
        roundDurationSec?: number;
        workSec?: number;
        restSec?: number;
        rounds?: number;
        intervalSec?: number;
        durationMin?: number;
      } = {};

      if (sectionType === 'amrap' && configValue) {
        configData.roundDurationSec = parseInt(configValue, 10);
      } else if (sectionType === 'tabata' || sectionType === 'hiit') {
        if (workSec) configData.workSec = parseInt(workSec, 10);
        if (restSec) configData.restSec = parseInt(restSec, 10);
        if (rounds) configData.rounds = parseInt(rounds, 10);
      } else if (sectionType === 'emom') {
        if (intervalSec) configData.intervalSec = parseInt(intervalSec, 10);
        if (durationMin) configData.durationMin = parseInt(durationMin, 10);
      } else if (sectionType === 'circuits') {
        if (rounds) configData.rounds = parseInt(rounds, 10);
      }

      // Call parent handler
      await onCreateSection({
        title: title.trim(),
        description: description.trim(),
        sectionType,
        ...configData,
      });

      // Reset and close
      handleClose();
    } catch (error) {
      console.error('Failed to create section:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={t('library.sections.actions.newSection')}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving} className="gap-2">
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!title.trim() || !isConfigValid() || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t('library.sections.actions.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Section Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="section-name" className="text-sm font-medium">
            <span>
              {t('library.sections.section')}<RequiredAsterisk />
            </span>
          </Label>
          <Input
            id="section-name"
            placeholder={t('library.sections.sectionNamePlaceholder')}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            className={titleError ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {titleError && (
            <p className="text-sm text-destructive">{titleError}</p>
          )}
        </div>

        {/* Section Type */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label htmlFor="section-type" className="text-sm font-medium">
              <span>
                {t('library.sections.sectionType')}<RequiredAsterisk />
              </span>
            </Label>
            <Select value={sectionType} onValueChange={(value) => {
              const newType = value as SectionType;
              setSectionType(newType);
              // Set default values based on section type
              setConfigValue('');
              if (newType === 'tabata') {
                setWorkSec('20');
                setRestSec('10');
                setRounds('8');
                setIntervalSec('');
                setDurationMin('');
              } else if (newType === 'hiit') {
                setWorkSec('40');
                setRestSec('20');
                setRounds('10');
                setIntervalSec('');
                setDurationMin('');
              } else if (newType === 'emom') {
                setWorkSec('');
                setRestSec('');
                setRounds('');
                setIntervalSec('60');
                setDurationMin('10');
              } else if (newType === 'circuits') {
                setWorkSec('');
                setRestSec('');
                setRounds('3');
                setIntervalSec('');
                setDurationMin('');
              } else {
                setWorkSec('');
                setRestSec('');
                setRounds('');
                setIntervalSec('');
                setDurationMin('');
              }
            }}>
              <SelectTrigger id="section-type" className="w-full">
                <SelectValue>
                  {selectedOption?.label || t('library.sections.selectTypePlaceholder')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sectionTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col gap-0.5">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsAmrapConfig && (
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="section-config" className="text-sm font-medium">
                <span>
                  Duration (min)<RequiredAsterisk />
                </span>
              </Label>
              <Input
                id="section-config"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10"
                value={configValue}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '');
                  setConfigValue(value);
                }}
              />
            </div>
          )}
          {needsCircuitsConfig && (
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="circuits-rounds" className="text-sm font-medium">
                <span>
                  Rounds<RequiredAsterisk />
                </span>
              </Label>
              <Input
                id="circuits-rounds"
                type="text"
                inputMode="numeric"
                value={rounds}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setRounds(value);
                }}
              />
            </div>
          )}
        </div>

        {/* Tabata/HIIT Config */}
        {needsTabataHiitConfig && (
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="work-sec" className="text-sm font-medium">
                <span>Work (s)<RequiredAsterisk /></span>
              </Label>
              <Input
                id="work-sec"
                type="text"
                inputMode="numeric"
                value={workSec}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setWorkSec(value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="rest-sec" className="text-sm font-medium">
                <span>Rest (s)<RequiredAsterisk /></span>
              </Label>
              <Input
                id="rest-sec"
                type="text"
                inputMode="numeric"
                value={restSec}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setRestSec(value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="rounds" className="text-sm font-medium">
                <span>Rounds<RequiredAsterisk /></span>
              </Label>
              <Input
                id="rounds"
                type="text"
                inputMode="numeric"
                value={rounds}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setRounds(value);
                }}
              />
            </div>
          </div>
        )}

        {/* EMOM Config */}
        {needsEmomConfig && (
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="interval-sec" className="text-sm font-medium">
                <span>Interval (s)<RequiredAsterisk /></span>
              </Label>
              <Input
                id="interval-sec"
                type="text"
                inputMode="numeric"
                value={intervalSec}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setIntervalSec(value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="duration-min" className="text-sm font-medium">
                <span>Duration (min)<RequiredAsterisk /></span>
              </Label>
              <Input
                id="duration-min"
                type="text"
                inputMode="numeric"
                value={durationMin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setDurationMin(value);
                }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="section-description" className="text-sm font-medium">
            {t('general.description')}
          </Label>
          <Textarea
            id="section-description"
            placeholder={t('library.sections.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
    </SidePanel>
  );
};
