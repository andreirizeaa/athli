'use client';

import React from 'react';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageTabs } from '@/components/page-tabs';
import { LibrarySidebarToggle } from '../library-sidebar-toggle';

type NutritionLayoutProps = {
  children: React.ReactNode;
};

const NutritionLayout = ({ children }: NutritionLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const tabs = [
    {
      value: 'recipes',
      label: t('nutrition.tabs.recipes'),
    },
    {
      value: 'recipe-books',
      label: t('nutrition.tabs.recipeBooks'),
    },
    {
      value: 'ingredients',
      label: t('nutrition.tabs.ingredients'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'recipes';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/library/nutrition/${value}`);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {shouldShowHeader && (
        <div className="w-full px-4">
          <div className="flex items-center gap-2 h-[38px] mt-2">
            <LibrarySidebarToggle />
            <h1 className="text-[22px] font-semibold">{t('sidebar.links.nutrition')}</h1>
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

export default NutritionLayout;
