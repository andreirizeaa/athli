'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  // CalendarDays,
  Dumbbell,
  File,
  Home,
  MessageCircle,
  Settings,
  UserPlus,
  Users,
  CheckSquare,
  Sprout,
  ClipboardList,
  Workflow,
  ClipboardCheck,
  BarChart3,
  Rocket,
  Gift,
} from 'lucide-react';
import { LogoIcon } from '@/components/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const { state, isHovered } = useSidebar();

  const isCollapsed = state === 'collapsed' && !isHovered;
  const isHoverExpanded = state === 'collapsed' && isHovered;

  // Normalize pathname by removing trailing slashes (except for root)
  const normalizedPathname = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const [activePath, setActivePath] = React.useState(normalizedPathname);

  React.useEffect(() => {
    const normalized = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
    setActivePath(normalized);
  }, [pathname]);

  const mainNavItems = [
    {
      href: '/athletes',
      labelKey: 'sidebar.links.athletes',
      icon: Users,
    },
    {
      href: '/messaging',
      labelKey: 'sidebar.links.messaging',
      icon: MessageCircle,
    },
    {
      href: '/todo',
      labelKey: 'sidebar.links.todo',
      icon: CheckSquare,
    },
    {
      href: '/check-ins',
      labelKey: 'sidebar.links.checkIns',
      icon: ClipboardCheck,
    },
  ] as const;

  const libraryNavItems = [
    {
      href: '/training',
      labelKey: 'sidebar.links.training',
      icon: Dumbbell,
    },
    {
      href: '/forms',
      labelKey: 'sidebar.links.forms',
      icon: ClipboardList,
    },
    {
      href: '/metrics',
      labelKey: 'sidebar.links.metrics',
      icon: BarChart3,
    },
    {
      href: '/habits',
      labelKey: 'sidebar.links.habits',
      icon: Sprout,
    },
    {
      href: '/files',
      labelKey: 'sidebar.links.files',
      icon: File,
    },
  ] as const;

  const automationsNavItems = [
    {
      href: '/flows',
      labelKey: 'sidebar.links.flows',
      icon: Workflow,
    },
  ] as const;

  return (
    <Sidebar collapsible="icon" className={isHoverExpanded ? 'border-r' : ''}>
      <SidebarHeader>
        {isCollapsed ? (
          <div className="flex items-center justify-center px-2 py-1 h-10">
            <LogoIcon className="h-5 w-auto" />
          </div>
        ) : (
          <div className="flex items-center px-2 py-1 h-10">
            <span className="text-base font-semibold">OneNinety</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="gap-0 overflow-y-auto">
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePath === '/get-started'}
                  className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                >
                  <Link href="/get-started">
                    <Rocket className="shrink-0" />
                    {!isCollapsed && <span>{t('sidebar.links.getStarted')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePath === '/home'}
                  className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                >
                  <Link href="/home">
                    <Home className="shrink-0" />
                    {!isCollapsed && <span>{t('sidebar.links.home')}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pb-0">
          <div className="flex h-6 items-center px-2">
            {isCollapsed ? (
              <div className="mx-auto h-px w-8 bg-sidebar-border" />
            ) : (
              <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                {t('sidebar.group.main')}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const href = item.href;
                const isActive =
                  href === '/athletes' || href === '/messaging' || href === '/todo' || href === '/check-ins'
                    ? activePath === href || activePath.startsWith(`${href}/`)
                    : activePath === href;
                const label = t(item.labelKey);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        {!isCollapsed && <span>{label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pb-0">
          <div className="flex h-6 items-center px-2">
            {isCollapsed ? (
              <div className="mx-auto h-px w-8 bg-sidebar-border" />
            ) : (
              <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                {t('sidebar.group.library')}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {libraryNavItems.map((item) => {
                const Icon = item.icon;
                const href = item.href;
                let isActive = false;
                if (href === '/training' || href === '/metrics' || href === '/files' || href === '/habits' || href === '/forms') {
                  // Check exact match or if path starts with the href followed by /
                  isActive = activePath === href || activePath.startsWith(`${href}/`);
                } else {
                  isActive = activePath === href;
                }
                const label =
                  'label' in item ? item.label : 'labelKey' in item ? t(item.labelKey) : '';

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        {!isCollapsed && <span>{label as string}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pb-0">
          <div className="flex h-6 items-center px-2">
            {isCollapsed ? (
              <div className="mx-auto h-px w-8 bg-sidebar-border" />
            ) : (
              <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                {t('sidebar.group.automations')}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {automationsNavItems.map((item) => {
                const Icon = item.icon;
                const href = item.href;
                const isActive =
                  href === '/flows'
                    ? activePath === href || activePath.startsWith(`${href}/`)
                    : activePath === href;
                const label = t(item.labelKey);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        {!isCollapsed && <span>{label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto pb-3">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={activePath === '/settings' || activePath.startsWith('/settings/')}
              className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
            >
              <Link href="/settings">
                <Settings className="shrink-0" />
                {!isCollapsed && <span>{t('sidebar.settings.label') || 'Settings'}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={activePath === '/refer-and-earn'}
              className="text-sm hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
            >
              <Link href="/refer-and-earn">
                <Gift className="shrink-0" />
                {!isCollapsed && <span>{t('sidebar.links.referAndEarn')}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

