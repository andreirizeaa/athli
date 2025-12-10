'use client';

import { useTranslations } from 'next-intl';

const ClientMetricsPage = () => {
  const t = useTranslations();

  return (
    <div className="flex h-full w-full items-center justify-center">
      <h1 className="text-2xl font-bold text-primary">
        {t('dashboard.comingSoon')}
      </h1>
    </div>
  );
};

export default ClientMetricsPage;
