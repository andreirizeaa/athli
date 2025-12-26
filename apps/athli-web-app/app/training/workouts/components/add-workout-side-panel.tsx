'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SidePanel } from '@/components/app/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/general/utils';

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

type AddWorkoutSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: { title: string; type: string; difficulty: string; description: string }) => Promise<void>;
};

export const AddWorkoutSidePanel = ({
    open,
    onOpenChange,
    onSave,
}: AddWorkoutSidePanelProps) => {
    const t = useTranslations();
    const [title, setTitle] = useState('');
    const [type, setType] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [typeError, setTypeError] = useState<string | null>(null);
    const [difficultyError, setDifficultyError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setTitle('');
            setType('');
            setDifficulty('');
            setDescription('');
            setTitleError(null);
            setTypeError(null);
            setDifficultyError(null);
        }
    }, [open]);

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
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save workout details:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={onOpenChange}
            title={t('workouts.addWorkout.title')}
            footer={
                <div className="flex w-full justify-start gap-2">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? t('general.saving') : t('library.continue')}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        {t('general.cancel')}
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
                                    <SelectItem key={workoutType} value={workoutType}>
                                        {workoutType}
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
                                    <SelectItem key={level} value={level.toLowerCase()}>
                                        {level}
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
