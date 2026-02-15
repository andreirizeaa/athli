'use client';

import React, { useEffect } from 'react';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageTabs } from '@/components/page-tabs';
import { Separator } from '@/components/ui/separator';
import { LibrarySidebarToggle } from '../library-sidebar-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/general/utils';

type FormsLayoutProps = {
  children: React.ReactNode;
};

const FormsLayout = ({ children }: FormsLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const isMobile = useIsMobile();

  // Set browser tab title based on active tab
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      'check-ins': 'Check-ins',
      questionnaires: 'Questionnaires',
    };
    const activeTab = segments.find((s) => tabTitles[s]) || 'check-ins';
    document.title = `${tabTitles[activeTab] || 'Forms'} | Athli`;
  }, [segments]);

  const tabs = [
    {
      value: 'check-ins',
      label: t('forms.tabs.checkIns'),
    },
    {
      value: 'questionnaires',
      label: t('forms.tabs.questionnaires'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  // Check if any segment matches a tab value (for routes like /library/forms/check-ins/[formId], segments would be ["check-ins", "formId"])
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'check-ins';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/library/forms/${value}`);
  };

  return (
    <div className={cn("h-full w-full flex flex-col bg-background", !isMobile && "overflow-auto")}>
      {shouldShowHeader && (
        <div className="w-full relative flex-shrink-0">
          <div className="pl-4 pr-4 flex items-center gap-2 mb-2 mt-2">
            <LibrarySidebarToggle />
            <h1 className="text-[22px] font-semibold">{t('sidebar.links.forms')}</h1>
          </div>
          <div className="px-4">
            <PageTabs
              tabs={tabs}
              value={activeTab}
              onValueChange={handleTabChange}
              className="mt-1"
            />
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
      )}
      <div className={cn("w-full flex-1 relative", !isMobile && "overflow-auto")}>{children}</div>
    </div>
  );
};

export default FormsLayout;
