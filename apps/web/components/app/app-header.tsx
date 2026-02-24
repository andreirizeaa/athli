'use client';

declare global {
  interface Window {
    Tawk_API?: {
      maximize: () => void;
      minimize: () => void;
      hideWidget: () => void;
      showWidget: () => void;
    };
  }
}

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Clock, Headset, Menu, PanelLeftClose, PanelLeftOpen, WandSparkles } from 'lucide-react';
import { useAIPanel } from '@/lib/providers/ai-panel-provider';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSidebar } from '@/components/ui/sidebar';
import { SearchComponent } from './search';
import { UserMenu } from './user-menu';
import { SeedDataButton } from './seed-data-button';
import { NotificationSidePanel } from './notification-side-panel';
import { useCoachNotifications } from '@/hooks/use-coach-notifications';
import { useAccess } from '@/lib/permissions';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [appStoreDialog, setAppStoreDialog] = useState<'ios' | 'android' | null>(null);

  const { unreadCount } = useCoachNotifications();
  const { status, trialDaysRemaining } = useAccess();

  const isMobile = useIsMobile();
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
    <div className="flex flex-col gap-2 p-2 border-b flex-shrink-0 bg-background sticky top-0 z-30">
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
                {isMobile ? (
                  <Menu className="-ml-4 h-4 w-4" />
                ) : state === 'expanded' ? (
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
          {/* App store icons - mobile only */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAppStoreDialog('ios')}
              aria-label="Download iOS app"
            >
              <img
                src="/icons/apple.png"
                alt="Apple"
                className="size-4 dark:invert"
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAppStoreDialog('android')}
              aria-label="Download Android app"
            >
              <img
                src="/icons/play-store.png"
                alt="Google Play"
                className="size-4"
              />
            </Button>
          </div>
          {/* Trial badge - hidden on mobile */}
          {isOnTrial && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings/billing"
                  className="hidden md:flex items-center gap-1.5 rounded-md bg-[#d4a853] h-9 px-3 text-sm font-medium text-white hover:bg-[#c99b45] shadow-[0_0_12px_rgba(212,168,83,0.7)] transition-colors cursor-pointer"
                >
                  <Clock className="size-3.5" />
                  <span>
                    {trialDaysRemaining === 1
                      ? t('trial.daysLeft.one', { defaultValue: '1 day left' })
                      : t('trial.daysLeft.other', { count: trialDaysRemaining, defaultValue: `${trialDaysRemaining} days left` })}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-left">
                <p>
                  {trialDaysRemaining === 1
                    ? t('trial.tooltipExpiringOne')
                    : t('trial.tooltipExpiring', { count: trialDaysRemaining })}
                </p>
                <p>
                  {t('trial.tooltipClickToView')}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Upgrade button - hidden on mobile */}
          {status === 'expired' && (
            <Button asChild variant="default" size="sm" className="hidden md:inline-flex">
              <Link href="/settings/billing">
                {t('trial.upgrade', { defaultValue: 'Upgrade' })}
              </Link>
            </Button>
          )}
          {/* Help button - icon only on mobile, icon + text on desktop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label={t('sidebar.helpAndSupport.label') || 'Help and support'}
                onClick={() => { window.Tawk_API?.maximize(); }}
              >
                <Headset className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('general.help')}</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            className="hidden md:inline-flex gap-2"
            aria-label={t('sidebar.helpAndSupport.label') || 'Help and support'}
            onClick={() => { window.Tawk_API?.maximize(); }}
          >
            <Headset className="size-4" />
            {t('general.help')}
          </Button>
          {/* Notifications */}
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
          {/* Lyra AI button - icon only on mobile, full on desktop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="md:hidden !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
                aria-label="Lyra"
                onClick={() => !isAssistantPage && toggleAIPanel()}
              >
                {aiAnimationData ? (
                  <Lottie
                    className="size-8"
                    animationData={aiAnimationData}
                    loop
                    autoplay
                  />
                ) : (
                  <WandSparkles className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lyra</TooltipContent>
          </Tooltip>
          <Button
            className="hidden md:inline-flex gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
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
          <SeedDataButton />
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

      {/* App Store Download Dialog */}
      <Dialog open={appStoreDialog !== null} onOpenChange={(open) => !open && setAppStoreDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>
              {appStoreDialog === 'ios' ? 'Download our iOS app' : 'Download our Android app'}
            </DialogTitle>
            <DialogDescription className="pt-2">
              Experience everything you can do on the web in a more tailored mobile environment.
              Our native app provides a seamless coaching experience optimized for your device.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full pt-4">
            {appStoreDialog === 'ios' ? (
              <button
                onClick={() => {}}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-black px-4 py-3"
                aria-label="Download on the App Store"
              >
                <img
                  src="/icons/apple.png"
                  alt="Apple"
                  className="size-8 invert"
                />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-white/80 uppercase tracking-wide">Download on the</span>
                  <span className="text-base font-medium text-white -mt-0.5">App Store</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {}}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-black px-4 py-3"
                aria-label="Get it on Google Play"
              >
                <img
                  src="/icons/play-store.png"
                  alt="Google Play"
                  className="size-8"
                />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-white/80 uppercase tracking-wide">Get it on</span>
                  <span className="text-base font-medium text-white -mt-0.5">Google Play</span>
                </div>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
