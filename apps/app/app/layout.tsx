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
import { headers } from 'next/headers';
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
  // Check if we have the redirect flag from www (set by middleware)
  const headersList = await headers();
  const isFromWww = headersList.get('x-from-www-redirect') === 'true';
  
  // Try to get userId with retries to handle session propagation delays
  let userId = null;
  // If coming from www, wait longer and retry more times
  const maxRetries = isFromWww ? 5 : 3;
  const waitTime = isFromWww ? 2000 : 1000; // 2 seconds if from www
  
  let retries = maxRetries;
  
  console.log('Layout auth check - isFromWww:', isFromWww, 'maxRetries:', maxRetries);
  
  while (retries > 0 && !userId) {
    const authResult = await auth();
    userId = authResult.userId;
    
    console.log(`Auth check attempt ${maxRetries - retries + 1}/${maxRetries}, userId:`, userId ? 'found' : 'not found');
    
    if (!userId && retries > 1) {
      // Wait longer for session to propagate, especially if coming from www
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    retries--;
  }

  if (!userId) {
    // Only redirect back to www if we've exhausted retries
    // This gives the session time to propagate
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000';
    console.warn('No userId found after retries, redirecting to www');
    redirect(wwwUrl);
  }
  
  console.log('Auth successful, userId found');

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
