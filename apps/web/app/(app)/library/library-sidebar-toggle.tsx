'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLibrarySidebar } from './library-sidebar-context';
import { cn } from '@/lib/general/utils';

export function LibrarySidebarToggle() {
  const { isOpen, isMobile, toggle } = useLibrarySidebar();

  const closeLabel = 'Close library sidebar';
  const openLabel = 'Open library sidebar';

  // On mobile, sidebar is always "closed" (shown via sheet), so show open icon
  const showOpenIcon = isMobile || !isOpen;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          className={cn("h-8 w-8", isMobile && "-ml-[5px]")}
          aria-label={showOpenIcon ? openLabel : closeLabel}
        >
          {showOpenIcon ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {showOpenIcon ? openLabel : closeLabel}
      </TooltipContent>
    </Tooltip>
  );
}
