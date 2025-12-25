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

  if (isAuthRoute || isErrorRoute || isClientRoute || isCoachReferralRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
};

