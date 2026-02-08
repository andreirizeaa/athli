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
import { useCreateClientGoal, useUpdateClientGoal, useDeleteClientGoal } from '@/hooks/use-client-goals';
import type { AthleteGoal } from '@/api/client/client-service';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChevronDownIcon, Plus, Check, ChevronRight, Trash2, Loader2 } from 'lucide-react';

type GoalsCardProps = {
  clientId: string;
};

type PanelMode = 'add' | 'edit';

export const GoalsCard = ({ clientId }: GoalsCardProps) => {
  const t = useTranslations();
  const { goals, isLoading } = useClientProfileContext();
  const { mutateAsync: createGoal, isPending: isCreating } = useCreateClientGoal();
  const { mutateAsync: updateGoal, isPending: isUpdating } = useUpdateClientGoal();
  const { mutateAsync: deleteGoal, isPending: isDeleting } = useDeleteClientGoal();
  const isSaving = isCreating || isUpdating || isDeleting;

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('add');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [editingGoal, setEditingGoal] = useState('');
  const [editingTargetDate, setEditingTargetDate] = useState<string | null>(null);
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
    setEditingGoal('');
    setEditingTargetDate(null);
    setEditingDetails('');
    setSelectedGoalId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setPanelMode('add');
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (goal: AthleteGoal) => {
    setSelectedGoalId(goal.id);
    setEditingGoal(goal.goal);
    setEditingTargetDate(goal.target_date);
    setEditingDetails(goal.details || '');
    setPanelMode('edit');
    setIsPanelOpen(true);
  };

  const handleClose = () => {
    setIsPanelOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!clientId || !editingGoal.trim()) return;

    try {
      if (panelMode === 'add') {
        await createGoal({
          clientId,
          goal: {
            goal: editingGoal.trim(),
            target_date: editingTargetDate,
            details: editingDetails.trim() || undefined,
          },
        });
      } else if (selectedGoalId) {
        await updateGoal({
          clientId,
          goalId: selectedGoalId,
          goal: {
            goal: editingGoal.trim(),
            target_date: editingTargetDate,
            details: editingDetails.trim() || undefined,
          },
        });
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !selectedGoalId) return;

    try {
      await deleteGoal({ clientId, goalId: selectedGoalId });
      handleClose();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setEditingTargetDate(date ? format(date, 'yyyy-MM-dd') : null);
  };

  const canSave = editingGoal.trim() !== '';

  return (
    <>
      <Card className="bg-background flex flex-col w-full flex-1 min-h-0">
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.goals')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAdd}
              className="h-7 text-xs gap-2"
              aria-label={t('athletes.profile.addGoal')}
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
          ) : goals.length > 0 ? (
            <div className="flex flex-col">
              <div className="flex items-center px-4 py-2">
                <span className="text-xs text-muted-foreground uppercase font-semibold w-[40%] flex-shrink-0">{t('athletes.profile.goalTitle')}</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold w-[20%] flex-shrink-0">{t('athletes.profile.goalDate')}</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold w-[40%] min-w-0">{t('athletes.profile.details')}</span>
              </div>
              {goals.map((goal) => (
                <React.Fragment key={goal.id}>
                  <Separator />
                  <button
                    type="button"
                    className="flex items-center px-4 py-3 hover:bg-accent transition-colors text-left w-full"
                    onClick={() => handleOpenEdit(goal)}
                    aria-label={t('athletes.profile.editGoal')}
                  >
                    <span className="text-sm font-medium truncate w-[40%] flex-shrink-0 pr-2">{goal.goal}</span>
                    <span className="text-xs text-muted-foreground w-[20%] flex-shrink-0">
                      {goal.target_date ? format(new Date(goal.target_date), 'd MMM, yyyy') : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-[40%] min-w-0 pr-2">
                      {goal.details || '--'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                </React.Fragment>
              ))}
              <Separator />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full px-4 py-4">
              <p className="text-xs text-muted-foreground">{t('athletes.profile.noGoals')}</p>
            </div>
          )}
        </CardContent>
        <Separator className="w-full" />
      </Card>

      <SidePanel
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        title={panelMode === 'add' ? t('athletes.profile.addGoal') : t('athletes.profile.editGoal')}
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
            <Label htmlFor="goal-title">{t('athletes.profile.goalTitle')} <span className="text-destructive">*</span></Label>
            <Input
              id="goal-title"
              ref={titleInputRef}
              value={editingGoal}
              onChange={(e) => setEditingGoal(e.target.value)}
              placeholder={t('athletes.profile.goalPlaceholder')}
              autoFocus={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-date">
              {t('athletes.profile.goalDate')}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="goal-date"
                  className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors h-9 text-sm px-3"
                  aria-label={t('athletes.profile.targetDate')}
                >
                  <span>{editingTargetDate ? format(parseISO(editingTargetDate), 'd MMM, yyyy') : t('general.select')}</span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={editingTargetDate ? parseISO(editingTargetDate) : undefined}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  captionLayout="dropdown"
                  onSelect={handleDateChange}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-details">
              {t('athletes.profile.details')}
            </Label>
            <Textarea
              id="goal-details"
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
