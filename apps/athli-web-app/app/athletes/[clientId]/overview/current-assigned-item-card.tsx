'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getCurrentAssignedItem, type AssignedItem } from '@/lib/athletes/athlete-service';

type CurrentAssignedItemCardProps = {
  clientId: string;
};

export const CurrentAssignedItemCard = ({ clientId }: CurrentAssignedItemCardProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [assignedItem, setAssignedItem] = useState<AssignedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedItem = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const item = await getCurrentAssignedItem(clientId);
        setAssignedItem(item);
      } catch (error) {
        console.error('Failed to fetch assigned item:', error);
        setAssignedItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedItem();
  }, [clientId]);

  const handleClick = () => {
    if (!assignedItem) return;

    if (assignedItem.type === 'program') {
      router.push(`/training/programs/${assignedItem.id}/edit`);
    } else if (assignedItem.type === 'workout') {
      router.push(`/training/workouts/${assignedItem.id}/edit/standard`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const equipmentList = assignedItem?.equipment
    ? assignedItem.equipment.split(',').map((item) => item.trim()).filter((item) => item !== '')
    : [];

  return (
    <Card className="bg-background w-full flex flex-col" style={{ height: '240px', minHeight: '240px', maxHeight: '240px' }}>
      <CardHeader className="px-4 flex-shrink-0">
        <CardTitle>{t('athletes.profile.currentAssignedItem')}</CardTitle>
      </CardHeader>
      <Separator className="w-full mt-[-8px] flex-shrink-0" />
      <CardContent
        className="px-4 py-0 flex-1 mt-[-12px] -mb-[12px] flex flex-col gap-2 overflow-y-auto cursor-pointer hover:bg-accent/50 transition-colors justify-center"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={assignedItem ? t('athletes.profile.viewAssignedItem', { name: assignedItem.name }) : t('athletes.profile.currentAssignedItem')}
        onKeyDown={handleKeyDown}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t('general.loading')}</p>
          </div>
        ) : !assignedItem ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t('athletes.profile.noAssignedItem')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{assignedItem.name}</span>
            </div>
            {assignedItem.description && (
              <span className="text-xs text-muted-foreground line-clamp-2">
                {assignedItem.description}
              </span>
            )}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {t('general.type')}: {assignedItem.type === 'program' ? t('programs.title') : t('library.workoutColumn')}
              </Badge>
              {equipmentList.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {t('general.equipment')}: {equipmentList.join(', ')}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

