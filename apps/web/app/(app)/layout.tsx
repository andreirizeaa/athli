'use client';

import GlobalDataProvider from '@/providers/global-data-provider';
import { AccessProvider, AppAccessGate, EntitlementsProvider } from '@/lib/permissions';
import { AppShell } from '@/components/app/app-shell';
import { MobileDownloadOverlay } from '@/components/app/mobile-download-overlay';
import { useIsMobileWithLoading } from '@/hooks/use-mobile';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobileWithLoading();

  // Wait for client-side detection before rendering
  if (isMobile === undefined) {
    return null;
  }

  // On mobile, show download overlay instead of the app
  if (isMobile) {
    return <MobileDownloadOverlay userType="coach" />;
  }

  return (
    <GlobalDataProvider>
      <AccessProvider>
        <EntitlementsProvider>
          <AppAccessGate>
            <AppShell>{children}</AppShell>
          </AppAccessGate>
        </EntitlementsProvider>
      </AccessProvider>
    </GlobalDataProvider>
  );
}
