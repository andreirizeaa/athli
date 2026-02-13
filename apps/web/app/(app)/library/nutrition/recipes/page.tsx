'use client';

import { useTranslations } from 'next-intl';

const RecipesPage = () => {
  const t = useTranslations();

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t('nutrition.recipes.comingSoon')}</p>
      </div>
    </div>
  );
};

export default RecipesPage;
