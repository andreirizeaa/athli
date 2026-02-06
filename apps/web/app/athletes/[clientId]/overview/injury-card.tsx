'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { SidePanel } from '@/components/app/side-panel';
import { useClientProfileContext } from '../client-profile-context';
import { useUpdateClientInjuries } from '@/hooks/use-client-injuries';
import type { AthleteInjury } from '@/api/client/client-service';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChevronDownIcon, Plus, Check, ChevronRight, Trash2, Loader2 } from 'lucide-react';

type InjuryCardProps = {
  clientId: string;
};

type PanelMode = 'add' | 'edit';

export const InjuryCard = ({ clientId }: InjuryCardProps) => {
  const t = useTranslations();
  const { injuries, isLoading } = useClientProfileContext();
  const { mutateAsync: updateInjuries, isPending: isSaving } = useUpdateClientInjuries();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('add');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);

  const [editingInjury, setEditingInjury] = useState('');
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPanelOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isPanelOpen]);

  const resetForm = () => {
    setEditingInjury('');
    setEditingDate(null);
    setEditingDetails('');
    setSelectedInjuryId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setPanelMode('add');
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (injury: AthleteInjury) => {
    setSelectedInjuryId(injury.id);
    setEditingInjury(injury.injury);
    setEditingDate(injury.date);
    setEditingDetails(injury.details || '');
    setPanelMode('edit');
    setIsPanelOpen(true);
  };

  const handleClose = () => {
    setIsPanelOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!clientId || !editingInjury.trim()) return;

    try {
      if (panelMode === 'add') {
        const newInjury = {
          injury: editingInjury.trim(),
          date: editingDate,
          details: editingDetails.trim() || undefined,
        };
        await updateInjuries({
          clientId,
          injuries: [...injuries.map(i => ({ injury: i.injury, date: i.date, details: i.details })), newInjury],
        });
      } else {
        const updatedInjuries = injuries.map(i =>
          i.id === selectedInjuryId
            ? { injury: editingInjury.trim(), date: editingDate, details: editingDetails.trim() || undefined }
            : { injury: i.injury, date: i.date, details: i.details }
        );
        await updateInjuries({ clientId, injuries: updatedInjuries });
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save injury:', error);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !selectedInjuryId) return;

    try {
      const remainingInjuries = injuries
        .filter(i => i.id !== selectedInjuryId)
        .map(i => ({ injury: i.injury, date: i.date, details: i.details }));
      await updateInjuries({ clientId, injuries: remainingInjuries });
      handleClose();
    } catch (error) {
      console.error('Failed to delete injury:', error);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setEditingDate(date ? format(date, 'yyyy-MM-dd') : null);
  };

  const canSave = editingInjury.trim() !== '';

  return (
    <>
      <Card className="bg-background flex flex-col w-full flex-1 min-h-0">
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.injuries')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAdd}
              className="h-7 text-xs gap-2"
              aria-label={t('athletes.profile.addInjury')}
            >
              <Plus className="h-3 w-3" />
              {t('general.add')}
            </Button>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px] flex-shrink-0" />
        <CardContent className="px-0 py-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full px-4 py-4">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : injuries.length > 0 ? (
            <div className="flex flex-col">
              <div className="flex items-center px-4 py-2">
                <span className="text-xs text-muted-foreground uppercase font-semibold w-[40%] flex-shrink-0">{t('athletes.profile.injuryTitle')}</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold w-[20%] flex-shrink-0">{t('athletes.profile.injuryDate')}</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold w-[40%] min-w-0">{t('athletes.profile.details')}</span>
              </div>
              {injuries.map((injury) => (
                <React.Fragment key={injury.id}>
                  <Separator />
                  <button
                    type="button"
                    className="flex items-center px-4 py-3 hover:bg-accent transition-colors text-left w-full"
                    onClick={() => handleOpenEdit(injury)}
                    aria-label={t('athletes.profile.editInjury')}
                  >
                    <span className="text-sm font-medium truncate w-[40%] flex-shrink-0 pr-2">{injury.injury}</span>
                    <span className="text-xs text-muted-foreground w-[20%] flex-shrink-0">
                      {injury.date ? format(new Date(injury.date), 'd MMM, yyyy') : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-[40%] min-w-0 pr-2">
                      {injury.details || '--'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                </React.Fragment>
              ))}
              <Separator />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full px-4 py-4">
              <p className="text-xs text-muted-foreground">{t('athletes.profile.noInjuries')}</p>
            </div>
          )}
        </CardContent>
        <Separator className="w-full" />
      </Card>

      <SidePanel
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        title={panelMode === 'add' ? t('athletes.profile.addInjury') : t('athletes.profile.editInjury')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t('general.cancel')}
            </Button>
            {panelMode === 'edit' && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                {t('general.delete')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t('general.save')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto px-1">
          <div className="space-y-2">
            <Label htmlFor="injury-title">{t('athletes.profile.injuryTitle')} <span className="text-destructive">*</span></Label>
            <Input
              id="injury-title"
              ref={titleInputRef}
              value={editingInjury}
              onChange={(e) => setEditingInjury(e.target.value)}
              placeholder={t('athletes.profile.injuryPlaceholder')}
              autoFocus={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="injury-date">
              {t('athletes.profile.injuryDate')}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="injury-date"
                  className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors h-9 text-sm px-3"
                  aria-label={t('athletes.profile.injuryDate')}
                >
                  <span>{editingDate ? format(parseISO(editingDate), 'd MMM, yyyy') : t('general.select')}</span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={editingDate ? parseISO(editingDate) : undefined}
                  disabled={(date) => date > new Date()}
                  captionLayout="dropdown"
                  onSelect={handleDateChange}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="injury-details">
              {t('athletes.profile.details')}
            </Label>
            <Textarea
              id="injury-details"
              value={editingDetails}
              onChange={(e) => setEditingDetails(e.target.value)}
              placeholder={t('athletes.profile.detailsPlaceholder')}
              rows={4}
            />
          </div>
        </div>
      </SidePanel>
    </>
  );
};
