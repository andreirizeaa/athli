'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/general/utils';

import { WORKOUT_TYPES, DIFFICULTY_LEVELS } from '@athli/shared-types';

type BasicInformationProps = {
  workoutName: string;
  setWorkoutName: (value: string) => void;
  workoutType: string;
  setWorkoutType: (value: string) => void;
  difficulty: string;
  setDifficulty: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  nameError: string | null;
  setNameError: (error: string | null) => void;
  typeError: string | null;
  setTypeError: (error: string | null) => void;
  difficultyError: string | null;
  setDifficultyError: (error: string | null) => void;
  selectedBuilder: 'standard' | 'ai' | null;
  setSelectedBuilder: (builder: 'standard' | 'ai' | null) => void;
};

export const BasicInformation = ({
  workoutName,
  setWorkoutName,
  workoutType,
  setWorkoutType,
  difficulty,
  setDifficulty,
  description,
  setDescription,
  nameError,
  setNameError,
  typeError,
  setTypeError,
  difficultyError,
  setDifficultyError,
  selectedBuilder,
  setSelectedBuilder,
}: BasicInformationProps) => {
  const t = useTranslations();

  const handleStandardBuilderClick = () => {
    setSelectedBuilder('standard');
  };

  const handleAIBuilderClick = () => {
    setSelectedBuilder('ai');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="workout-name" className="text-sm font-medium">
            {t('workouts.addWorkout.workoutName')}<RequiredAsterisk />
          </label>
          <Input
            id="workout-name"
            type="text"
            placeholder={t('workouts.addWorkout.workoutNamePlaceholder')}
            value={workoutName}
            onChange={(e) => {
              setWorkoutName(e.target.value);
              if (nameError) {
                setNameError(null);
              }
            }}
            className={cn(
              'w-full',
              nameError && 'border-destructive aria-invalid:border-destructive'
            )}
            aria-invalid={!!nameError}
          />
          {nameError && <p className="text-sm text-destructive">{nameError}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="workout-difficulty" className="text-sm font-medium">
            {t('workouts.addWorkout.difficulty')}
          </label>
          <Select
            value={difficulty}
            onValueChange={(value) => {
              setDifficulty(value);
              if (difficultyError) {
                setDifficultyError(null);
              }
            }}
          >
            <SelectTrigger
              id="workout-difficulty"
              className={cn(
                'w-full',
                difficultyError && 'border-destructive aria-invalid:border-destructive'
              )}
              aria-invalid={!!difficultyError}
            >
              <SelectValue placeholder={t('workouts.addWorkout.difficultyPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {difficultyError && <p className="text-sm text-destructive">{difficultyError}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="workout-type" className="text-sm font-medium">
            {t('workouts.addWorkout.type')}
          </label>
          <Select
            value={workoutType}
            onValueChange={(value) => {
              setWorkoutType(value);
              if (typeError) {
                setTypeError(null);
              }
            }}
          >
            <SelectTrigger
              id="workout-type"
              className={cn(
                'w-full',
                typeError && 'border-destructive aria-invalid:border-destructive'
              )}
              aria-invalid={!!typeError}
            >
              <SelectValue placeholder={t('workouts.addWorkout.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError && <p className="text-sm text-destructive">{typeError}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="workout-description" className="text-sm font-medium">
          {t('workouts.addWorkout.description')}
        </label>
        <Textarea
          id="workout-description"
          placeholder={t('workouts.addWorkout.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
      {selectedBuilder !== null && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t('workouts.addWorkout.selectBuilder')}<RequiredAsterisk />
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleAIBuilderClick}
              className={cn(
                'relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left',
                selectedBuilder === 'ai'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'bg-background hover:bg-accent/30'
              )}
              aria-label={t('workouts.addWorkout.athliAiAria')}
            >
              <p className="text-sm font-semibold mb-1">{t('workouts.addWorkout.athliAi')}</p>
              <p
                className={cn(
                  'text-xs',
                  selectedBuilder === 'ai' ? 'text-foreground/80' : 'text-muted-foreground'
                )}
              >
                {t('workouts.addWorkout.athliAiDescription')}
              </p>
              <div
                aria-hidden="true"
                className={cn(
                  'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                  selectedBuilder === 'ai'
                    ? 'border-primary bg-primary/10'
                    : 'border-input bg-background'
                )}
              >
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    selectedBuilder === 'ai' ? 'bg-primary' : 'bg-transparent'
                  )}
                />
              </div>
            </button>
            <button
              type="button"
              onClick={handleStandardBuilderClick}
              className={cn(
                'relative h-24 rounded-lg border border-input p-4 flex flex-col items-start justify-center gap-1.5 transition-colors text-left',
                selectedBuilder === 'standard'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'bg-background hover:bg-accent/30'
              )}
              aria-label={t('workouts.addWorkout.standardBuilderAria')}
            >
              <p className="text-sm font-semibold mb-1">{t('workouts.addWorkout.standardBuilder')}</p>
              <p
                className={cn(
                  'text-xs',
                  selectedBuilder === 'standard' ? 'text-foreground/80' : 'text-muted-foreground'
                )}
              >
                {t('workouts.addWorkout.standardBuilderDescription')}
              </p>
              <div
                aria-hidden="true"
                className={cn(
                  'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2',
                  selectedBuilder === 'standard'
                    ? 'border-primary bg-primary/10'
                    : 'border-input bg-background'
                )}
              >
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    selectedBuilder === 'standard' ? 'bg-primary' : 'bg-transparent'
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
