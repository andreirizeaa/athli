import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { IntlProvider } from '@/lib/providers/intl-provider';
import SupabaseProvider from '@/lib/providers/supabase-provider';
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
  // Try to get userId with retries to handle session propagation delays
  let userId = null;
  let retries = 3; // Increased retries
  
  while (retries > 0 && !userId) {
    const authResult = await auth();
    userId = authResult.userId;
    
    if (!userId && retries > 1) {
      // Wait longer for session to propagate in production
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    retries--;
  }

  if (!userId) {
    // Only redirect back to www if we've exhausted retries
    // This gives the session time to propagate
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000';
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
