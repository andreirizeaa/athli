'use client';

import { Link } from '@/lib/i18n/navigation';
import { AthliLogo } from '@/components/athli-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { SearchBar } from '@/components/search-bar';

export function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <AthliLogo iconClassName="size-6" className="gap-1.5 text-lg" />
        </Link>

        <div className="hidden flex-1 max-w-md sm:block">
          <SearchBar variant="header" />
        </div>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
