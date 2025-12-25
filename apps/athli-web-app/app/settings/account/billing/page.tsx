'use client';

import { useTranslations } from 'next-intl';

const BillingPage = () => {
  const t = useTranslations();

  return (
    <div className="w-full flex-1 overflow-auto px-4 py-4 bg-background">
      {/* Billing settings content will go here */}
    </div>
  );
};

export default BillingPage;

