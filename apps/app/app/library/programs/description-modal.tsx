'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type DescriptionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  programName: string;
};

const DescriptionModal = ({
  open,
  onOpenChange,
  description,
  programName,
}: DescriptionModalProps) => {
  const t = useTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('programs.descriptionModal.title', { name: programName })}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DescriptionModal;
