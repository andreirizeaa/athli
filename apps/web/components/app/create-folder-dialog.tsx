'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
  title?: string;
  initialName?: string;
  isEdit?: boolean;
}

export const CreateFolderDialog = ({
  open,
  onOpenChange,
  onSave,
  title,
  initialName = '',
  isEdit = false,
}: CreateFolderDialogProps) => {
  const t = useTranslations();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  // Sync name with initialName when dialog opens
  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  const hasChanged = name.trim() !== initialName.trim();

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim());
      setName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save folder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName(initialName);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title || (isEdit ? 'Edit Folder' : 'Create Folder')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && (!isEdit || hasChanged)) {
                  handleSave();
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            {t('general.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || (isEdit && !hasChanged)}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('general.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
