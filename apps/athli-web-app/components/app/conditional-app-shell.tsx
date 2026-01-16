'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './app-shell';

type ConditionalAppShellProps = {
  children: React.ReactNode;
};

export const ConditionalAppShell = ({ children }: ConditionalAppShellProps) => {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth/');
  const isErrorRoute = pathname?.startsWith('/pages/error');
  const isClientRoute = pathname?.startsWith('/client/');
  const isCoachReferralRoute = pathname?.startsWith('/coach/referral/');
  const isDownloadRoute = pathname?.startsWith('/download/');

  if (isAuthRoute || isErrorRoute || isClientRoute || isCoachReferralRoute || isDownloadRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
};

