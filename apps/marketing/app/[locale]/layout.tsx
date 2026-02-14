import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from '@/lib/theme-provider';
import { routing } from '@/lib/i18n/routing';
import { localeMetadata } from '@/lib/i18n/locale-metadata';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Athli | Supercharge Your Fitness Coaching',
  description: 'The all-in-one platform for fitness coaches to manage clients, deliver programs, and grow their business.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();
  const meta = localeMetadata[locale] ?? localeMetadata[routing.defaultLocale];

  return (
    <html lang={meta.htmlLang} suppressHydrationWarning className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="athli-marketing-theme"
        >
          <div className="pointer-events-none fixed inset-0 z-0 opacity-40" style={{ backgroundImage: 'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <NextIntlClientProvider messages={messages}>
            <div className="relative z-10">{children}</div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
