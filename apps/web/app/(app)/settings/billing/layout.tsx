'use client';

import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';

type BillingLayoutProps = {
  children: React.ReactNode;
};

const BillingLayout = ({ children }: BillingLayoutProps) => {
  const t = useTranslations();

  return (
    <>
      <div className="w-full relative bg-background z-10">
        <div className="pl-4 pr-4 flex flex-col">
          <div className="flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">{t('settings.groups.billing')}</h1>
          </div>
        </div>
        <Separator />
      </div>
      <div className="w-full flex-1 overflow-auto bg-background relative z-0">
        {children}
      </div>
    </>
  );
};

export default BillingLayout;
