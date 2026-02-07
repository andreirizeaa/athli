'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface ConfirmPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isPublishing: boolean;
  itemName?: string;
}

export const ConfirmPublishDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPublishing,
  itemName,
}: ConfirmPublishDialogProps) => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const title = isPublishing
    ? `Publish ${itemName || ''}?`.trim()
    : `Unpublish ${itemName || ''}?`.trim();

  const description = isPublishing
    ? 'Are you sure you want to publish this? It will become active for your clients.'
    : 'Are you sure you want to unpublish this? Any clients currently in this flow will be removed from it.';

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !isLoading && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('general.cancel')}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading}
            className="gap-2 relative"
          >
            <span className={isLoading ? 'invisible' : ''}>
              {isPublishing ? t('onboarding.publish') : t('onboarding.unpublish')}
            </span>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-4" />
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
