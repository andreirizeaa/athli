'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { UnsavedChangesProvider } from '@/app/settings/context/unsaved-changes-context';
import { useLanguage } from '@/lib/providers/intl-provider';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { AIAssistantPanel } from './ai-assistant-panel';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/general/utils';
import { LogoutProvider, useLogout } from '@/lib/providers/logout-provider';
import { useGlobalData } from '@/providers/global-data-provider';
import { useThemeConfig } from '@/components/app/active-theme';
import { PresetValue } from '@/lib/theme';
import { AIPanelProvider, useAIPanel } from '@/lib/providers/ai-panel-provider';

// Re-export types for backward compatibility
export type {
  Contact,
  Message,
  Athlete,
  Workout,
  Program,
  Exercise,
} from './types';

// Re-export mock data for backward compatibility
export {
  mockAthletes,
  mockContacts,
  mockWorkouts,
  mockPrograms,
  mockExercises,
  mockMessages,
} from './mock-data';

type AppShellProps = {
  children: ReactNode;
};

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <UnsavedChangesProvider>
      <LogoutProvider>
        <AIPanelProvider>
          <AppShellWithProvider>{children}</AppShellWithProvider>
        </AIPanelProvider>
      </LogoutProvider>
    </UnsavedChangesProvider>
  );
};

const AppShellWithProvider = ({ children }: AppShellProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const { locale, setLocale } = useLanguage();
  const [isThemeMounted, setIsThemeMounted] = React.useState(false);
  const { isLoggingOut } = useLogout();
  const { preferences } = useGlobalData();
  const { theme: themeConfig, setTheme: setThemeConfig } = useThemeConfig();

  const isGetStartedPage = pathname === '/get-started';

  React.useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  // Sync color preset from API preferences to theme
  React.useEffect(() => {
    if (preferences?.color_preset && preferences.color_preset !== themeConfig.preset) {
      setThemeConfig({ ...themeConfig, preset: preferences.color_preset as PresetValue });
    }
  }, [preferences?.color_preset]);

  return (
    <SidebarProvider
      defaultOpen={false}
      className="h-svh bg-sidebar"
      style={
        {
          '--sidebar-width': '14rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInsetWithBorder>
        {!isGetStartedPage && (
          <AppHeader
            isThemeMounted={isThemeMounted}
            currentLanguage={locale}
            setCurrentLanguage={setLocale}
          />
        )}
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      </SidebarInsetWithBorder>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">{t('sidebar.logout.loggingOut')}</p>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
};

const SidebarInsetWithBorder = ({ children }: { children: ReactNode }) => {
  const { state, isHovered } = useSidebar();
  const { isOpen: isAIPanelOpen } = useAIPanel();
  const isHoverExpanded = state === 'collapsed' && isHovered;
  const shouldShowBorder = state === 'collapsed';
  const showBorder = shouldShowBorder && !isHoverExpanded;

  return (
    <SidebarInset
      className={cn(
        'flex-1 flex flex-row overflow-hidden bg-background reset-sidebar-vars border-none shadow-none',
        showBorder && 'border-l border-sidebar-border'
      )}
      style={{
        borderTopLeftRadius: '22px',
        borderBottomLeftRadius: '22px',
      }}
    >
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </div>
      <AIAssistantPanel isOpen={isAIPanelOpen} />
    </SidebarInset>
  );
};
