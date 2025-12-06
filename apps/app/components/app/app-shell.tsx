'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { UnsavedChangesProvider } from '@/app/settings/context/unsaved-changes-context';
import { useLanguage } from '@/lib/providers/intl-provider';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';

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
  const { locale, setLocale } = useLanguage();
  const [isThemeMounted, setIsThemeMounted] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  return (
    <SidebarProvider defaultOpen={false} className="h-svh">
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col">
        <AppHeader
          isThemeMounted={isThemeMounted}
          currentLanguage={locale}
          setCurrentLanguage={setLocale}
          setIsLoggingOut={setIsLoggingOut}
        />
        <div className="flex-1">{children}</div>
      </SidebarInset>
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
