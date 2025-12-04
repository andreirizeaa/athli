import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { IntlProvider } from '@/lib/providers/intl-provider';
import SupabaseProvider from '@/lib/providers/supabase-provider';
import { Toaster } from '@/components/ui/sonner';
import { ConditionalAppShell } from '@/components/app/conditional-app-shell';
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
              elements: {
                rootBox: 'bg-transparent',
                card: 'bg-transparent shadow-none',
                cardBox: 'bg-transparent',
                main: 'bg-transparent',
              },
            }}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInForceRedirectUrl="/home"
            signUpForceRedirectUrl="/home"
          >
            <IntercomProvider />
            <SupabaseProvider>
              <IntlProvider>
                <ConditionalAppShell>{children}</ConditionalAppShell>
              </IntlProvider>
            </SupabaseProvider>
          </ClerkProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
