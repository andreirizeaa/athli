'use client';

import GlobalDataProvider from '@/providers/global-data-provider';
import { AppShell } from '@/components/app/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalDataProvider>
      <AppShell>{children}</AppShell>
    </GlobalDataProvider>
  );
}
