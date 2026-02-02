'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
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
  const [hasEditChanges, setHasEditChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open && fileId) {
      setEditFileName(initialFileName);
      setHasEditChanges(false);
    }
  }, [open, fileId, initialFileName]);

  useEffect(() => {
    if (fileId && open) {
      const hasChanges = editFileName.trim() !== initialFileName;
      setHasEditChanges(hasChanges);
    }
  }, [fileId, editFileName, initialFileName, open]);

  const handleClose = () => {
    onOpenChange(false);
    setEditFileName(initialFileName);
    setHasEditChanges(false);
  };

  const handleSave = async () => {
    if (!hasEditChanges || isSaving || isDeleting) return;
    setIsSaving(true);
    try {
      await onSave(editFileName.trim(), initialTags);
      handleClose();
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isSaving || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete();
      handleClose();
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={t('files.editFile.title')}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving || isDeleting}>
            {t('general.cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t('general.delete')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasEditChanges || isSaving || isDeleting}
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
      </div>
    </SidePanel>
  );
};






