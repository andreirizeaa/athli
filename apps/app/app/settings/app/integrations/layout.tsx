'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageTabs } from '@/components/page-tabs';

type IntegrationsLayoutProps = {
  children: React.ReactNode;
};

const IntegrationsLayout = ({ children }: IntegrationsLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const tabs = [
    {
      value: 'email',
      label: t('settings.sections.email'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  // Check if any segment matches a tab value
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'email';

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/settings/app/integrations/${value}`);
  };

  return (
    <>
      <div className="w-full relative bg-background z-10">
        <div className="pl-4 pr-4 flex flex-col">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">
              {t('settings.sections.integrations')}
            </h1>
            <Button>
              {t('general.save')}
            </Button>
          </div>
          <div className="-mb-2">
            <PageTabs
              tabs={tabs}
              value={activeTab}
              onValueChange={handleTabChange}
            />
          </div>
        </div>
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 bg-secondary relative z-0 mt-2">
        {children}
      </div>
    </>
  );
};

export default IntegrationsLayout;


