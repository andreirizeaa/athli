'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  WandSparkles,
} from 'lucide-react';
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
      href: '/inbox',
      labelKey: 'sidebar.links.inbox',
      icon: MessageCircle,
    },
    {
      href: '/todo/your-list',
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
      href: '/training/workouts',
      labelKey: 'sidebar.links.training',
      icon: Dumbbell,
    },
    {
      href: '/forms/check-ins',
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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {isCollapsed ? (
          <div className="flex items-center justify-center h-14">
            <Image
              src="/icons/athli.png"
              alt="Athli"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center px-2 h-14">
            <span className="text-base font-semibold">Athli</span>
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
                  className="text-sm"
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
                  className="text-sm"
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
              <div className="mx-auto h-px w-8 bg-sidebar-foreground/70" />
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
                let isActive = activePath === href;

                if (href === '/todo/your-list') {
                  isActive = activePath.startsWith('/todo');
                } else if (
                  href === '/athletes' ||
                  href === '/inbox' ||
                  href === '/check-ins'
                ) {
                  isActive = activePath === href || activePath.startsWith(`${href}/`);
                }
                const label = t(item.labelKey);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="text-sm"
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
              <div className="mx-auto h-px w-8 bg-sidebar-foreground/70" />
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
                if (href === '/training/workouts') {
                  isActive = activePath.startsWith('/training');
                } else if (href === '/forms/check-ins') {
                  isActive = activePath.startsWith('/forms');
                } else if (
                  href === '/metrics' ||
                  href === '/files' ||
                  href === '/habits'
                ) {
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
                      className="text-sm"
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
              <div className="mx-auto h-px w-8 bg-sidebar-foreground/70" />
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
                      className="text-sm"
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
              className="text-sm"
            >
              <Link href="/settings">
                <Settings className="shrink-0" />
                {!isCollapsed && <span>{t('sidebar.settings.label') || 'Settings'}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

