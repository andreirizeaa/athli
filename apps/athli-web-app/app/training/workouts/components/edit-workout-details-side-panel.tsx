'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SidePanel } from '@/components/app/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { toast } from 'sonner';
import { cn } from '@/lib/general/utils';

const WORKOUT_TYPES = [
    { value: 'weightlifting', label: 'Weightlifting' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'hiit', label: 'HIIT' },
    { value: 'crossfit', label: 'CrossFit' },
    { value: 'running', label: 'Running' },
    { value: 'cycling', label: 'Cycling' },
    { value: 'swimming', label: 'Swimming' },
    { value: 'yoga', label: 'Yoga' },
    { value: 'pilates', label: 'Pilates' },
    { value: 'combination', label: 'Combination' },
] as const;

const DIFFICULTY_LEVELS = [
    { value: 'all_levels', label: 'All levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
] as const;

type EditWorkoutDetailsSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workoutMeta: {
        title: string;
        type: string;
        difficulty: string;
        description: string;
    };
    onSave: (data: { title: string; type: string; difficulty: string; description: string }) => Promise<void>;
    onDelete?: () => void; // Optional, only for existing workouts
};

export const EditWorkoutDetailsSidePanel = ({
    open,
    onOpenChange,
    workoutMeta,
    onSave,
    onDelete,
}: EditWorkoutDetailsSidePanelProps) => {
    const t = useTranslations();
    const [title, setTitle] = useState(workoutMeta.title);
    const [type, setType] = useState(workoutMeta.type);
    const [difficulty, setDifficulty] = useState(workoutMeta.difficulty);
    const [description, setDescription] = useState(workoutMeta.description);
    const [isSaving, setIsSaving] = useState(false);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [typeError, setTypeError] = useState<string | null>(null);
    const [difficultyError, setDifficultyError] = useState<string | null>(null);

    // Track original values to detect changes
    const [originalValues, setOriginalValues] = useState({
        title: workoutMeta.title,
        type: workoutMeta.type,
        difficulty: workoutMeta.difficulty,
        description: workoutMeta.description,
    });

    useEffect(() => {
        if (open) {
            setTitle(workoutMeta.title);
            setType(workoutMeta.type);
            setDifficulty(workoutMeta.difficulty);
            setDescription(workoutMeta.description);
            setOriginalValues({
                title: workoutMeta.title,
                type: workoutMeta.type,
                difficulty: workoutMeta.difficulty,
                description: workoutMeta.description,
            });
            setTitleError(null);
            setTypeError(null);
            setDifficultyError(null);
        }
    }, [open, workoutMeta]);

    // Check if values have changed
    const hasChanges =
        title !== originalValues.title ||
        type !== originalValues.type ||
        difficulty !== originalValues.difficulty ||
        description !== originalValues.description;

    // Check if form is valid (all required fields filled)
    const isFormValid = title.trim() !== '' && type.trim() !== '' && difficulty.trim() !== '';

    // Save button should be enabled only if there are changes AND form is valid
    const isSaveEnabled = hasChanges && isFormValid && !isSaving;

    const handleSave = async () => {
        if (!title.trim()) {
            setTitleError(t('library.workoutNameRequired'));
            return;
        }
        if (!type.trim()) {
            setTypeError(t('library.workoutTypeRequired'));
            return;
        }
        if (!difficulty.trim()) {
            setDifficultyError(t('library.difficultyRequired'));
            return;
        }

        try {
            setIsSaving(true);
            await onSave({ title, type, difficulty, description });
            // Update original values after successful save
            setOriginalValues({
                title,
                type,
                difficulty,
                description,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save workout details:', error);
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={onOpenChange}
            title="Edit Workout Details"
            onOpenAutoFocus={(e) => e.preventDefault()}
            footer={
                <div className="flex w-full justify-start gap-2">
                    <Button onClick={handleSave} disabled={!isSaveEnabled}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    {onDelete && (
                        <Button
                            variant="outline"
                            onClick={onDelete}
                        >
                            Delete
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="workout-title" className="text-sm font-medium">
                            {t('workouts.addWorkout.workoutName')}<RequiredAsterisk />
                        </label>
                        <Input
                            id="workout-title"
                            type="text"
                            placeholder={t('workouts.addWorkout.workoutNamePlaceholder')}
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (titleError) {
                                    setTitleError(null);
                                }
                            }}
                            className={cn(
                                'w-full',
                                titleError && 'border-destructive aria-invalid:border-destructive'
                            )}
                            aria-invalid={!!titleError}
                        />
                        {titleError && <p className="text-sm text-destructive">{titleError}</p>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="workout-type" className="text-sm font-medium">
                            {t('workouts.addWorkout.type')}<RequiredAsterisk />
                        </label>
                        <Select
                            value={type}
                            onValueChange={(value) => {
                                setType(value);
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
                                {WORKOUT_TYPES.map((workoutType) => (
                                    <SelectItem key={workoutType.value} value={workoutType.value}>
                                        {workoutType.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {typeError && <p className="text-sm text-destructive">{typeError}</p>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="workout-difficulty" className="text-sm font-medium">
                            {t('workouts.addWorkout.difficulty')}<RequiredAsterisk />
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
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="workout-description" className="text-sm font-medium">
                        {t('workouts.addWorkout.description')} <span className="text-muted-foreground font-normal">{t('workouts.addWorkout.descriptionOptional')}</span>
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
            </div>
        </SidePanel>
    );
};
