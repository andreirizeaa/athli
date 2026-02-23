'use client';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { AthliLogo } from '@/components/athli-logo';
import { SearchBar } from '@/components/search-bar';
import { useTranslations } from 'next-intl';

export function Header() {
  const pathname = usePathname();
  const t = useTranslations('home');
  const isHomePage = pathname === '/';

  return (
    <>
      {/* Fixed header - only the logo bar */}
      <header className="fixed top-0 left-0 right-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3 sm:px-6">
          <Link href="/">
            <AthliLogo iconClassName="size-6" className="gap-1.5 text-lg" />
          </Link>
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
