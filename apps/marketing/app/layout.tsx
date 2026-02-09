import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-provider';
import { IntlProvider } from '@/lib/intl-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Athli - Marketing Site',
  description: 'Athli marketing and documentation site',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="athli-marketing-theme"
        >
          <div className="pointer-events-none fixed inset-0 z-0 opacity-40" style={{ backgroundImage: 'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <IntlProvider><div className="relative z-10">{children}</div></IntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
