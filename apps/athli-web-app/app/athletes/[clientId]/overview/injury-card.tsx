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
import { Edit, Plus, X } from 'lucide-react';
import { getAthleteInjuries, saveAthleteInjuries } from '@/lib/api/client/client-service';

type InjuryCardProps = {
  clientId: string;
};

export const InjuryCard = ({ clientId }: InjuryCardProps) => {
  const t = useTranslations();
  const [injuries, setInjuries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditInjuriesOpen, setIsEditInjuriesOpen] = useState(false);
  const [editingInjuries, setEditingInjuries] = useState<string[]>(['']);
  const [hasInjuriesChanges, setHasInjuriesChanges] = useState(false);
  const firstInjuryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInjuries = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const fetchedInjuries = await getAthleteInjuries(clientId);
        setInjuries(fetchedInjuries);
        setEditingInjuries(fetchedInjuries.length > 0 ? fetchedInjuries : ['']);
      } catch (error) {
        console.error('Failed to fetch injuries:', error);
        setInjuries([]);
        setEditingInjuries(['']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInjuries();
  }, [clientId]);

  useEffect(() => {
    if (isEditInjuriesOpen && firstInjuryInputRef.current) {
      setTimeout(() => {
        firstInjuryInputRef.current?.focus();
      }, 100);
    }
  }, [isEditInjuriesOpen]);

  useEffect(() => {
    const injuriesString = injuries.join('|');
    const editingString = editingInjuries.join('|');
    setHasInjuriesChanges(editingString !== injuriesString);
  }, [editingInjuries, injuries]);

  const handleSaveInjuries = async () => {
    if (!clientId) return;

    try {
      const filteredInjuries = editingInjuries.filter((injury) => injury.trim() !== '');
      await saveAthleteInjuries(clientId, filteredInjuries);
      setInjuries(filteredInjuries);
      setHasInjuriesChanges(false);
      setIsEditInjuriesOpen(false);
    } catch (error) {
      console.error('Failed to save injuries:', error);
    }
  };

  const handleCancelInjuriesEdit = () => {
    setEditingInjuries(injuries.length > 0 ? injuries : ['']);
    setHasInjuriesChanges(false);
    setIsEditInjuriesOpen(false);
  };

  const handleEditInjuries = () => {
    setEditingInjuries(injuries.length > 0 ? injuries : ['']);
    setHasInjuriesChanges(false);
    setIsEditInjuriesOpen(true);
  };

  const handleAddInjury = () => {
    setEditingInjuries([...editingInjuries, '']);
  };

  const handleRemoveInjury = (index: number) => {
    if (editingInjuries.length > 1) {
      setEditingInjuries(editingInjuries.filter((_, i) => i !== index));
    }
  };

  const handleInjuryChange = (index: number, value: string) => {
    const updated = [...editingInjuries];
    updated[index] = value;
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
                  <span className="break-words">{injury}</span>
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
            <Button onClick={handleSaveInjuries} disabled={!hasInjuriesChanges}>
              {t('general.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelInjuriesEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto">
          {editingInjuries.map((injury, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`injury-${index + 1}`}>
                {t('athletes.profile.injuryNumber', { number: index + 1 })}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`injury-${index + 1}`}
                  ref={index === 0 ? firstInjuryInputRef : null}
                  value={injury}
                  onChange={(e) => handleInjuryChange(index, e.target.value)}
                  placeholder={t('athletes.profile.injuryPlaceholder')}
                  autoFocus={false}
                  tabIndex={0}
                />
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

