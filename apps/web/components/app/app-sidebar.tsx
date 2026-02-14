'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AthliLogo, AthliIcon } from '@/components/athli-logo';
import {
  // CalendarDays,
  Activity,
  ChevronRight,
  File,
  Gift,
  Home,
  Library,
  Lightbulb,
  MessageCircle,
  Settings,
  UserPlus,
  Users,
  CheckSquare,
  Workflow,
  ClipboardCheck,
  Rocket,
  WandSparkles,
  Zap,
  CreditCard,
} from 'lucide-react';
import { useCoachChecklist } from '@/hooks/use-coach-checklist';
import { useTerminology } from '@/hooks/use-terminology';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import { SidebarMenuItemWithTabs } from '@/components/app/sidebar-menu-item-with-tabs';

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();

  // On mobile, the sidebar Sheet is always fully expanded, so never show collapsed state
  const isCollapsed = !isMobile && state === 'collapsed';

  // Close mobile sidebar when navigating
  const handleMobileNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const { data: checklist } = useCoachChecklist();
  const terminology = useTerminology();

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
      labelKey: 'business.tabs.activity',
      icon: Activity,
      hasTabs: false,
    },
    {
      href: '/business/packages',
      labelKey: 'sidebar.links.packages',
      icon: CreditCard,
      hasTabs: true,
    },
  ] as const;

  const librarySections = [
    {
      id: 'training',
      labelKey: 'sidebar.links.training',
      href: '/library/training/workouts',
      matchPath: '/library/training',
    },
    {
      id: 'forms',
      labelKey: 'sidebar.links.forms',
      href: '/library/forms/check-ins',
      matchPath: '/library/forms',
    },
    {
      id: 'metrics',
      labelKey: 'sidebar.links.metrics',
      href: '/library/metrics',
      matchPath: '/library/metrics',
    },
    {
      id: 'habits',
      labelKey: 'sidebar.links.habits',
      href: '/library/habits',
      matchPath: '/library/habits',
    },
    {
      id: 'files',
      labelKey: 'sidebar.links.files',
      href: '/library/files',
      matchPath: '/library/files',
    },
    {
      id: 'nutrition',
      labelKey: 'sidebar.links.nutrition',
      href: '/library/nutrition/recipes',
      matchPath: '/library/nutrition',
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

  const businessTabs = [
    { value: 'packages', labelKey: 'business.tabs.packages' },
    { value: 'coupons', labelKey: 'business.tabs.coupons' },
    { value: 'sequences', labelKey: 'business.tabs.sequences' },
  ];

  const settingsTabs = [
    { value: 'account/profile', labelKey: 'settings.sections.account' },
    { value: 'profile/notifications', labelKey: 'settings.sections.notifications' },
    { value: 'billing', labelKey: 'settings.sections.billing' },
    { value: 'app/customisations', labelKey: 'settings.sections.customisations' },
    { value: 'business/company/information', labelKey: 'settings.sections.company' },
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
                    <Link href="/get-started" onClick={handleMobileNavClick}>
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
                  <Link href="/home" onClick={handleMobileNavClick}>
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
              <div className="mx-auto w-8 border-t-[1.5px] border-sidebar-foreground/70" />
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
                      onNavigate={handleMobileNavClick}
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
                // Use terminology for athletes link, translation for others
                const label = href === '/athletes' ? terminology.plural : t(item.labelKey);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                    >
                      <Link href={item.href} onClick={handleMobileNavClick}>
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
              <div className="mx-auto w-8 border-t-[1.5px] border-sidebar-foreground/70" />
            ) : (
              <span className="text-[11px] font-semibold uppercase text-sidebar-foreground/70">
                {t('sidebar.group.library')}
              </span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={activePath.startsWith('/library')}
                      tooltip={isCollapsed ? t('sidebar.links.library') : undefined}
                      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                    >
                      <Link href="/library/training/workouts" onClick={handleMobileNavClick}>
                        <Library className="shrink-0" />
                        <span className="flex-1">{t('sidebar.links.library')}</span>
                        {!isCollapsed && (
                          <ChevronRight className="!size-3 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="start"
                    sideOffset={isCollapsed ? 0 : -2}
                    className="flex flex-col px-0 py-1.5 min-w-[160px]"
                  >
                    <div className="flex items-center justify-between px-3 pb-1.5">
                      <span className="text-xs font-semibold text-background/70 uppercase">
                        {t('sidebar.links.library')}
                      </span>
                      <Library className="size-4 text-background/70" />
                    </div>
                    <div className="h-px w-full bg-background/20 mb-1" />
                    {librarySections.map((section) => {
                      const isSectionActive = activePath.startsWith(section.matchPath);
                      return (
                        <Link
                          key={section.id}
                          href={section.href}
                          onClick={handleMobileNavClick}
                          className={cn(
                            'mx-1.5 px-2 py-2 text-[15px] rounded transition-colors',
                            'hover:bg-background/20',
                            isSectionActive && 'bg-background/20 font-medium'
                          )}
                        >
                          {t(section.labelKey)}
                        </Link>
                      );
                    })}
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pb-0">
          <div className="flex h-6 items-center px-2">
            {isCollapsed ? (
              <div className="mx-auto w-8 border-t-[1.5px] border-sidebar-foreground/70" />
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

                if (item.hasTabs) {
                  return (
                    <SidebarMenuItemWithTabs
                      key={item.href}
                      href={item.href}
                      labelKey={item.labelKey}
                      icon={Icon}
                      basePath="/business"
                      tabs={businessTabs}
                      onNavigate={handleMobileNavClick}
                    />
                  );
                }

                const isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={t(item.labelKey)}
                      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
                    >
                      <Link href={item.href} onClick={handleMobileNavClick}>
                        <Icon className="shrink-0" />
                        <span>{t(item.labelKey)}</span>
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
              <div className="mx-auto w-8 border-t-[1.5px] border-sidebar-foreground/70" />
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
                      <Link href={item.href} onClick={handleMobileNavClick}>
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
              isActive={activePath === '/features'}
              tooltip={t('sidebar.featureRequests.label')}
              className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
            >
              <Link href="/features" onClick={handleMobileNavClick}>
                <Lightbulb className="shrink-0" />
                <span>{t('sidebar.featureRequests.label')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={activePath === '/refer-and-earn'}
              tooltip={t('sidebar.links.referAndEarn')}
              className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
            >
              <Link href="/refer-and-earn" onClick={handleMobileNavClick}>
                <Gift className="shrink-0" />
                <span>{t('sidebar.links.referAndEarn')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItemWithTabs
            href="/settings/account/profile"
            labelKey="sidebar.settings.label"
            icon={Settings}
            basePath="/settings"
            tabs={settingsTabs}
            tooltipAlign="end"
            onNavigate={handleMobileNavClick}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

