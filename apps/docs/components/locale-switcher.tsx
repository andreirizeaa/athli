'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';
import { localeMetadata } from '@/lib/i18n/locale-metadata';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as (typeof routing.locales)[number] });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Globe className="size-4" />
        <span>{localeMetadata[locale]?.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border bg-background p-1 shadow-lg">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => handleChange(l)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${l === locale ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              <span>{localeMetadata[l]?.flag}</span>
              <span>{localeMetadata[l]?.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
