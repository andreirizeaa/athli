'use client';

import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const BillingPage = () => {
  const t = useTranslations();

  return (
    <>
      <div className="w-full relative bg-background">
        <div className="pl-4 pr-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">
            {t('settings.sections.billing')}
          </h1>
          <Button className="mb-2 mt-2">
            {t('general.save')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 py-4 bg-secondary">
        {/* Billing settings content will go here */}
      </div>
    </>
  );
};

export default BillingPage;


