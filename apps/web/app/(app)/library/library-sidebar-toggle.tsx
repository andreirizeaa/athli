'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLibrarySidebar } from './library-sidebar-context';

export function LibrarySidebarToggle() {
  const { isOpen, toggle } = useLibrarySidebar();

  const closeLabel = 'Close library sidebar';
  const openLabel = 'Open library sidebar';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8"
          aria-label={isOpen ? closeLabel : openLabel}
        >
          {isOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isOpen ? closeLabel : openLabel}
      </TooltipContent>
    </Tooltip>
  );
}
