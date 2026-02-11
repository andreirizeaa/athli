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
  CreditCard,
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
import { SidebarMenuItemWithTabs } from '@/components/app/sidebar-menu-item-with-tabs';

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

  const businessNavItems = [
    {
      href: '/business/activity',
      labelKey: 'sidebar.links.packages',
      icon: CreditCard,
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

  // Tab configurations for items with sub-navigation
  const todoTabs = [
    { value: 'your-list', labelKey: 'home.yourList' },
    { value: 'athli-assistant', labelKey: 'home.athliAssistant' },
  ];

  const trainingTabs = [
    { value: 'workouts', labelKey: 'library.workouts' },
    { value: 'sections', labelKey: 'library.sections.title' },
    { value: 'programs', labelKey: 'library.programs' },
    { value: 'exercises', labelKey: 'library.exercises' },
  ];

  const formsTabs = [
    { value: 'check-ins', labelKey: 'forms.tabs.checkIns' },
    { value: 'questionnaires', labelKey: 'forms.tabs.questionnaires' },
  ];

  const businessTabs = [
    { value: 'activity', labelKey: 'business.tabs.activity' },
    { value: 'packages', labelKey: 'business.tabs.packages' },
    { value: 'coupons', labelKey: 'business.tabs.coupons' },
    { value: 'sequences', labelKey: 'business.tabs.sequences' },
  ];

  const settingsTabs = [
    { value: 'account/profile', labelKey: 'settings.groups.personal' },
    { value: 'billing', labelKey: 'settings.sections.billingCurrent' },
    { value: 'billing/plans', labelKey: 'settings.sections.billingPlans' },
    { value: 'app/customisations', labelKey: 'settings.groups.appSettings' },
    { value: 'business/company/information', labelKey: 'settings.groups.business' },
  ];

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

                // Use SidebarMenuItemWithTabs for Todo
                if (href === '/todo/your-list') {
                  return (
                    <SidebarMenuItemWithTabs
                      key={item.href}
                      href={href}
                      labelKey={item.labelKey}
                      icon={Icon}
                      basePath="/todo"
                      tabs={todoTabs}
                    />
                  );
                }

                let isActive = activePath === href;
                if (
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
                {t('sidebar.group.business')}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {businessNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItemWithTabs
                    key={item.href}
                    href={item.href}
                    labelKey={item.labelKey}
                    icon={Icon}
                    basePath="/business"
                    tabs={businessTabs}
                  />
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

                // Use SidebarMenuItemWithTabs for Training
                if (href === '/training/workouts') {
                  return (
                    <SidebarMenuItemWithTabs
                      key={item.href}
                      href={href}
                      labelKey={item.labelKey}
                      icon={Icon}
                      basePath="/training"
                      tabs={trainingTabs}
                    />
                  );
                }

                // Use SidebarMenuItemWithTabs for Forms
                if (href === '/forms/check-ins') {
                  return (
                    <SidebarMenuItemWithTabs
                      key={item.href}
                      href={href}
                      labelKey={item.labelKey}
                      icon={Icon}
                      basePath="/forms"
                      tabs={formsTabs}
                    />
                  );
                }

                let isActive = false;
                if (
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
          <SidebarMenuItemWithTabs
            href="/settings/account/profile"
            labelKey="sidebar.settings.label"
            icon={Settings}
            basePath="/settings"
            tabs={settingsTabs}
            tooltipAlign="end"
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

