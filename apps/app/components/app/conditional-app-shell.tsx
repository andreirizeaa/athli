'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './app-shell';

type ConditionalAppShellProps = {
  children: React.ReactNode;
};

export const ConditionalAppShell = ({ children }: ConditionalAppShellProps) => {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
};

