import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { IntlProvider } from '@/lib/providers/intl-provider';
import SupabaseProvider from '@/lib/providers/supabase-provider';
import { SupabaseAuthProvider } from '@/lib/providers/supabase-auth-provider';
import QueryProvider from '@/providers/query-provider';
import GlobalDataProvider from '@/providers/global-data-provider';
import { Toaster } from '@/components/ui/sonner';
import { ConditionalAppShell } from '@/components/app/conditional-app-shell';
import { IntercomProvider } from '@/components/intercom-provider';
import { ActiveThemeProvider } from '@/components/app/active-theme';
import { DEFAULT_THEME } from '@/lib/theme';
import { cn } from '@/lib/general/utils';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Athli - App',
  description: 'Athli application',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeSettings = {
    preset: (cookieStore.get('theme_preset')?.value ?? DEFAULT_THEME.preset) as any,
    scale: (cookieStore.get('theme_scale')?.value ?? DEFAULT_THEME.scale) as any,
    radius: (cookieStore.get('theme_radius')?.value ?? DEFAULT_THEME.radius) as any,
    contentLayout: (cookieStore.get('theme_content_layout')?.value ??
      DEFAULT_THEME.contentLayout) as any,
  };

  const bodyAttributes = Object.fromEntries(
    Object.entries(themeSettings)
      .filter(([_, value]) => value)
      .map(([key, value]) => [`data-theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value])
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`, 'bg-background group/layout font-sans')}
        {...bodyAttributes}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ActiveThemeProvider initialTheme={themeSettings}>
            <QueryProvider>
              <SupabaseAuthProvider>
                <IntercomProvider />
                <SupabaseProvider>
                  <IntlProvider>
                    <GlobalDataProvider>
                      <ConditionalAppShell>{children}</ConditionalAppShell>
                    </GlobalDataProvider>
                  </IntlProvider>
                </SupabaseProvider>
              </SupabaseAuthProvider>
              <Toaster position="bottom-right" />
            </QueryProvider>
          </ActiveThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
