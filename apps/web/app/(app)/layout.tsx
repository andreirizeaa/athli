import GlobalDataProvider from '@/providers/global-data-provider';
import { AccessProvider, AppAccessGate, EntitlementsProvider } from '@/lib/permissions';
import { AppShell } from '@/components/app/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
