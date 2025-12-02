'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit } from 'lucide-react';

type AthleteTrainingCardProps = {
  clientId: string;
};

export const AthleteTrainingCard = ({ clientId }: AthleteTrainingCardProps) => {
  const t = useTranslations();

  return (
    <Card className="bg-background flex flex-col flex-1 min-w-0" style={{ height: '20vh', minHeight: '20vh', maxHeight: '20vh' }}>
      <CardHeader className="px-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>{t('athletes.profile.athleteTraining')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-2 invisible"
            aria-hidden="true"
            tabIndex={-1}
          >
            <Edit className="h-3 w-3" />
            {t('general.edit')}
          </Button>
        </div>
      </CardHeader>
      <Separator className="w-full mt-[-8px] flex-shrink-0" />
      <CardContent className="px-4 py-0 flex-1 mt-[-12px] -mb-[12px] flex items-center justify-center overflow-y-auto">
        <p className="text-sm text-muted-foreground">{t('athletes.profile.trainingComingSoon')}</p>
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

