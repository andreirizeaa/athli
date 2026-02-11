'use client';

import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PageTabs } from '@/components/page-tabs';
import { AccountSaveProvider } from './context/account-save-context';

type AccountLayoutProps = {
  children: React.ReactNode;
};

const AccountLayoutContent = ({ children }: AccountLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();

  const tabs = [
    {
      value: 'profile',
      label: t('settings.sections.accountProfile'),
    },
    {
      value: 'security',
      label: t('settings.sections.accountSecurity'),
    },
    {
      value: 'information',
      label: t('settings.sections.accountInformation'),
    },
    {
      value: 'danger',
      label: t('settings.sections.accountDanger'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  // Check if any segment matches a tab value
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'profile';

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/settings/account/${value}`);
  };

  return (
    <>
      <div className="w-full relative bg-background z-10">
        <div className="pl-4 pr-4 flex flex-col">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">{t('settings.sections.account')}</h1>
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
      <div className="w-full flex-1 overflow-auto bg-background relative z-0">
        {children}
      </div>
    </>
  );
};

const AccountLayout = ({ children }: AccountLayoutProps) => {
  return (
    <AccountSaveProvider>
      <AccountLayoutContent>{children}</AccountLayoutContent>
    </AccountSaveProvider>
  );
};

export default AccountLayout;
