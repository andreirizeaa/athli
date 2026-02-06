'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { X, Check, Loader2, Trash2 } from 'lucide-react';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';

type SidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
  /** Custom footer content. Takes precedence over structured footer props. */
  footer?: React.ReactNode;
  side?: 'left' | 'right';
  contentClassName?: string;
  onOpenAutoFocus?: (event: Event) => void;
  hideCloseButton?: boolean;
  /** Called when the save/primary action button is clicked. Providing this enables the structured footer. */
  onSave?: () => void;
  /** Text for the save button. Defaults to t('general.save'). */
  saveText?: string;
  /** Whether the save operation is in progress. Shows a spinner on the save button. */
  isSaving?: boolean;
  /** Whether the save button should be disabled (in addition to automatic disable during saving/deleting). */
  isSaveDisabled?: boolean;
  /** Called when the delete button is clicked. Providing this shows the delete button. */
  onDelete?: () => void;
  /** Text for the delete button. Defaults to t('general.delete'). */
  deleteText?: string;
  /** Whether the delete operation is in progress. Shows a spinner on the delete button. */
  isDeleting?: boolean;
  /** Called when the cancel button is clicked. Defaults to onOpenChange(false). */
  onCancel?: () => void;
  /** Text for the cancel button. Defaults to t('general.cancel'). */
  cancelText?: string;
};

export const SidePanel = ({
  open,
  onOpenChange,
  title,
  children,
  footer,
  side = 'right',
  contentClassName,
  onOpenAutoFocus,
  hideCloseButton = false,
  onSave,
  saveText,
  isSaving = false,
  isSaveDisabled = false,
  onDelete,
  deleteText,
  isDeleting = false,
  onCancel,
  cancelText,
}: SidePanelProps) => {
  const t = useTranslations();

  const handleCancel = onCancel || (() => onOpenChange(false));

  // Determine footer content: custom footer takes precedence, then structured footer, then nothing
  let footerContent: React.ReactNode = null;
  if (footer) {
    footerContent = footer;
  } else if (onSave) {
    footerContent = (
      <div className="flex w-full justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving || isDeleting}
        >
          {cancelText || t('general.cancel')}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            disabled={isSaving || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleteText || t('general.delete')}
          </Button>
        )}
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaveDisabled || isSaving || isDeleting}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {saveText || t('general.save')}
        </Button>
      </div>
    );
  }

  const hasFooter = !!footerContent;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          'w-full sm:w-[500px] sm:max-w-[500px] px-0 pb-0 flex flex-col [&>button]:hidden',
          contentClassName
        )}
        onOpenAutoFocus={onOpenAutoFocus}
        style={{
          borderTopLeftRadius: '0px',
          borderBottomLeftRadius: '0px',
        }}
      >
        <div className="px-4 pt-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          {!hideCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="size-8"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <Separator className="-mt-[3px] -mb-[2px]" />
        {children && (
          <div className={cn("flex-1 overflow-y-auto px-4 flex flex-col min-h-0", !hasFooter && "mb-2")}>{children}</div>
        )}
        {hasFooter && (
          <>
            <Separator />
            <div className="px-4 pb-4 -mt-1 [&_button]:text-[14px]">{footerContent}</div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
