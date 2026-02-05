'use client';

import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const BrandingPage = () => {
  const t = useTranslations();

  return (
    <div className="w-full h-full flex flex-col overflow-auto">
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>{t('settings.company.branding.title')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          <CardContent className="px-4 py-6">
            <p className="text-sm text-muted-foreground text-center">
              {t('sidebar.footer.comingSoon')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandingPage;


