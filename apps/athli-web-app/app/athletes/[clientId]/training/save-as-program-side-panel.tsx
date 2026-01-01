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
import { ChevronDownIcon, Info, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { createProgram, type ProgramData } from '@/api/coach/coach-program-service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PROGRAM_TYPES = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'power', label: 'Power' },
  { value: 'athletic_performance', label: 'Athletic Performance' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'sport_specific', label: 'Sport Specific' },
  { value: 'rehabilitation', label: 'Rehabilitation' },
  { value: 'combination', label: 'Combination' },
] as const;

const DIFFICULTY_LEVELS = [
  { value: 'all_levels', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

interface SaveAsProgramProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  workoutsByDate: {
    [dateKey: string]: Array<any>;
  };
}

export const SaveAsProgram: React.FC<SaveAsProgramProps> = ({ isOpen, onClose, clientId, workoutsByDate }) => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState<boolean>(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState<boolean>(false);
  const [programName, setProgramName] = useState<string>('');
  const [programType, setProgramType] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('all_levels');
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasWorkoutData, setHasWorkoutData] = useState<boolean>(true);

  // Error states
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [difficultyError, setDifficultyError] = useState<string | null>(null);
  const [fromDateError, setFromDateError] = useState<string | null>(null);
  const [toDateError, setToDateError] = useState<string | null>(null);

  const getDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate available dates based on the selected date (must be 7 days apart)
  const getAvailableDates = (selectedDate: Date | undefined, isFrom: boolean): ((date: Date) => boolean) => {
    // If no date is selected in the opposite field, allow all dates
    if (!selectedDate) return () => false; // Return false to enable all dates

    return (date: Date) => {
      const daysDiff = Math.abs(Math.floor((date.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Must be exactly divisible by 7 (1 week apart)
      if (daysDiff % 7 !== 0) return true; // Return true to disable

      // If we're selecting "from", ensure it's before the "to" date
      if (isFrom) {
        return date >= selectedDate; // Disable dates on or after the "to" date
      }

      // If we're selecting "to", ensure it's after the "from" date
      if (!isFrom) {
        return date <= selectedDate; // Disable dates on or before the "from" date
      }

      return false; // Enable the date
    };
  };

  // Check if workout data exists for the date range
  useEffect(() => {
    if (!fromDate || !toDate) {
      setHasWorkoutData(true);
      return;
    }

    // Get all dates in the range
    const currentDate = new Date(fromDate);
    const endDate = new Date(toDate);
    let hasData = false;

    while (currentDate <= endDate) {
      const dateKey = getDateKey(currentDate);
      const workoutsForDate = workoutsByDate[dateKey] || [];
      if (workoutsForDate.length > 0 && (workoutsForDate[0].workout_data || workoutsForDate[0].schema)) {
        hasData = true;
        break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setHasWorkoutData(hasData);
  }, [fromDate, toDate, workoutsByDate]);

  const handleClose = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setProgramName('');
    setProgramType('');
    setDifficulty('all_levels');
    setDescription('');
    setNameError(null);
    setTypeError(null);
    setDifficultyError(null);
    setFromDateError(null);
    setToDateError(null);
    setIsSaving(false);
    onClose();
  };

  // Check if form is valid
  const isFormValid =
    fromDate !== undefined &&
    toDate !== undefined &&
    programName.trim() !== '' &&

    hasWorkoutData;

  const handleSave = async () => {
    // Validation
    let hasError = false;

    if (!fromDate) {
      setFromDateError(t('athletes.trainingCalendar.saveAsProgram.errors.fromDateRequired'));
      hasError = true;
    } else {
      setFromDateError(null);
    }

    if (!toDate) {
      setToDateError(t('athletes.trainingCalendar.saveAsProgram.errors.toDateRequired'));
      hasError = true;
    } else {
      setToDateError(null);
    }

    if (!programName.trim()) {
      setNameError(t('athletes.trainingCalendar.saveAsProgram.errors.nameRequired'));
      hasError = true;
    } else {
      setNameError(null);
    }

    // Type is optional now
    // if (!programType) {
    //   setTypeError(t('athletes.trainingCalendar.saveAsProgram.errors.typeRequired'));
    //   hasError = true;
    // } else {
    //   setTypeError(null);
    // }



    if (hasError) return;

    // Calculate the number of weeks
    const daysDiff = Math.floor((toDate!.getTime() - fromDate!.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(daysDiff / 7) + 1;

    // Build the program schema from the date range
    const schema: Array<{ day: number; workouts: string[] }> = [];
    const currentDate = new Date(fromDate!);
    let dayNumber = 1;

    while (currentDate <= toDate!) {
      const dateKey = getDateKey(currentDate);
      const workoutsForDate = workoutsByDate[dateKey] || [];

      if (workoutsForDate.length > 0) {
        // Get workout IDs for this day
        const workoutIds = workoutsForDate.map((w: any) => w.workout_id || w.id).filter(Boolean);
        if (workoutIds.length > 0) {
          schema.push({
            day: dayNumber,
            workouts: workoutIds
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }

    if (schema.length === 0) {
      toast.error(t('athletes.trainingCalendar.saveAsProgram.errors.noWorkoutFound'));
      return;
    }

    setIsSaving(true);
    try {
      const programData: ProgramData = {
        name: programName,
        type: programType,
        difficulty: difficulty,
        weeks: weeks.toString(),
        description: description,
        schema: schema,
      };

      await createProgram(programData);

      // Invalidate coach programs cache
      queryClient.invalidateQueries({ queryKey: ['coach-programs'] });

      toast.success(t('athletes.trainingCalendar.saveAsProgram.success'));
      handleClose();
    } catch (error) {
      console.error('Failed to save program:', error);
      toast.error(t('athletes.trainingCalendar.saveAsProgram.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={t('athletes.trainingCalendar.saveAsProgram.title')}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            {t('general.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !isFormValid} className="gap-2">
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {isSaving ? t('general.saving') : t('general.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Date Range Pickers */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium flex items-center gap-[0.1px]">
            Please select the range you wish to use
            <RequiredAsterisk />
          </Label>
          <div className="flex gap-4">
            {/* From Date */}
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="from-date" className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-[0.1px]">
                  {t('athletes.trainingCalendar.saveAsProgram.fromDate')}
                </Label>
                {fromDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate(undefined);
                      if (fromDateError) setFromDateError(null);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mr-1"
                    title={t('general.clearSelection')}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{t('general.clear')}</span>
                  </button>
                )}
              </div>
              <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="from-date"
                    className={cn(
                      'w-full justify-between font-normal bg-sidebar border-muted-foreground/20 transition-colors',
                      fromDateError && 'border-destructive'
                    )}
                    aria-label={t('athletes.trainingCalendar.saveAsProgram.selectFromDateAria')}
                  >
                    <span className="text-sm">
                      {fromDate ? fromDate.toLocaleDateString() : t('athletes.trainingCalendar.saveAsProgram.selectDatePlaceholder')}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fromDate}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={currentYear + 2}
                    onSelect={(date) => {
                      setFromDate(date);
                      setIsFromCalendarOpen(false);
                      if (fromDateError) setFromDateError(null);
                    }}
                    disabled={getAvailableDates(toDate, true)}
                  />
                </PopoverContent>
              </Popover>
              {fromDateError && <p className="text-sm text-destructive">{fromDateError}</p>}
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="to-date" className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-[0.1px]">
                  {t('athletes.trainingCalendar.saveAsProgram.toDate')}
                </Label>
                {toDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setToDate(undefined);
                      if (toDateError) setToDateError(null);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mr-1"
                    title={t('general.clearSelection')}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{t('general.clear')}</span>
                  </button>
                )}
              </div>
              <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="to-date"
                    className={cn(
                      'w-full justify-between font-normal bg-sidebar border-muted-foreground/20 transition-colors',
                      toDateError && 'border-destructive'
                    )}
                    aria-label={t('athletes.trainingCalendar.saveAsProgram.selectToDateAria')}
                  >
                    <span className="text-sm">
                      {toDate ? toDate.toLocaleDateString() : t('athletes.trainingCalendar.saveAsProgram.selectDatePlaceholder')}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={toDate}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={currentYear + 2}
                    onSelect={(date) => {
                      setToDate(date);
                      setIsToCalendarOpen(false);
                      if (toDateError) setToDateError(null);
                    }}
                    disabled={getAvailableDates(fromDate, false)}
                  />
                </PopoverContent>
              </Popover>
              {toDateError && <p className="text-sm text-destructive">{toDateError}</p>}
            </div>
          </div>
        </div>

        {/* Alert for missing workout data */}
        {!hasWorkoutData && fromDate && toDate && (
          <Alert className="bg-primary/5 border-primary/20 text-primary">
            <Info className="size-4" />
            <AlertDescription className="min-w-0 line-clamp-4">
              No training data found between <strong>{fromDate.toLocaleDateString()}</strong> and <strong>{toDate.toLocaleDateString()}</strong>. Please select a date range with existing workout data.
            </AlertDescription>
          </Alert>
        )}

        {/* Program Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="program-name" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('programs.addProgram.programName')}
            <RequiredAsterisk />
          </Label>
          <Input
            id="program-name"
            type="text"
            placeholder={t('programs.addProgram.programNamePlaceholder')}
            value={programName}
            onChange={(e) => {
              setProgramName(e.target.value);
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

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="program-difficulty" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('programs.addProgram.difficulty')}
          </Label>
          <Select
            value={difficulty}
            onValueChange={(value) => {
              setDifficulty(value);
              if (difficultyError) setDifficultyError(null);
            }}
          >
            <SelectTrigger
              id="program-difficulty"
              className={cn(
                'w-full',
                difficultyError && 'border-destructive aria-invalid:border-destructive'
              )}
              aria-invalid={!!difficultyError}
            >
              <SelectValue placeholder={t('programs.addProgram.difficultyPlaceholder')} />
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

        {/* Program Type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="program-type" className="text-sm font-medium flex items-center gap-[0.1px]">
            {t('programs.addProgram.type')}
          </Label>
          <Select
            value={programType}
            onValueChange={(value) => {
              setProgramType(value);
              if (typeError) setTypeError(null);
            }}
          >
            <SelectTrigger
              id="program-type"
              className={cn(
                'w-full',
                typeError && 'border-destructive aria-invalid:border-destructive'
              )}
              aria-invalid={!!typeError}
            >
              <SelectValue placeholder={t('programs.addProgram.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {PROGRAM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError && <p className="text-sm text-destructive">{typeError}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="program-description" className="text-sm font-medium">
            {t('programs.addProgram.description')}{' '}
            <span className="text-muted-foreground font-normal">
              {t('programs.addProgram.descriptionOptional')}
            </span>
          </Label>
          <Textarea
            id="program-description"
            placeholder={t('programs.addProgram.descriptionPlaceholder')}
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
