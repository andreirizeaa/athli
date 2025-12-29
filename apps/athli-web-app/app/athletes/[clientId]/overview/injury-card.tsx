'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import { useClientProfileContext } from '../client-profile-context';
import { useUpdateClientInjuries } from '@/hooks/use-client-injuries';
import type { AthleteInjury } from '@/api/client/client-service';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChevronDownIcon, Edit, Plus, X } from 'lucide-react';

type InjuryCardProps = {
  clientId: string;
};

export const InjuryCard = ({ clientId }: InjuryCardProps) => {
  const t = useTranslations();
  const { injuries, isLoading } = useClientProfileContext();
  const updateInjuriesMutation = useUpdateClientInjuries();
  const [isEditInjuriesOpen, setIsEditInjuriesOpen] = useState(false);
  const [editingInjuries, setEditingInjuries] = useState<{ injury: string; date: string | null }[]>([{ injury: '', date: null }]);
  const [hasInjuriesChanges, setHasInjuriesChanges] = useState(false);
  const firstInjuryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditInjuriesOpen && firstInjuryInputRef.current) {
      setTimeout(() => {
        firstInjuryInputRef.current?.focus();
      }, 100);
    }
  }, [isEditInjuriesOpen]);

  useEffect(() => {
    const injuriesString = JSON.stringify(injuries.map(i => ({ injury: i.injury, date: i.date })));
    const editingString = JSON.stringify(editingInjuries);
    setHasInjuriesChanges(editingString !== injuriesString);
  }, [editingInjuries, injuries]);

  const handleSaveInjuries = async () => {
    if (!clientId) return;

    try {
      const filteredInjuries = editingInjuries
        .filter((i) => i.injury.trim() !== '')
        .map(i => ({
          injury: i.injury,
          date: i.date
        }));
      await updateInjuriesMutation.mutateAsync({ clientId, injuries: filteredInjuries });
      setHasInjuriesChanges(false);
      setIsEditInjuriesOpen(false);
    } catch (error) {
      console.error('Failed to save injuries:', error);
    }
  };

  const handleCancelInjuriesEdit = () => {
    setEditingInjuries(injuries.length > 0 ? injuries.map(i => ({ injury: i.injury, date: i.date })) : [{ injury: '', date: null }]);
    setHasInjuriesChanges(false);
    setIsEditInjuriesOpen(false);
  };

  const handleEditInjuries = () => {
    setEditingInjuries(injuries.length > 0 ? injuries.map(i => ({ injury: i.injury, date: i.date })) : [{ injury: '', date: null }]);
    setHasInjuriesChanges(false);
    setIsEditInjuriesOpen(true);
  };

  const handleAddInjury = () => {
    setEditingInjuries([...editingInjuries, { injury: '', date: null }]);
  };

  const handleRemoveInjury = (index: number) => {
    if (editingInjuries.length > 1) {
      setEditingInjuries(editingInjuries.filter((_, i) => i !== index));
    }
  };

  const handleInjuryChange = (index: number, value: string) => {
    const updated = [...editingInjuries];
    updated[index] = { ...updated[index], injury: value };
    setEditingInjuries(updated);
  };

  const handleDateChange = (index: number, date: Date | undefined) => {
    const updated = [...editingInjuries];
    updated[index] = { ...updated[index], date: date ? format(date, 'yyyy-MM-dd') : null };
    setEditingInjuries(updated);
  };

  return (
    <>
      <Card className="bg-background flex flex-col w-full flex-1 min-h-0">
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.injuries')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditInjuries}
              className="h-7 text-xs gap-2"
              aria-label={t('general.edit')}
            >
              <Edit className="h-3 w-3" />
              {t('general.edit')}
            </Button>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px] flex-shrink-0" />
        <CardContent className="px-4 py-2 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : injuries.length > 0 ? (
            <div className="flex flex-wrap gap-2 w-full">
              {injuries.map((injury, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="!whitespace-normal break-words max-w-full cursor-pointer hover:bg-accent transition-colors p-2 !rounded-md"
                  onClick={handleEditInjuries}
                  role="button"
                  tabIndex={0}
                  aria-label={t('athletes.profile.editInjuries')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEditInjuries();
                    }
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="break-words font-medium">{injury.injury}</span>
                    {injury.date && (
                      <span className="text-[10px] text-muted-foreground">
                        {t('athletes.profile.injuryDate')}: {format(new Date(injury.date), 'd MMM, yyyy')}
                      </span>
                    )}
                  </div>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('athletes.profile.noInjuries')}</p>
            </div>
          )}
        </CardContent>
        <Separator className="w-full" />
      </Card>

      <SidePanel
        open={isEditInjuriesOpen}
        onOpenChange={setIsEditInjuriesOpen}
        title={t('athletes.profile.editInjuries')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              onClick={handleSaveInjuries}
              disabled={!hasInjuriesChanges || editingInjuries.some((i) => i.injury.trim() === '')}
            >
              {t('general.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelInjuriesEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto px-1">
          {editingInjuries.map((injury, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`injury-${index + 1}`}>
                {t('athletes.profile.injuryNumber', { number: index + 1 })}
              </Label>
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 flex-1">
                  <Input
                    id={`injury-${index + 1}`}
                    ref={index === 0 ? firstInjuryInputRef : null}
                    value={injury.injury}
                    onChange={(e) => handleInjuryChange(index, e.target.value)}
                    placeholder={t('athletes.profile.injuryPlaceholder')}
                    autoFocus={false}
                    tabIndex={0}
                  />
                  <div className="flex flex-col gap-1 mt-1">
                    <Label htmlFor={`injury-date-${index + 1}`} className="text-[10px] text-muted-foreground uppercase px-1 font-semibold flex items-center">
                      {t('athletes.profile.injuryDate')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id={`injury-date-${index + 1}`}
                          className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors h-8 text-xs px-3"
                          aria-label={t('athletes.profile.injuryDate')}
                        >
                          <div className="flex items-center gap-2">
                            <span>{injury.date ? format(parseISO(injury.date), 'd MMM, yyyy') : t('general.select')}</span>
                          </div>
                          <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={injury.date ? parseISO(injury.date) : undefined}
                          captionLayout="dropdown"
                          disabled={(date) => date > new Date()}
                          onSelect={(date) => handleDateChange(index, date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {editingInjuries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => handleRemoveInjury(index)}
                    aria-label={t('general.remove')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddInjury}
            className="w-full gap-2"
            aria-label={t('athletes.profile.addInjury')}
          >
            <Plus className="h-4 w-4" />
            {t('athletes.profile.addInjury')}
          </Button>
        </div>
      </SidePanel>
    </>
  );
};

