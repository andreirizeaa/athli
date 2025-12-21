'use client';

import { useTranslations } from 'next-intl';

const NutritionPage = () => {
  const t = useTranslations();

  return (
    <div className="h-full w-full flex items-center justify-center">
      <h1 className="text-2xl font-semibold">{t('nutrition.comingSoon')}</h1>
    </div>
  );
};

export default NutritionPage;
