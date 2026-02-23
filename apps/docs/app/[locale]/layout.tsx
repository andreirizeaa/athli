import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from '@/lib/theme-provider';
import { routing } from '@/lib/i18n/routing';
import { localeMetadata } from '@/lib/i18n/locale-metadata';
import Script from 'next/script';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
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
          storageKey="athli-docs-theme"
        >
          {/* Grid background */}
          <div
            className="pointer-events-none fixed inset-0 z-0 opacity-40"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <NextIntlClientProvider messages={messages}>
            <div className="relative z-10 flex min-h-full flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
        <Script id="tawk-to" strategy="lazyOnload">{`
          var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
          Tawk_API.onBeforeLoad = function(){ Tawk_API.hideWidget(); };
          Tawk_API.onChatMinimized = function(){ Tawk_API.hideWidget(); };
          Tawk_API.onChatMaximized = function(){
            document.addEventListener('click', function dismissTawk(e){
              if(!e.target.closest('iframe[src*="tawk"]')){
                Tawk_API.minimize();
                document.removeEventListener('click', dismissTawk);
              }
            });
          };
          (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/699cd9ad9f81c11c340d9f77/1ji6b4jm3';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
          })();
        `}</Script>
      </body>
    </html>
  );
}
