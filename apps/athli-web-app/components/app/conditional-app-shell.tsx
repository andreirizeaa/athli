'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './app-shell';

type ConditionalAppShellProps = {
  children: React.ReactNode;
};

export const ConditionalAppShell = ({ children }: ConditionalAppShellProps) => {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  const isErrorRoute = pathname?.startsWith('/pages/error');

  if (isAuthRoute || isErrorRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
};

