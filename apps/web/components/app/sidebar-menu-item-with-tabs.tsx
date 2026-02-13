'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, LucideIcon } from 'lucide-react';
import {
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

type Tab = {
  value: string;
  labelKey: string;
};

type SidebarMenuItemWithTabsProps = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  basePath: string;
  tabs: Tab[];
  tooltipAlign?: 'start' | 'center' | 'end';
};

export function SidebarMenuItemWithTabs({
  href,
  labelKey,
  icon: Icon,
  basePath,
  tabs,
  tooltipAlign = 'start',
}: SidebarMenuItemWithTabsProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();

  const normalizedPathname = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const isActive = normalizedPathname.startsWith(basePath);
  const isCollapsed = state === 'collapsed';
  const label = t(labelKey);

  const menuButton = (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={isCollapsed && !isMobile ? undefined : label}
      className="text-sm hover:bg-[var(--primary)]/10 hover:text-foreground"
    >
      <Link href={href}>
        <Icon className="shrink-0" />
        <span className="flex-1">{label}</span>
        {!isCollapsed && (
          <ChevronRight className="!size-3 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
        )}
      </Link>
    </SidebarMenuButton>
  );

  // On mobile, skip tooltip and just render the menu button
  if (isMobile) {
    return <SidebarMenuItem>{menuButton}</SidebarMenuItem>;
  }

  return (
    <SidebarMenuItem>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
        <TooltipContent
          side="right"
          align={tooltipAlign}
          sideOffset={isCollapsed ? 0 : -2}
          className="flex flex-col px-0 py-1.5 min-w-[160px]"
        >
          <div className="flex items-center justify-between px-3 pb-1.5">
            <span className="text-xs font-semibold text-background/70 uppercase">
              {label}
            </span>
            <Icon className="size-3.5 text-background/70" />
          </div>
          <div className="h-px w-full bg-background/20 mb-1" />
          {tabs.map((tab) => {
            const tabHref = `${basePath}/${tab.value}`;
            // Check if this is the most specific matching tab
            // Only mark as active if exact match, or if it starts with tabHref/ and no other tab is more specific
            const isExactMatch = normalizedPathname === tabHref;
            const isChildPath = normalizedPathname.startsWith(`${tabHref}/`);
            // Check if any other tab is a more specific match (longer path that also matches)
            const hasMoreSpecificMatch = tabs.some((otherTab) => {
              if (otherTab.value === tab.value) return false;
              const otherHref = `${basePath}/${otherTab.value}`;
              return otherHref.length > tabHref.length &&
                (normalizedPathname === otherHref || normalizedPathname.startsWith(`${otherHref}/`));
            });
            const isTabActive = (isExactMatch || isChildPath) && !hasMoreSpecificMatch;
            const tabLabel = t(tab.labelKey);

            return (
              <Link
                key={tab.value}
                href={tabHref}
                className={cn(
                  'mx-1.5 px-2 py-1 text-[15px] rounded transition-colors',
                  'hover:bg-background/20',
                  isTabActive && 'bg-background/20 font-medium'
                )}
              >
                {tabLabel}
              </Link>
            );
          })}
        </TooltipContent>
      </Tooltip>
    </SidebarMenuItem>
  );
}
