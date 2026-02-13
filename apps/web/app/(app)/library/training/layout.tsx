'use client';

import React from 'react';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageTabs } from '@/components/page-tabs';
import { TrainingDataProvider } from './training-data-context';
import { LibrarySidebarToggle } from '../library-sidebar-toggle';

type TrainingLayoutProps = {
  children: React.ReactNode;
};

const TrainingLayout = ({ children }: TrainingLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const tabs = [
    {
      value: 'workouts',
      label: t('library.workouts'),
    },
    {
      value: 'sections',
      label: t('library.sections.title'),
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
  // Check if any segment matches a tab value (for routes like /library/training/workouts/new, segments would be ["workouts", "new"])
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'workouts';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/library/training/${value}`);
  };

  return (
    <TrainingDataProvider>
      <div className="h-full w-full flex flex-col">
        {shouldShowHeader && (
          <div className="w-full px-4">
            <div className="flex items-center gap-2 h-[38px] mt-2">
              <LibrarySidebarToggle />
              <h1 className="text-[22px] font-semibold">{t('sidebar.links.training')}</h1>
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
    </TrainingDataProvider>
  );
};

export default TrainingLayout;
