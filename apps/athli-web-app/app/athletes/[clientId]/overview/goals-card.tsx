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
import { useUpdateClientGoals } from '@/hooks/use-client-goals';
import type { AthleteGoal } from '@/api/client/client-service';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChevronDownIcon, Edit, Plus, X } from 'lucide-react';

type GoalsCardProps = {
  clientId: string;
};

export const GoalsCard = ({ clientId }: GoalsCardProps) => {
  const t = useTranslations();
  const { goals, isLoading } = useClientProfileContext();
  const updateGoalsMutation = useUpdateClientGoals();
  const [isEditGoalsOpen, setIsEditGoalsOpen] = useState(false);
  const [editingGoals, setEditingGoals] = useState<{ goal: string; targetDate: string | null }[]>([{ goal: '', targetDate: null }]);
  const [hasGoalsChanges, setHasGoalsChanges] = useState(false);
  const firstGoalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditGoalsOpen && firstGoalInputRef.current) {
      setTimeout(() => {
        firstGoalInputRef.current?.focus();
      }, 100);
    }
  }, [isEditGoalsOpen]);

  useEffect(() => {
    const goalsString = JSON.stringify(goals.map(g => ({ goal: g.goal, targetDate: g.target_date })));
    const editingString = JSON.stringify(editingGoals);
    setHasGoalsChanges(editingString !== goalsString);
  }, [editingGoals, goals]);

  const handleSaveGoals = async () => {
    if (!clientId) return;

    try {
      const filteredGoals = editingGoals
        .filter((g) => g.goal.trim() !== '')
        .map(g => ({
          goal: g.goal,
          target_date: g.targetDate
        }));
      await updateGoalsMutation.mutateAsync({ clientId, goals: filteredGoals });
      setHasGoalsChanges(false);
      setIsEditGoalsOpen(false);
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };

  const handleCancelGoalsEdit = () => {
    setEditingGoals(goals.length > 0 ? goals.map(g => ({ goal: g.goal, targetDate: g.target_date })) : [{ goal: '', targetDate: null }]);
    setHasGoalsChanges(false);
    setIsEditGoalsOpen(false);
  };

  const handleEditGoals = () => {
    setEditingGoals(goals.length > 0 ? goals.map(g => ({ goal: g.goal, targetDate: g.target_date })) : [{ goal: '', targetDate: null }]);
    setHasGoalsChanges(false);
    setIsEditGoalsOpen(true);
  };

  const handleAddGoal = () => {
    setEditingGoals([...editingGoals, { goal: '', targetDate: null }]);
  };

  const handleRemoveGoal = (index: number) => {
    if (editingGoals.length > 1) {
      setEditingGoals(editingGoals.filter((_, i) => i !== index));
    }
  };

  const handleGoalChange = (index: number, value: string) => {
    const updated = [...editingGoals];
    updated[index] = { ...updated[index], goal: value };
    setEditingGoals(updated);
  };

  const handleDateChange = (index: number, date: Date | undefined) => {
    const updated = [...editingGoals];
    updated[index] = { ...updated[index], targetDate: date ? format(date, 'yyyy-MM-dd') : null };
    setEditingGoals(updated);
  };

  return (
    <>
      <Card className="bg-background flex flex-col w-full flex-1 min-h-0">
        <CardHeader className="px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{t('athletes.profile.goals')}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditGoals}
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
          ) : goals.length > 0 ? (
            <div className="flex flex-wrap gap-2 w-full">
              {goals.map((goal, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="!whitespace-normal break-words max-w-full cursor-pointer hover:bg-accent transition-colors p-2 !rounded-md"
                  onClick={handleEditGoals}
                  role="button"
                  tabIndex={0}
                  aria-label={t('athletes.profile.editGoals')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEditGoals();
                    }
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="break-words font-medium">{goal.goal}</span>
                    {goal.target_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {t('athletes.profile.targetDate')}: {format(new Date(goal.target_date), 'd MMM, yyyy')}
                      </span>
                    )}
                  </div>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('athletes.profile.noGoals')}</p>
            </div>
          )}
        </CardContent>
        <Separator className="w-full" />
      </Card>

      <SidePanel
        open={isEditGoalsOpen}
        onOpenChange={setIsEditGoalsOpen}
        title={t('athletes.profile.editGoals')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              onClick={handleSaveGoals}
              disabled={!hasGoalsChanges || editingGoals.some((g) => g.goal.trim() === '')}
            >
              {t('general.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelGoalsEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto px-1">
          {editingGoals.map((goal, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`goal-${index + 1}`}>
                {t('athletes.profile.goalNumber', { number: index + 1 })}
              </Label>
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 flex-1">
                  <Input
                    id={`goal-${index + 1}`}
                    ref={index === 0 ? firstGoalInputRef : null}
                    value={goal.goal}
                    onChange={(e) => handleGoalChange(index, e.target.value)}
                    placeholder={t('athletes.profile.goalPlaceholder')}
                    autoFocus={false}
                    tabIndex={0}
                  />
                  <div className="flex flex-col gap-1 mt-1">
                    <Label htmlFor={`goal-date-${index + 1}`} className="text-[10px] text-muted-foreground uppercase px-1 font-semibold flex items-center">
                      {t('athletes.profile.targetDate')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id={`goal-date-${index + 1}`}
                          className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors h-8 text-xs px-3"
                          aria-label={t('athletes.profile.targetDate')}
                        >
                          <div className="flex items-center gap-2">
                            <span>{goal.targetDate ? format(parseISO(goal.targetDate), 'd MMM, yyyy') : t('general.select')}</span>
                          </div>
                          <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={goal.targetDate ? parseISO(goal.targetDate) : undefined}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          captionLayout="dropdown"
                          onSelect={(date) => handleDateChange(index, date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {editingGoals.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => handleRemoveGoal(index)}
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
            onClick={handleAddGoal}
            className="w-full gap-2"
            aria-label={t('athletes.profile.addGoal')}
          >
            <Plus className="h-4 w-4" />
            {t('athletes.profile.addGoal')}
          </Button>
        </div>
      </SidePanel>
    </>
  );
};

