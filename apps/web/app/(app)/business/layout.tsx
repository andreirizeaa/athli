'use client';

import React from 'react';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageTabs } from '@/components/page-tabs';
import { Separator } from '@/components/ui/separator';

type BusinessLayoutProps = {
  children: React.ReactNode;
};

const BusinessLayout = ({ children }: BusinessLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const tabs = [
    {
      value: 'packages',
      label: t('business.tabs.packages'),
    },
    {
      value: 'codes',
      label: t('business.tabs.codes'),
    },
    {
      value: 'sequences',
      label: t('business.tabs.sequences'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'packages';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/business/${value}`);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      {shouldShowHeader && (
        <div className="w-full relative flex-shrink-0">
          <div className="pl-4 pr-4 flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">{t('business.title')}</h1>
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
      <div className="w-full flex-1 overflow-auto relative">{children}</div>
    </div>
  );
};

export default BusinessLayout;
