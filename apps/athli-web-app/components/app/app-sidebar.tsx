'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  // CalendarDays,
  Home,
  MessageCircle,
  Settings,
  User,
  UserPlus,
  Users,
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

  // Normalize pathname by removing trailing slashes (except for root)
  const normalizedPathname = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const [activePath, setActivePath] = React.useState(normalizedPathname);

  React.useEffect(() => {
    const normalized = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
    setActivePath(normalized);
  }, [pathname]);

  const generalNavItems = [
    {
      href: '/library',
      labelKey: 'sidebar.links.library',
      icon: Archive,
    },
  ] as const;

  // const businessNavItems = [
  //   {
  //     href: '/calendar',
  //     labelKey: 'sidebar.links.calendar',
  //     icon: CalendarDays,
  //   },
  // ] as const;

  const athletesNavItems = [
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
      href: '/settings/profile/account',
      labelKey: 'sidebar.links.profile',
      icon: User,
    },
  ] as const;

  return (
    <Sidebar collapsible="icon" className="border-r">
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
      <SidebarContent className="gap-0">
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
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
              {generalNavItems.map((item) => {
                const Icon = item.icon;
                let isActive = false;
                if (item.href === '/library') {
                  // Check exact match or if path starts with the href followed by /
                  isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);
                } else {
                  isActive = activePath === item.href;
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
              {/* {businessNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activePath === item.href || activePath.startsWith(`${item.href}/`);
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
              })} */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pb-0">
          <div className="flex h-6 items-center px-2">
            {isCollapsed ? (
              <div className="mx-auto h-px w-8 bg-sidebar-border" />
            ) : (
              <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                {t('sidebar.group.athletes')}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {athletesNavItems.map((item) => {
                const Icon = item.icon;
                const href = item.href;
                const isActive =
                  href === '/athletes' || href === '/messaging' || href === '/settings/profile/account'
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
      <SidebarFooter className="mt-auto px-2 pb-3">
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
              className="text-sm border border-primary hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
            >
              <Link href="/settings/business/company/team">
                <UserPlus className="shrink-0" />
                {!isCollapsed && <span>{t('sidebar.footer.addTeamMembers')}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

