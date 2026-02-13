'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';
import { LibrarySidebarProvider, useLibrarySidebar } from './library-sidebar-context';

interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  indent?: boolean;
}

type LibraryLayoutProps = {
  children: React.ReactNode;
};

const LibraryLayoutContent = ({ children }: LibraryLayoutProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const { isOpen } = useLibrarySidebar();
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSidebarHeight = () => {
      if (contentRef.current && sidebarRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        sidebarRef.current.style.minHeight = `${contentHeight}px`;
      }
    };

    updateSidebarHeight();
    const resizeObserver = new ResizeObserver(updateSidebarHeight);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  // Flat list of all navigation items
  const navItems: NavItem[] = [
    // Training section
    { id: 'training', href: '/library/training/workouts', labelKey: 'sidebar.links.training' },
    { id: 'workouts', href: '/library/training/workouts', labelKey: 'library.workouts', indent: true },
    { id: 'sections', href: '/library/training/sections', labelKey: 'library.sections.title', indent: true },
    { id: 'programs', href: '/library/training/programs', labelKey: 'library.programs', indent: true },
    { id: 'exercises', href: '/library/training/exercises', labelKey: 'library.exercises', indent: true },
    // Forms section
    { id: 'forms', href: '/library/forms/check-ins', labelKey: 'sidebar.links.forms' },
    { id: 'checkIns', href: '/library/forms/check-ins', labelKey: 'forms.tabs.checkIns', indent: true },
    { id: 'questionnaires', href: '/library/forms/questionnaires', labelKey: 'forms.tabs.questionnaires', indent: true },
    // Single items
    { id: 'metrics', href: '/library/metrics', labelKey: 'sidebar.links.metrics' },
    { id: 'habits', href: '/library/habits', labelKey: 'sidebar.links.habits' },
    { id: 'files', href: '/library/files', labelKey: 'sidebar.links.files' },
  ];

  // Check if a path is active
  const isPathActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Section headers (Training, Forms) shouldn't be highlighted as links
  const sectionHeaders = ['training', 'forms'];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Two Column Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - animated width */}
        <div
          ref={sidebarRef}
          className={cn(
            'flex flex-col border-r bg-background transition-[width] duration-200 ease-linear overflow-hidden',
            isOpen ? 'w-[14.285714%]' : 'w-0 border-r-0'
          )}
        >
          <div className="flex flex-col py-2 flex-1 min-w-[14.285714vw]">
            {/* Library Title */}
            <div className="px-4 mb-4">
              <h1 className="text-[22px] font-semibold whitespace-nowrap">{t('sidebar.links.library')}</h1>
            </div>

              <div className="flex flex-col gap-0.5 px-3">
                {navItems.map((item) => {
                  const isActive = isPathActive(item.href);
                  const isSectionHeader = sectionHeaders.includes(item.id);

                  // Section headers are not clickable
                  if (isSectionHeader) {
                    return (
                      <div
                        key={item.id}
                        className="text-left rounded-md py-2 h-9 text-sm font-semibold text-foreground/70 mt-2 first:mt-0"
                      >
                        {t(item.labelKey)}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        'text-left rounded-md p-2 h-9 text-sm transition-colors font-medium',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive && 'bg-accent text-accent-foreground',
                        !isActive && 'text-foreground',
                        item.indent && 'ml-4'
                      )}
                      aria-label={t(item.labelKey)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Right Content - remaining width */}
        <div ref={contentRef} className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};

const LibraryLayout = ({ children }: LibraryLayoutProps) => {
  return (
    <LibrarySidebarProvider>
      <LibraryLayoutContent>{children}</LibraryLayoutContent>
    </LibrarySidebarProvider>
  );
};

export default LibraryLayout;
