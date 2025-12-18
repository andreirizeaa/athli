'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

type AddFileSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fileName: string, file: File, tags: string[]) => Promise<void>;
  clientName?: string;
};

export const AddFileSidePanel = ({
  open,
  onOpenChange,
  onSave,
  clientName,
}: AddFileSidePanelProps) => {
  const t = useTranslations();
  const [fileName, setFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    onOpenChange(false);
    setFileName('');
    setSelectedFile(null);
    setSelectedTags([]);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!fileName.trim() || !selectedFile) return;
    await onSave(fileName.trim(), selectedFile, selectedTags);
    handleClose();
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!fileName.trim()) {
      setFileName(file.name);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const showAlert = !!clientName;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('files.addFile')}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button type="button" onClick={handleSave} disabled={!fileName.trim() || !selectedFile}>
            {t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      {showAlert && (
        <Alert className="bg-primary/5 border-primary/20 text-primary mb-6">
          <Info className="size-4" />
          <AlertDescription className="min-w-0 line-clamp-4">
            Files added here are specific to <strong>{clientName}</strong>. If you want this to be saved as a general file, navigate to the respective main page in <Link href="/files" className="underline hover:no-underline"><strong>Library</strong></Link>.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        {/* File Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="file-name" className="text-sm font-medium">
            {t('files.form.fileName')}
          </label>
          <Input
            id="file-name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={t('files.form.fileNamePlaceholder')}
          />
        </div>

        {/* File Drop Area */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t('files.form.file')}</label>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary',
              selectedFile && 'border-primary bg-primary/5'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <>
                <Check className="size-10 text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  {t('files.form.changeFile')}
                </Button>
              </>
            ) : (
              <>
                <Upload className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t('files.form.dropFileHere')}</p>
                  <p className="text-xs text-muted-foreground">{t('files.form.orClickToSelect')}</p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('files.form.selectFile')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tags Dropdown */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t('files.form.tags')}</label>
          <MultiAsyncSelect
            options={TAG_OPTIONS}
            value={selectedTags}
            onValueChange={setSelectedTags}
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
