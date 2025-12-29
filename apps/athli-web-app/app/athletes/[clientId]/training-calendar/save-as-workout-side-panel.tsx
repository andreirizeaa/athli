'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SidePanel } from '@/components/app/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDownIcon, Info, X } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { createWorkout } from '@/api/coach/coach-workout-service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { WorkoutProgramPayload } from '@/app/training/workouts/new/workout-schema';

const WORKOUT_TYPES = [
  'Weightlifting',
  'Bodyweight',
  'Cardio',
  'HIIT',
  'CrossFit',
  'Running',
  'Cycling',
  'Swimming',
  'Yoga',
  'Pilates',
  'Combination',
] as const;

const DIFFICULTY_LEVELS = ['All levels', 'Beginner', 'Intermediate', 'Advanced'] as const;

interface SaveAsWorkoutProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  workoutsByDate: {
    [dateKey: string]: Array<any>;
  };
}

export const SaveAsWorkout: React.FC<SaveAsWorkoutProps> = ({ isOpen, onClose, clientId, workoutsByDate }) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [workoutName, setWorkoutName] = useState<string>('');
  const [workoutType, setWorkoutType] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasWorkoutData, setHasWorkoutData] = useState<boolean>(true);

  // Error states
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [difficultyError, setDifficultyError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const getDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if workout data exists for selected date
  useEffect(() => {
    if (!selectedDate) {
      setHasWorkoutData(true);
      return;
    }
    const dateKey = getDateKey(selectedDate);
    const workoutsForDate = workoutsByDate[dateKey] || [];
    const hasData = workoutsForDate.length > 0 && (workoutsForDate[0].workout_data || workoutsForDate[0].schema);
    setHasWorkoutData(hasData);
  }, [selectedDate, workoutsByDate]);

  const handleClose = () => {
    setSelectedDate(new Date());
    setWorkoutName('');
    setWorkoutType('');
    setDifficulty('');
    setDescription('');
    setNameError(null);
    setTypeError(null);
    setDifficultyError(null);
    setDateError(null);
    setIsSaving(false);
    onClose();
  };

  // Check if form is valid
  const isFormValid =
    selectedDate !== undefined &&
    workoutName.trim() !== '' &&
    workoutType !== '' &&
    difficulty !== '' &&
    hasWorkoutData;

  const handleSave = async () => {
    // Validation
    let hasError = false;

    if (!selectedDate) {
      setDateError(t('athletes.trainingCalendar.saveAsWorkout.errors.dateRequired'));
      hasError = true;
    } else {
      setDateError(null);
    }

    if (!workoutName.trim()) {
      setNameError(t('athletes.trainingCalendar.saveAsWorkout.errors.nameRequired'));
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!workoutType) {
      setTypeError(t('athletes.trainingCalendar.saveAsWorkout.errors.typeRequired'));
      hasError = true;
    } else {
      setTypeError(null);
    }

    if (!difficulty) {
      setDifficultyError(t('athletes.trainingCalendar.saveAsWorkout.errors.difficultyRequired'));
      hasError = true;
    } else {
      setDifficultyError(null);
    }

    if (hasError) return;

    // Get workout data from the selected date
    const dateKey = getDateKey(selectedDate!);
    const workoutsForDate = workoutsByDate[dateKey] || [];

    if (workoutsForDate.length === 0) {
      toast.error(t('athletes.trainingCalendar.saveAsWorkout.errors.noWorkoutFound'));
      return;
    }

    // Use the first workout from that date
    const clientWorkout = workoutsForDate[0];

    // Check if workout has the workout_data/schema
    if (!clientWorkout.workout_data && !clientWorkout.schema) {
      toast.error(t('athletes.trainingCalendar.saveAsWorkout.errors.workoutDataUnavailable'));
      return;
    }

    setIsSaving(true);
    try {
      const sections = clientWorkout.workout_data?.sections || clientWorkout.schema || [];
      const totalExercises = sections.reduce((acc: number, section: any) => {
        if (section.type === 'amrap' || section.type === 'timed') {
          return acc + (section.exercises?.length || 0);
        }
        return acc + (section.exercises?.reduce((groupAcc: number, group: any) => groupAcc + (group.exercises?.length || 0), 0) || 0);
      }, 0);

      // Create workout payload from client's workout data
      const workoutData: WorkoutProgramPayload = {
        title: workoutName,
        description: description,
        type: workoutType,
        difficulty: difficulty,
        equipment: clientWorkout.equipment || [],
        sections: sections,
        totalExercises: totalExercises,
        totalDurationMin: clientWorkout.workout_data?.totalDurationMin || 0,
      };

      await createWorkout(workoutData);

      // Invalidate coach workouts cache
      queryClient.invalidateQueries({ queryKey: ['coach-workouts'] });

      toast.success(t('athletes.trainingCalendar.saveAsWorkout.success'));
      handleClose();
    } catch (error) {
      console.error('Failed to save workout:', error);
      toast.error(t('athletes.trainingCalendar.saveAsWorkout.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={t('athletes.trainingCalendar.saveAsWorkout.title')}
      footer={
        <div className="flex w-full justify-start gap-2">
          <Button type="button" onClick={handleSave} disabled={isSaving || !isFormValid}>
            {isSaving ? t('general.saving') : t('general.save')}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            {t('general.cancel')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Date Picker */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-date" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('athletes.trainingCalendar.saveAsWorkout.selectDate')}
            <RequiredAsterisk />
          </Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="workout-date"
                className={cn(
                  'w-full justify-between font-normal bg-sidebar border-muted-foreground/20 transition-colors',
                  dateError && 'border-destructive'
                )}
                aria-label={t('athletes.trainingCalendar.saveAsWorkout.selectDateAria')}
              >
                <span className="text-sm">
                  {selectedDate ? selectedDate.toLocaleDateString() : t('athletes.trainingCalendar.saveAsWorkout.selectDatePlaceholder')}
                </span>
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={currentYear + 2}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsCalendarOpen(false);
                  if (dateError) setDateError(null);
                }}
              />
            </PopoverContent>
          </Popover>
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
        </div>

        {/* Alert for missing workout data */}
        {!hasWorkoutData && selectedDate && (
          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              No training data found for <strong>{selectedDate.toLocaleDateString()}</strong>. Please select a date with existing workout data.
            </AlertDescription>
          </Alert>
        )}

        {/* Workout Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-name" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('workouts.addWorkout.workoutName')}
            <RequiredAsterisk />
          </Label>
          <Input
            id="workout-name"
            type="text"
            placeholder={t('workouts.addWorkout.workoutNamePlaceholder')}
            value={workoutName}
            onChange={(e) => {
              setWorkoutName(e.target.value);
              if (nameError) setNameError(null);
            }}
            className={cn(
              'w-full',
              nameError && 'border-destructive aria-invalid:border-destructive'
            )}
            aria-invalid={!!nameError}
          />
          {nameError && <p className="text-sm text-destructive">{nameError}</p>}
        </div>

        {/* Workout Type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-type" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('workouts.addWorkout.type')}
            <RequiredAsterisk />
          </Label>
          <Select
            value={workoutType}
            onValueChange={(value) => {
              setWorkoutType(value);
              if (typeError) setTypeError(null);
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
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError && <p className="text-sm text-destructive">{typeError}</p>}
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-difficulty" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('workouts.addWorkout.difficulty')}
            <RequiredAsterisk />
          </Label>
          <Select
            value={difficulty}
            onValueChange={(value) => {
              setDifficulty(value);
              if (difficultyError) setDifficultyError(null);
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
                <SelectItem key={level} value={level.toLowerCase()}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {difficultyError && <p className="text-sm text-destructive">{difficultyError}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-description" className="text-sm font-medium">
            {t('workouts.addWorkout.description')}{' '}
            <span className="text-muted-foreground font-normal">
              {t('workouts.addWorkout.descriptionOptional')}
            </span>
          </Label>
          <Textarea
            id="workout-description"
            placeholder={t('workouts.addWorkout.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>
    </SidePanel>
  );
};
