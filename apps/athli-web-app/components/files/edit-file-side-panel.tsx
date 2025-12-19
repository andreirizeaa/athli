'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';

const TAG_OPTIONS: Option[] = [
  { label: 'Training', value: 'Training' },
  { label: 'Nutrition', value: 'Nutrition' },
  { label: 'Recovery', value: 'Recovery' },
  { label: 'Mobility', value: 'Mobility' },
  { label: 'Rehab', value: 'Rehab' },
  { label: 'Technique', value: 'Technique' },
  { label: 'Mindset', value: 'Mindset' },
  { label: 'Education', value: 'Education' },
  { label: 'Assessment', value: 'Assessment' },
  { label: 'Progress', value: 'Progress' },
  { label: 'Checkin', value: 'Checkin' },
  { label: 'Program', value: 'Program' },
  { label: 'Workout', value: 'Workout' },
  { label: 'Warmup', value: 'Warmup' },
  { label: 'Cooldown', value: 'Cooldown' },
  { label: 'Cardio', value: 'Cardio' },
  { label: 'Strength', value: 'Strength' },
  { label: 'Hypertrophy', value: 'Hypertrophy' },
  { label: 'Conditioning', value: 'Conditioning' },
  { label: 'Power', value: 'Power' },
  { label: 'Endurance', value: 'Endurance' },
  { label: 'Flexibility', value: 'Flexibility' },
  { label: 'Lifestyle', value: 'Lifestyle' },
  { label: 'Supplements', value: 'Supplements' },
  { label: 'Template', value: 'Template' },
];

type EditFileSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
  fileName: string;
  tags: string[];
  onSave: (fileName: string, tags: string[]) => Promise<void>;
  onDelete: () => Promise<void>;
};

export const EditFileSidePanel = ({
  open,
  onOpenChange,
  fileId,
  fileName: initialFileName,
  tags: initialTags,
  onSave,
  onDelete,
}: EditFileSidePanelProps) => {
  const t = useTranslations();
  const [editFileName, setEditFileName] = useState<string>(initialFileName);
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>(initialTags);
  const [hasEditChanges, setHasEditChanges] = useState<boolean>(false);

  useEffect(() => {
    if (open && fileId) {
      setEditFileName(initialFileName);
      setEditSelectedTags([...initialTags]);
      setHasEditChanges(false);
    }
  }, [open, fileId, initialFileName, initialTags]);

  useEffect(() => {
    if (fileId && open) {
      const hasChanges =
        editFileName.trim() !== initialFileName ||
        JSON.stringify([...editSelectedTags].sort()) !== JSON.stringify([...initialTags].sort());
      setHasEditChanges(hasChanges);
    }
  }, [fileId, editFileName, editSelectedTags, initialFileName, initialTags, open]);

  const handleClose = () => {
    onOpenChange(false);
    setEditFileName(initialFileName);
    setEditSelectedTags([...initialTags]);
    setHasEditChanges(false);
  };

  const handleSave = async () => {
    if (!hasEditChanges) return;
    await onSave(editFileName.trim(), editSelectedTags);
    handleClose();
  };

  const handleDelete = async () => {
    await onDelete();
    handleClose();
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('files.editFile.title')}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasEditChanges}
          >
            {t('general.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
          >
            {t('general.delete')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* File Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-file-name" className="text-sm font-medium">
            {t('files.form.fileName')}
          </label>
          <Input
            id="edit-file-name"
            value={editFileName}
            onChange={(e) => setEditFileName(e.target.value)}
            placeholder={t('files.form.fileNamePlaceholder')}
          />
        </div>

        {/* Tags Dropdown */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t('files.form.tags')}</label>
          <MultiAsyncSelect
            options={TAG_OPTIONS}
            value={editSelectedTags}
            onValueChange={setEditSelectedTags}
            placeholder={t('files.form.selectTags')}
            searchPlaceholder={t('files.form.searchTags')}
            maxCount={3}
            clearText={t('general.clear')}
            closeText={t('general.close')}
          />
        </div>
      </div>
    </SidePanel>
  );
};

