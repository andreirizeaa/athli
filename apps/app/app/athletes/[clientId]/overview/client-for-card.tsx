'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { mockAthletes } from '@/components/app/app-shell';

type ClientForCardProps = {
  clientId: string;
};

const formatClientDuration = (days: number): string => {
  if (days <= 6) {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (days <= 27) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
};

export const ClientForCard = ({ clientId }: ClientForCardProps) => {
  const t = useTranslations();
  const athlete = mockAthletes.find((item) => item.id === clientId);

  return (
    <Card className="bg-background flex flex-col flex-1 min-w-0" style={{ height: '80px', minHeight: '80px', maxHeight: '80px' }}>
      <Separator className="w-full flex-shrink-0" />
      <CardContent className="px-4 py-2 flex-1 flex flex-col items-center justify-center min-h-0">
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t('athletes.profile.clientFor')}</p>
        {athlete && athlete.clientFor ? (
          <p className="text-base font-semibold text-foreground leading-tight">{formatClientDuration(athlete.clientFor)}</p>
        ) : (
          <p className="text-base font-semibold text-foreground leading-tight">-</p>
        )}
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

