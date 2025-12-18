'use client';

import React from 'react';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageTabs } from '@/components/page-tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Store } from 'lucide-react';

type LibraryLayoutProps = {
  children: React.ReactNode;
};

const LibraryLayout = ({ children }: LibraryLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const tabs = [
    {
      value: 'workouts',
      label: t('library.workouts'),
    },
    {
      value: 'programs',
      label: t('library.programs'),
    },
    {
      value: 'exercises',
      label: t('library.exercises'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  // Check if any segment matches a tab value (for routes like /training/workouts/new, segments would be ["workouts", "new"])
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'workouts';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/training/${value}`);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {shouldShowHeader && (
        <div className="w-full px-4">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">{t('library.title')}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2" aria-label={t('library.openMarketplace')}>
                  <Store className="size-4" />
                  {t('library.marketplace')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-neutral-800 text-white dark:bg-white dark:text-neutral-800"
              >
                <div className="p-4 flex items-center justify-center min-h-[80px]">
                  <p className="text-sm text-center">{t('library.marketplaceComingSoon')}</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <PageTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={handleTabChange}
            className="mt-1"
          />
        </div>
      )}
      <div className="w-full flex-1 overflow-auto relative">{children}</div>
    </div>
  );
};

export default LibraryLayout;
