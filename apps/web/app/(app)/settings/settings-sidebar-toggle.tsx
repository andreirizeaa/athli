'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsSidebar } from './context/settings-sidebar-context';

export function SettingsSidebarToggle() {
  const { isOpen, isMobile, toggle } = useSettingsSidebar();

  const closeLabel = 'Close settings sidebar';
  const openLabel = 'Open settings sidebar';

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
          className="h-8 w-8"
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
