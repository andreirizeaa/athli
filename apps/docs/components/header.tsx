'use client';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { AthliLogo } from '@/components/athli-logo';
import { SearchBar } from '@/components/search-bar';
import { Headset } from 'lucide-react';
import { useTranslations } from 'next-intl';

declare global {
  interface Window {
    Tawk_API?: {
      maximize: () => void;
      minimize: () => void;
      hideWidget: () => void;
      showWidget: () => void;
    };
  }
}

export function Header() {
  const pathname = usePathname();
  const t = useTranslations('home');
  const isHomePage = pathname === '/';

  return (
    <>
      {/* Fixed header - logo left, help right */}
      <header className="fixed top-0 left-0 right-0 z-20 w-full border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/">
            <AthliLogo iconClassName="size-6" className="gap-1.5 text-lg" />
          </Link>
          {/* Help button - icon only on mobile, icon + text on desktop */}
          <button
            onClick={() => window.Tawk_API?.maximize()}
            aria-label="Help and support"
            className="inline-flex sm:hidden items-center justify-center h-9 px-3 rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer transition-colors"
          >
            <Headset className="size-4" />
          </button>
          <button
            onClick={() => window.Tawk_API?.maximize()}
            aria-label="Help and support"
            className="hidden sm:inline-flex items-center gap-2 h-9 px-4 py-2 rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer transition-colors"
          >
            <Headset className="size-4" />
            Help
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[52px]" />

      {/* Search section - scrolls with content, visible on non-home pages */}
      {!isHomePage && (
        <div className="border-b bg-background">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 text-center">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t('title')}
            </h2>
            <div className="mt-4">
              <SearchBar variant="hero" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
