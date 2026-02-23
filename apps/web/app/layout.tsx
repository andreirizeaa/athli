import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { IntlProvider } from '@/lib/providers/intl-provider';
import SupabaseProvider from '@/lib/providers/supabase-provider';
import { SupabaseAuthProvider } from '@/lib/providers/supabase-auth-provider';
import QueryProvider from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { IntercomProvider } from '@/components/intercom-provider';
import { ActiveThemeProvider } from '@/components/app/active-theme';
import { DEFAULT_THEME } from '@/lib/theme';
import { cn } from '@/lib/general/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RateLimitOverlay } from '@/components/app/rate-limit-overlay';
import { TopLoader } from '@/components/app/top-loader';
import Script from 'next/script';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Athli',
    template: '%s | Athli',
  },
  description: 'The all-in-one platform for fitness coaches to manage clients, deliver programs, and grow their business.',
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
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body
        suppressHydrationWarning
        className={cn(`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-x-hidden`, 'bg-background group/layout font-sans')}
        {...bodyAttributes}
      >
        <TopLoader />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <ActiveThemeProvider initialTheme={themeSettings}>
            <QueryProvider>
              <SupabaseAuthProvider>
                <IntercomProvider />
                <SupabaseProvider>
                  <IntlProvider>
                    <TooltipProvider>
                      {children}
                    </TooltipProvider>
                    <RateLimitOverlay />
                  </IntlProvider>
                </SupabaseProvider>
              </SupabaseAuthProvider>
              <Toaster position="bottom-right" />
            </QueryProvider>
          </ActiveThemeProvider>
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
