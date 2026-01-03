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
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/general/utils';

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
      <AppShellWithProvider>{children}</AppShellWithProvider>
    </UnsavedChangesProvider>
  );
};

const AppShellWithProvider = ({ children }: AppShellProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const { locale, setLocale } = useLanguage();
  const [isThemeMounted, setIsThemeMounted] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const isGetStartedPage = pathname === '/get-started';

  React.useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  return (
    <SidebarProvider
      defaultOpen={false}
      className="h-svh bg-sidebar"
      style={
        {
          '--sidebar-width': '14rem',
          '--sidebar': 'color-mix(in srgb, var(--primary), var(--sidebar-mix-base) 35%)',
          '--sidebar-foreground': 'var(--primary-foreground)',
          '--sidebar-primary': 'var(--primary-foreground)',
          '--sidebar-primary-foreground': 'var(--primary)',
          '--sidebar-accent': 'color-mix(in srgb, var(--primary-foreground) 30%, transparent)',
          '--sidebar-accent-foreground': 'var(--primary-foreground)',
          '--sidebar-border': 'transparent',
          '--sidebar-ring': 'var(--primary-foreground)',
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
            setIsLoggingOut={setIsLoggingOut}
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
  const isHoverExpanded = state === 'collapsed' && isHovered;
  const shouldShowBorder = state === 'collapsed';
  const showBorder = shouldShowBorder && !isHoverExpanded;

  return (
    <SidebarInset
      className={cn(
        'flex-1 flex flex-col overflow-hidden bg-background reset-sidebar-vars border-none shadow-none',
        showBorder && 'border-l border-sidebar-border'
      )}
      style={{
        borderTopLeftRadius: '22px',
        borderBottomLeftRadius: '22px',
      }}
    >
      {children}
    </SidebarInset>
  );
};
