'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';
import { LibrarySidebarProvider, useLibrarySidebar } from './library-sidebar-context';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  indent?: boolean;
}

type LibraryLayoutProps = {
  children: React.ReactNode;
};

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
  // Nutrition section
  { id: 'nutrition', href: '/library/nutrition/recipes', labelKey: 'sidebar.links.nutrition' },
  { id: 'recipes', href: '/library/nutrition/recipes', labelKey: 'nutrition.tabs.recipes', indent: true },
  { id: 'recipeBooks', href: '/library/nutrition/recipe-books', labelKey: 'nutrition.tabs.recipeBooks', indent: true },
  { id: 'ingredients', href: '/library/nutrition/ingredients', labelKey: 'nutrition.tabs.ingredients', indent: true },
];

// Section headers (Training, Nutrition, Forms) shouldn't be highlighted as links
const sectionHeaders = ['training', 'nutrition', 'forms'];

// Sidebar content component to avoid duplication
const LibrarySidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const t = useTranslations();
  const pathname = usePathname();

  const isPathActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="flex flex-col py-2 flex-1">
      {/* Library Title */}
      <div className="px-4 mb-4">
        <h1 className="text-[22px] font-semibold whitespace-nowrap">{t('sidebar.links.library')}</h1>
      </div>

      <div className="flex flex-col gap-0.5 px-3">
        {(() => {
          const elements: React.ReactNode[] = [];
          let i = 0;

          while (i < navItems.length) {
            const item = navItems[i];
            const isSectionHeader = sectionHeaders.includes(item.id);

            if (isSectionHeader) {
              // Render section header
              elements.push(
                <div
                  key={item.id}
                  className="text-left rounded-md p-2 h-9 text-sm font-medium text-foreground"
                >
                  {t(item.labelKey)}
                </div>
              );
              i++;

              // Collect all indented items following this header
              const indentedItems: NavItem[] = [];
              while (i < navItems.length && navItems[i].indent) {
                indentedItems.push(navItems[i]);
                i++;
              }

              // Render indented items with left border
              if (indentedItems.length > 0) {
                elements.push(
                  <div key={`${item.id}-group`} className="ml-2.5 border-l border-border pl-1.5">
                    {indentedItems.map((indentedItem) => {
                      const isActive = isPathActive(indentedItem.href);
                      return (
                        <Link
                          key={indentedItem.id}
                          href={indentedItem.href}
                          onClick={onLinkClick}
                          className={cn(
                            'text-left rounded-md p-2 h-9 text-sm transition-colors font-medium block',
                            'hover:bg-accent hover:text-accent-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive && 'bg-accent text-accent-foreground',
                            !isActive && 'text-foreground'
                          )}
                          aria-label={t(indentedItem.labelKey)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {t(indentedItem.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                );
              }
            } else {
              // Regular top-level item
              const isActive = isPathActive(item.href);
              elements.push(
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onLinkClick}
                  className={cn(
                    'text-left rounded-md p-2 h-9 text-sm transition-colors font-medium',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && 'bg-accent text-accent-foreground',
                    !isActive && 'text-foreground'
                  )}
                  aria-label={t(item.labelKey)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(item.labelKey)}
                </Link>
              );
              i++;
            }
          }

          return elements;
        })()}
      </div>
    </div>
  );
};

const LibraryLayoutContent = ({ children }: LibraryLayoutProps) => {
  const t = useTranslations();
  const { isOpen, isMobile, isMobileOpen, setMobileOpen } = useLibrarySidebar();
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

  return (
    <div className="h-full w-full flex flex-col">
      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 [&>button]:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t('sidebar.links.library')}</SheetTitle>
              <SheetDescription>Library navigation</SheetDescription>
            </SheetHeader>
            <LibrarySidebarContent onLinkClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Two Column Layout */}
      <div className={cn("flex flex-1 min-h-0", !isMobile && "overflow-hidden")}>
        {/* Left Sidebar - hidden on mobile, animated width on desktop */}
        {!isMobile && (
          <div
            ref={sidebarRef}
            className={cn(
              'flex flex-col border-r bg-background transition-[width] duration-200 ease-linear overflow-hidden flex-shrink-0',
              isOpen ? 'w-[240px]' : 'w-0 border-r-0'
            )}
          >
            <div className="min-w-[240px]">
              <LibrarySidebarContent />
            </div>
          </div>
        )}

        {/* Right Content - remaining width */}
        <div ref={contentRef} className={cn("flex-1 flex flex-col", !isMobile && "min-h-0 min-w-0")}>
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
