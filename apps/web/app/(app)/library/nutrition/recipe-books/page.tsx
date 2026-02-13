'use client';

import { useTranslations } from 'next-intl';

const RecipeBooksPage = () => {
  const t = useTranslations();

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t('nutrition.recipeBooks.comingSoon')}</p>
      </div>
    </div>
  );
};

export default RecipeBooksPage;
