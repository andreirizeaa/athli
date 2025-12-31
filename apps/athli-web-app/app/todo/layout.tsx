'use client';

import React from 'react';
import { useRouter, useSelectedLayoutSegments, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageTabs } from '@/components/page-tabs';

type TodoLayoutProps = {
  children: React.ReactNode;
};

const TodoLayout = ({ children }: TodoLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const pathname = usePathname();

  const tabs = [
    {
      value: 'your-list',
      label: t('home.yourList'),
    },
    {
      value: 'athli-assistant',
      label: t('home.athliAssistant'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'your-list';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/todo/${value}`);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {shouldShowHeader && (
        <div className="w-full px-4">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">{t('home.toDoList')}</h1>
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

export default TodoLayout;




