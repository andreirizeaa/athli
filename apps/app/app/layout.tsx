import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';
import { ThemeProvider } from '@/lib/theme-provider';
import { IntlProvider } from '@/lib/intl-provider';
import SupabaseProvider from '@/lib/supabase-provider';
import { Toaster } from '@/components/ui/sonner';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { IntercomProvider } from '@/components/intercom-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'OneNinety - App',
  description: 'OneNinety application',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  if (!userId) {
    const wwwUrl =
      process.env.NODE_ENV === 'production' ? 'https://oneninety.com' : 'http://localhost:3000';
    redirect(wwwUrl);
  }

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            appearance={{
              theme: shadcn,
            }}
          >
            <IntercomProvider />
            <SupabaseProvider>
              <IntlProvider>
                <AppShell>{children}</AppShell>
              </IntlProvider>
            </SupabaseProvider>
          </ClerkProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
