'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Gift, Headset, Lightbulb, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { SearchComponent } from './search';
import { UserMenu } from './user-menu';

type AppHeaderProps = {
  isThemeMounted: boolean;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export function AppHeader({
  isThemeMounted,
  currentLanguage,
  setCurrentLanguage,
}: AppHeaderProps) {
  const t = useTranslations();
  const [isAiAssistantPopoverOpen, setIsAiAssistantPopoverOpen] = React.useState(false);
  const { state, isHovered, setOpen, setIsHovered, setJustClosed } = useSidebar();

  const isHoverExpanded = state === 'collapsed' && isHovered;

  const handlePinMenu = () => {
    setOpen(true);
    setJustClosed(false);
  };

  const handleUnpinMenu = () => {
    setIsHovered(false);
    setJustClosed(true);
    setOpen(false);
    // Reset the justClosed flag after a short delay to allow hover to work again
    setTimeout(() => {
      setJustClosed(false);
    }, 300);
  };

  const handleToggleSidebar = () => {
    if (isHoverExpanded) {
      handlePinMenu();
    } else if (state === 'expanded') {
      handleUnpinMenu();
    } else {
      // Collapsed but not hovered - expand it
      setOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border-b flex-shrink-0 bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between gap-2 px-2 py-0.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleToggleSidebar}
                aria-label={
                  isHoverExpanded
                    ? t('sidebar.actions.keepMenuOpenAria')
                    : state === 'expanded'
                      ? t('sidebar.actions.closeSidebarAria')
                      : t('sidebar.actions.openSidebarAria')
                }
              >
                {state === 'expanded' ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isHoverExpanded
                ? t('sidebar.actions.keepMenuOpen')
                : state === 'expanded'
                  ? t('sidebar.actions.closeSidebar')
                  : t('sidebar.actions.openSidebar')}
            </TooltipContent>
          </Tooltip>
          <SearchComponent />
        </div>
        <div className="flex items-center gap-2">
          <Popover open={isAiAssistantPopoverOpen} onOpenChange={setIsAiAssistantPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
                aria-label={t('sidebar.search.aiAssistantAria')}
              >
                <Sparkles className="size-4" />
                {t('sidebar.search.aiAssistant')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end" sideOffset={8}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-foreground">
                  {t('sidebar.search.aiAssistantComingSoon')}
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                asChild
                aria-label={t('sidebar.links.referAndEarn')}
              >
                <Link href="/refer-and-earn">
                  <Gift className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('sidebar.links.referAndEarn')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={t('sidebar.helpAndSupport.label') || 'Help and support'}
              >
                <Headset className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('sidebar.helpAndSupport.label') || 'Help and support'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                asChild
                aria-label={t('sidebar.featureRequests.label') || 'Feature Requests'}
              >
                <Link href="/features">
                  <Lightbulb className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('sidebar.featureRequests.label') || 'Feature Requests'}
            </TooltipContent>
          </Tooltip>
          <UserMenu
            isThemeMounted={isThemeMounted}
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
          />
        </div>
      </div>
    </div>
  );
}

