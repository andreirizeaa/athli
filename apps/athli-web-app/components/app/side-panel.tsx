'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';

type SidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'left' | 'right';
  contentClassName?: string;
  onOpenAutoFocus?: (event: Event) => void;
  hideCloseButton?: boolean;
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
}: SidePanelProps) => {
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
          borderTopLeftRadius: '22px',
          borderBottomLeftRadius: '22px',
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
          <div className={cn("flex-1 overflow-y-auto px-4 flex flex-col min-h-0", !footer && "mb-2")}>{children}</div>
        )}
        {footer && (
          <>
            <Separator />
            <div className="px-4 pb-4 mt-auto [&_button]:text-[14px]">{footer}</div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
