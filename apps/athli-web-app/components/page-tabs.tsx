'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type TabItem = {
  value: string;
  label: string;
};

type PageTabsProps = {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

const PageTabs = ({ tabs, value, defaultValue, onValueChange, className }: PageTabsProps) => {
  const defaultTabValue = defaultValue || tabs[0]?.value;

  return (
    <div className={cn('relative', className)}>
      <Tabs value={value} defaultValue={defaultTabValue} onValueChange={onValueChange}>
        <div className="-mx-4 relative px-4">
          <div className="flex items-end pb-0">
            <TabsList className="h-auto bg-transparent p-0 gap-2 border-none mt-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent border-0 border-b-2 border-b-transparent data-[state=active]:border-b-foreground dark:data-[state=active]:border-b-white px-0.5 py-1 text-[14px] font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:hover:bg-sidebar-accent data-[state=active]:hover:text-sidebar-accent-foreground dark:data-[state=active]:hover:bg-sidebar-accent dark:data-[state=active]:hover:text-sidebar-accent-foreground transition-colors bg-transparent relative z-10 data-[state=active]:mb-[-1px] focus-visible:ring-0 focus-visible:outline-none rounded-md [&:not([data-state=active])]:border-b-0 data-[state=active]:[border-bottom-left-radius:0] data-[state=active]:[border-bottom-right-radius:0]"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
      </Tabs>
    </div>
  );
};

export { PageTabs };
export type { PageTabsProps, TabItem };
