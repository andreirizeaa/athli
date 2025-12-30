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
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sectionTypeOptions = getSectionTypeOptions();
  const selectedOption = sectionTypeOptions.find(opt => opt.value === sectionType);

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setSectionType('regular');
    setTitleError(null);
    onClose();
  };

  const handleCreate = async () => {
    // Validate
    if (!title.trim()) {
      setTitleError('Section name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Call parent handler
      await onCreateSection({
        title: title.trim(),
        description: description.trim(),
        sectionType,
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
            disabled={!title.trim() || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t('library.sections.actions.newSection')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Section Name */}
        <div className="flex flex-col">
          <Label htmlFor="section-name" className="text-sm font-medium">
            {t('library.sections.section')}<RequiredAsterisk />
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
        <div className="flex flex-col">
          <Label htmlFor="section-type" className="text-sm font-medium">
            {t('library.sections.sectionType')}<RequiredAsterisk />
          </Label>
          <Select value={sectionType} onValueChange={(value) => setSectionType(value as SectionType)}>
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

        {/* Description */}
        <div className="flex flex-col gap-2">
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
