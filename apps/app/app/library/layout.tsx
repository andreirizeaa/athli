'use client';

import React from 'react';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
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

const tabs = [
  {
    value: 'workouts',
    label: 'Workouts',
  },
  {
    value: 'programs',
    label: 'Programs',
  },
];

const LibraryLayout = ({ children }: LibraryLayoutProps) => {
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const validTabValues = tabs.map((tab) => tab.value);
  // Check if any segment matches a tab value (for routes like /library/workouts/new, segments would be ["workouts", "new"])
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'workouts';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/library/${value}`);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {shouldShowHeader && (
        <div className="w-full px-4">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">Library</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2" aria-label="Open marketplace">
                  <Store className="size-4" />
                  Marketplace
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-neutral-800 text-white dark:bg-white dark:text-neutral-800"
              >
                <div className="p-4 flex items-center justify-center min-h-[80px]">
                  <p className="text-sm text-center">
                    Coming soon! Browse pre-made workouts and programs, sell your own programs and
                    more!
                  </p>
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
