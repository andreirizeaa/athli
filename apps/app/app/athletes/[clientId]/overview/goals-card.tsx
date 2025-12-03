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
import { getAthleteGoals, saveAthleteGoals } from '@/lib/athletes/athlete-service';

type GoalsCardProps = {
  clientId: string;
};

export const GoalsCard = ({ clientId }: GoalsCardProps) => {
  const t = useTranslations();
  const [goals, setGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditGoalsOpen, setIsEditGoalsOpen] = useState(false);
  const [editingGoals, setEditingGoals] = useState<string[]>(['']);
  const [hasGoalsChanges, setHasGoalsChanges] = useState(false);
  const firstGoalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const fetchedGoals = await getAthleteGoals(clientId);
        setGoals(fetchedGoals);
        setEditingGoals(fetchedGoals.length > 0 ? fetchedGoals : ['']);
      } catch (error) {
        console.error('Failed to fetch goals:', error);
        setGoals([]);
        setEditingGoals(['']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, [clientId]);

  useEffect(() => {
    if (isEditGoalsOpen && firstGoalInputRef.current) {
      setTimeout(() => {
        firstGoalInputRef.current?.focus();
      }, 100);
    }
  }, [isEditGoalsOpen]);

  useEffect(() => {
    const goalsString = goals.join('|');
    const editingString = editingGoals.join('|');
    setHasGoalsChanges(editingString !== goalsString);
  }, [editingGoals, goals]);

  const handleSaveGoals = async () => {
    if (!clientId) return;

    try {
      const filteredGoals = editingGoals.filter((goal) => goal.trim() !== '');
      await saveAthleteGoals(clientId, filteredGoals);
      setGoals(filteredGoals);
      setHasGoalsChanges(false);
      setIsEditGoalsOpen(false);
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };

  const handleCancelGoalsEdit = () => {
    setEditingGoals(goals.length > 0 ? goals : ['']);
    setHasGoalsChanges(false);
    setIsEditGoalsOpen(false);
  };

  const handleEditGoals = () => {
    setEditingGoals(goals.length > 0 ? goals : ['']);
    setHasGoalsChanges(false);
    setIsEditGoalsOpen(true);
  };

  const handleAddGoal = () => {
    setEditingGoals([...editingGoals, '']);
  };

  const handleRemoveGoal = (index: number) => {
    if (editingGoals.length > 1) {
      setEditingGoals(editingGoals.filter((_, i) => i !== index));
    }
  };

  const handleGoalChange = (index: number, value: string) => {
    const updated = [...editingGoals];
    updated[index] = value;
    setEditingGoals(updated);
  };

  return (
    <>
      <Card className="bg-background flex flex-col w-full flex-1 min-h-0" style={{ height: '240px', minHeight: '240px', maxHeight: '240px' }}>
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
                  variant="secondary"
                  className="!whitespace-normal break-words max-w-full cursor-pointer hover:bg-secondary/80 transition-colors p-2 !rounded-md"
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
                  <span className="break-words">{goal}</span>
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
            <Button onClick={handleSaveGoals} disabled={!hasGoalsChanges}>
              {t('general.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelGoalsEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto">
          {editingGoals.map((goal, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`goal-${index + 1}`}>
                {t('athletes.profile.goalNumber', { number: index + 1 })}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`goal-${index + 1}`}
                  ref={index === 0 ? firstGoalInputRef : null}
                  value={goal}
                  onChange={(e) => handleGoalChange(index, e.target.value)}
                  placeholder={t('athletes.profile.goalPlaceholder')}
                  autoFocus={false}
                  tabIndex={0}
                />
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

