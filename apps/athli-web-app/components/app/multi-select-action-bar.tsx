'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { useSidebar } from '@/components/ui/sidebar';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { useState } from 'react';

type MultiSelectActionBarProps = {
  selectedCount: number;
  isVisible: boolean;
  isCopyMode: boolean;
  onDelete: () => void;
  onCopy: () => void;
  onCancel: () => void;
};

export const MultiSelectActionBar = ({
  selectedCount,
  isVisible,
  isCopyMode,
  onDelete,
  onCopy,
  onCancel,
}: MultiSelectActionBarProps) => {
  const t = useTranslations();
  const { state, isMobile } = useSidebar();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Use explicit values to match sidebar constants
  const leftPosition = isMobile
    ? '0'
    : state === 'expanded'
      ? '16rem'
      : '3rem';

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="action-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-0 z-50 bg-background border-t border-border shadow-lg"
            style={{ left: leftPosition }}
          >
            <div className="relative flex items-center justify-between px-4 py-3">
              {/* Left Section */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center border border-primary text-primary rounded-full px-3 py-0.5 min-w-[2rem]">
                  <span className="text-xs font-semibold">{selectedCount}</span>
                </div>
                <span className="text-sm font-medium">
                  {selectedCount === 1 ? 'workout' : 'workouts'}
                </span>
              </div>

              {/* Center Section - Actions or Instructions */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                {isCopyMode ? (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {selectedCount === 1
                      ? t('athletes.trainingCalendar.multiSelect.clickToAddWorkout')
                      : t('athletes.trainingCalendar.multiSelect.clickToAddWorkouts')}
                  </span>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={onCopy}
                      className="gap-2"
                      aria-label={t('athletes.trainingCalendar.multiSelect.copyAria')}
                    >
                      <Copy className="size-4" />
                      <span>{t('general.copy')}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="gap-2"
                      aria-label={t('athletes.trainingCalendar.multiSelect.deleteAria')}
                    >
                      <Trash2 className="size-4" />
                      <span>{t('general.delete')}</span>
                    </Button>
                  </>
                )}
              </div>

              {/* Right Section - Cancel */}
              <div className="flex items-center justify-end z-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="gap-2"
                  aria-label={t('general.cancel')}
                >
                  <X className="size-4" />
                  <span>{t('general.cancel')}</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={async () => {
          onDelete();
          setShowDeleteDialog(false);
        }}
        count={selectedCount}
        itemType={selectedCount === 1 ? 'workout' : 'workouts'}
        variant="default"
      />
    </>
  );
};


