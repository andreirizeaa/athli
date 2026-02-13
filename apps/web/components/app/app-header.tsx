'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Clock, Headset, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAIPanel } from '@/lib/providers/ai-panel-provider';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { SearchComponent } from './search';
import { UserMenu } from './user-menu';
import { NotificationSidePanel } from './notification-side-panel';
import { useCoachNotifications } from '@/hooks/use-coach-notifications';
import { useAccess } from '@/lib/permissions';

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
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { toggle: toggleAIPanel } = useAIPanel();
  const [aiAnimationData, setAiAnimationData] = useState<object | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { unreadCount } = useCoachNotifications();
  const { status, trialDaysRemaining } = useAccess();

  const isOnTrial = status === 'trial';
  const isAssistantPage = pathname?.startsWith('/assistant');

  // Load AI sphere animation
  useEffect(() => {
    const controller = new AbortController();
    fetch('/animations/ai-sphere-animation.json', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!controller.signal.aborted) {
          setAiAnimationData(data);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load AI animation:', err);
        }
      });
    return () => controller.abort();
  }, []);

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
                onClick={toggleSidebar}
                aria-label={
                  state === 'expanded'
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
              {state === 'expanded'
                ? t('sidebar.actions.closeSidebar')
                : t('sidebar.actions.openSidebar')}
            </TooltipContent>
          </Tooltip>
          <SearchComponent />
        </div>
        <div className="flex items-center gap-2">
          {isOnTrial && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings/billing"
                  className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <Clock className="size-3.5" />
                  <span>
                    {trialDaysRemaining === 1
                      ? t('trial.daysLeft.one', { defaultValue: '1 day left' })
                      : t('trial.daysLeft.other', { count: trialDaysRemaining, defaultValue: `${trialDaysRemaining} days left` })}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                {t('trial.viewPlanDetails', { defaultValue: 'View plan details' })}
              </TooltipContent>
            </Tooltip>
          )}
          {status === 'expired' && (
            <Button asChild variant="default" size="sm">
              <Link href="/settings/billing">
                {t('trial.upgrade', { defaultValue: 'Upgrade' })}
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            aria-label={t('sidebar.helpAndSupport.label') || 'Help and support'}
          >
            <Headset className="size-4" />
            {t('general.help')}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(true)}
                aria-label={t('notifications.title')}
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-destructive" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('notifications.title')}</TooltipContent>
          </Tooltip>
          <Button
            className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
            aria-label="Lyra"
            onClick={() => !isAssistantPage && toggleAIPanel()}
          >
            {aiAnimationData && (
              <Lottie
                className="size-10 -ml-4 -mr-2"
                animationData={aiAnimationData}
                loop
                autoplay
              />
            )}
            Lyra
          </Button>
          <UserMenu
            isThemeMounted={isThemeMounted}
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
          />
        </div>
      </div>
      <NotificationSidePanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
    </div>
  );
}
