'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageTabs } from '@/components/page-tabs';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { useCompanySave, CompanySaveProvider } from './context/company-save-context';

type CompanyLayoutProps = {
  children: React.ReactNode;
};

const CompanyLayoutContent = ({ children }: CompanyLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const { onSave, isSaving, hasSaveHandler } = useCompanySave();

  const tabs = [
    {
      value: 'information',
      label: t('settings.sections.companyInformation'),
    },
    {
      value: 'branding',
      label: t('settings.sections.companyBranding'),
    },
    {
      value: 'team',
      label: t('settings.sections.companyTeam'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  // Check if any segment matches a tab value
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'information';

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/settings/business/company/${value}`);
  };

  return (
    <>
      <div className="w-full relative bg-background z-10">
        <div className="pl-4 pr-4 flex flex-col">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">
              {t('settings.sections.company')}
            </h1>
            {hasSaveHandler && onSave && (
              <Button 
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
              >
                {isSaving ? t('general.saving') : t('general.save')}
              </Button>
            )}
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

const CompanyLayout = ({ children }: CompanyLayoutProps) => {
  return (
    <CompanySaveProvider>
      <CompanyLayoutContent>{children}</CompanyLayoutContent>
    </CompanySaveProvider>
  );
};

export default CompanyLayout;

