'use client';

import * as React from 'react';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
          'w-full sm:w-[500px] sm:max-w-[500px] px-0 pb-0 flex flex-col',
          hideCloseButton && '[&>button]:hidden',
          contentClassName
        )}
        onOpenAutoFocus={onOpenAutoFocus}
      >
        <div className="px-4 pt-3">
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <Separator />
        {children && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 flex flex-col min-h-0">{children}</div>
        )}
        {footer && <div className="px-4 py-3 mt-auto [&_button]:text-[14px]">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
};
