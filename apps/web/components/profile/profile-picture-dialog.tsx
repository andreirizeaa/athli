'use client';

import { useTranslations } from 'next-intl';
import { ImageCropDialog } from '@/components/app/image-crop-dialog';

interface ProfilePictureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (file: File) => Promise<void>;
}

export function ProfilePictureDialog({
  open,
  onOpenChange,
  onSave,
}: ProfilePictureDialogProps) {
  const t = useTranslations('settings.profile.profilePictureDialog');

  return (
    <ImageCropDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      title={t('title')}
      description={t('description')}
    />
  );
}
