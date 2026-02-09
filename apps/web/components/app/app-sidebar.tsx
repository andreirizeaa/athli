'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AthliLogo, AthliIcon } from '@/components/athli-logo';
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
  Zap,
} from 'lucide-react';
import { useCoachChecklist } from '@/hooks/use-coach-checklist';
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
  const { state } = useSidebar();

  const isCollapsed = state === 'collapsed';
  const { data: checklist } = useCoachChecklist();

  const isChecklistComplete = checklist
    ? checklist.client_app_demo &&
      checklist.coach_app_demo &&
      checklist.workout_ai &&
      checklist.program_templates &&
      checklist.custom_exercises &&
      checklist.automate_onboardings &&
      checklist.check_ins_forms &&
      checklist.powerful_flows &&
      checklist.lifestyle_habits &&
      checklist.track_metrics &&
      checklist.on_demand_resources
    : false;

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
      href: '/onboarding',
      labelKey: 'sidebar.links.onboarding',
      icon: Zap,
    },
    {
      href: '/flows',
      labelKey: 'sidebar.links.flows',
      icon: Workflow,
    },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center h-14 px-2 -ml-[6px]">
          <AthliIcon className="size-7 shrink-0" />
          {!isCollapsed && <span className="ml-2 text-2xl font-semibold">Athli</span>}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 overflow-y-auto overscroll-y-contain">
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {!isChecklistComplete && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activePath === '/get-started'}
                    tooltip={t('sidebar.links.getStarted')}
                    className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                  >
                    <Link href="/get-started">
                      <Rocket className="shrink-0" />
                      <span>{t('sidebar.links.getStarted')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activePath === '/home'}
                  tooltip={t('sidebar.links.home')}
                  className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                >
                  <Link href="/home">
                    <Home className="shrink-0" />
                    <span>{t('sidebar.links.home')}</span>
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
                      tooltip={label}
                      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        <span>{label}</span>
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
                      tooltip={label as string}
                      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        <span>{label as string}</span>
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
                  (href === '/flows' || href === '/onboarding')
                    ? activePath === href || activePath.startsWith(`${href}/`)
                    : activePath === href;
                const label = t(item.labelKey);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        <span>{label}</span>
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
              tooltip={t('sidebar.settings.label') || 'Settings'}
              className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
            >
              <Link href="/settings">
                <Settings className="shrink-0" />
                <span>{t('sidebar.settings.label') || 'Settings'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

