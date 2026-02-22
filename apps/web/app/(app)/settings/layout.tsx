'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/general/utils';
import { Search, LogOut, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from './context/unsaved-changes-context';
import { DiscardChangesDialog } from '@/components/app/discard-changes-dialog';
import { useLogout } from '@/lib/providers/logout-provider';
import { SettingsSidebarProvider, useSettingsSidebar } from './context/settings-sidebar-context';
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
  isSectionHeader?: boolean;
  indent?: boolean;
}

type SettingsLayoutProps = {
  children: React.ReactNode;
};

// Flat list of all navigation items
const navItems: NavItem[] = [
  // Account section
  { id: 'account', href: '/settings/account/profile', labelKey: 'settings.sections.account', isSectionHeader: true },
  { id: 'accountProfile', href: '/settings/account/profile', labelKey: 'settings.sections.accountProfile', indent: true },
  { id: 'accountSecurity', href: '/settings/account/security', labelKey: 'settings.sections.accountSecurity', indent: true },
  { id: 'accountInformation', href: '/settings/account/information', labelKey: 'settings.sections.accountInformation', indent: true },
  { id: 'accountDanger', href: '/settings/account/danger', labelKey: 'settings.sections.accountDanger', indent: true },
  // Notifications
  { id: 'notifications', href: '/settings/profile/notifications', labelKey: 'settings.sections.notifications' },
  // Billing
  { id: 'billing', href: '/settings/billing', labelKey: 'settings.sections.billing' },
  // Customisations
  { id: 'customisations', href: '/settings/app/customisations', labelKey: 'settings.sections.customisations' },
  // Company section
  { id: 'company', href: '/settings/business/company/information', labelKey: 'settings.sections.company', isSectionHeader: true },
  { id: 'companyInformation', href: '/settings/business/company/information', labelKey: 'settings.sections.companyInformation', indent: true },
  { id: 'companyBranding', href: '/settings/business/company/branding', labelKey: 'settings.sections.companyBranding', indent: true },
  { id: 'companyTeam', href: '/settings/business/company/team', labelKey: 'settings.sections.companyTeam', indent: true },
];

// Sidebar content component
const SettingsSidebarContent = ({
  searchQuery,
  setSearchQuery,
  onLinkClick,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) => {
  const t = useTranslations();
  const pathname = usePathname();
  const { triggerLogout } = useLogout();

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return navItems;
    }

    return navItems.filter((item) => {
      const itemName = t(item.labelKey).toLowerCase();
      return itemName.includes(query);
    });
  }, [searchQuery, t]);

  const isPathActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="flex flex-col py-2 flex-1">
      {/* Settings Title */}
      <div className="px-4 mb-4">
        <h1 className="text-[22px] font-semibold">{t('settings.title')}</h1>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="search"
            placeholder={t('common.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-3">
        {(() => {
          const elements: React.ReactNode[] = [];
          let i = 0;

          while (i < filteredItems.length) {
            const item = filteredItems[i];

            if (item.isSectionHeader) {
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
              while (i < filteredItems.length && filteredItems[i].indent) {
                indentedItems.push(filteredItems[i]);
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
                          onClick={(e) => onLinkClick(e, indentedItem.href)}
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
                  onClick={(e) => onLinkClick(e, item.href)}
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

      {/* Logout Button */}
      <div className="mt-auto px-2 py-2 border-t">
        <button
          type="button"
          onClick={triggerLogout}
          className={cn(
            'w-full text-left rounded-md p-2 h-9 text-sm transition-colors font-medium flex items-center gap-2',
            'hover:bg-destructive/10 hover:text-destructive',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'text-destructive'
          )}
        >
          <LogOut className="size-4" />
          {t('sidebar.profile.logOut')}
        </button>
      </div>
    </div>
  );
};

const SettingsLayoutContent = ({ children }: SettingsLayoutProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const { isMobile, isMobileOpen, setMobileOpen } = useSettingsSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
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

  // Set browser tab title based on current settings page
  useEffect(() => {
    const pathTitles: Record<string, string> = {
      '/settings/account/profile': 'Settings | Profile',
      '/settings/account/security': 'Settings | Security',
      '/settings/account/information': 'Settings | Information',
      '/settings/account/danger': 'Settings | Danger',
      '/settings/profile/notifications': 'Settings | Notifications',
      '/settings/billing': 'Settings | Billing',
      '/settings/billing/update': 'Upgrade Plan',
      '/settings/app/customisations': 'Settings | Customisations',
      '/settings/business/company/information': 'Settings | Company Information',
      '/settings/business/company/branding': 'Settings | Branding',
      '/settings/business/company/team': 'Settings | Team',
    };
    const title = pathTitles[pathname] || 'Settings';
    document.title = `${title} | Athli`;
  }, [pathname]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges && pathname !== href) {
      e.preventDefault();
      setPendingNavigation(href);
      setIsDiscardDialogOpen(true);
    } else if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
      if (isMobile) {
        setMobileOpen(false);
      }
    }
  };

  const handleCancelDiscard = () => {
    setIsDiscardDialogOpen(false);
    setPendingNavigation(null);
  };

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
              <SheetTitle>{t('settings.title')}</SheetTitle>
              <SheetDescription>{t('common.settingsNavigation')}</SheetDescription>
            </SheetHeader>
            <SettingsSidebarContent
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onLinkClick={handleLinkClick}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Two Column Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - hidden on mobile */}
        {!isMobile && (
          <div ref={sidebarRef} className="w-[240px] flex flex-col border-r bg-background">
            <SettingsSidebarContent
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onLinkClick={handleLinkClick}
            />
          </div>
        )}

        {/* Right Content - full width on mobile, 6/7 on desktop */}
        <div ref={contentRef} className="flex-1 flex flex-col">
          {/* Mobile header with toggle */}
          {isMobile && (
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="h-8 w-8"
                aria-label="Open settings menu"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
            </div>
          )}
          {children}
        </div>
      </div>
      <DiscardChangesDialog
        open={isDiscardDialogOpen}
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  return (
    <SettingsSidebarProvider>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </SettingsSidebarProvider>
  );
};

export default SettingsLayout;
