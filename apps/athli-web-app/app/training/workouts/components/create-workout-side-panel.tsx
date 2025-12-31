'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Spinner } from '@/components/ui/spinner';
import { createWorkout } from '@/api/coach/coach-workout-service';
import { toast } from 'sonner';
import { useTrainingData } from '../../training-data-context';
import { BasicInformation } from '../new/basic-information';
import { DIFFICULTY_LEVELS } from '@/lib/constants/training';
import { Check } from 'lucide-react';
import type { WorkoutPayload } from '../new/workout-schema';

interface CreateWorkoutSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: WorkoutPayload;
    onSuccess?: () => void;
}

export const CreateWorkoutSidePanel = ({ open, onOpenChange, initialData, onSuccess }: CreateWorkoutSidePanelProps) => {
    const t = useTranslations();
    const { refreshWorkouts } = useTrainingData();

    const [newWorkoutName, setNewWorkoutName] = useState<string>('');
    const [newWorkoutType, setNewWorkoutType] = useState<string>('');
    const [newDifficulty, setNewDifficulty] = useState<string>('');
    const [newDescription, setNewDescription] = useState<string>('');
    const [newNameError, setNewNameError] = useState<string | null>(null);
    const [newTypeError, setNewTypeError] = useState<string | null>(null);
    const [newDifficultyError, setNewDifficultyError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    React.useEffect(() => {
        if (open && initialData) {
            setNewWorkoutName(initialData.title ? `${initialData.title} Copy` : '');
            setNewWorkoutType(initialData.type || '');
            setNewDifficulty(initialData.difficulty || 'all_levels');
            setNewDescription(initialData.description || '');
        }
    }, [open, initialData]);

    const resetCreateWorkoutState = () => {
        setNewWorkoutName('');
        setNewWorkoutType('');
        setNewDifficulty('');
        setNewDescription('');
        setNewNameError(null);
        setNewTypeError(null);
        setNewDifficultyError(null);
        setIsSaving(false);
    };

    const handleSave = async () => {
        // Validate required fields
        if (!newWorkoutName.trim()) {
            setNewNameError(t('library.workoutNameRequired'));
            return;
        }
        // Difficulty is optional, no validation needed

        // Create workout directly
        const meta: any = {
            title: newWorkoutName.trim(),
            description: newDescription.trim(),
            type: newWorkoutType.toLowerCase().replace(/\s+/g, '_'),
            difficulty: newDifficulty.toLowerCase().replace(/\s+/g, '_'),
            equipment: initialData?.equipment || [],
            totalExercises: initialData?.totalExercises || 0,
            ...(initialData?.items ? { items: initialData.items } : {
                items: []
            })
        };

        setIsSaving(true);
        try {
            await createWorkout(meta);
            toast.success(t('workouts.new.toast.savedSuccessfully'), {
                style: {
                    background: 'rgb(220 252 231)',
                    color: 'rgb(20 83 45)',
                    border: '1px solid rgb(187 247 208)',
                },
            });
            await refreshWorkouts();
            if (onSuccess) {
                onSuccess();
            } else {
                onOpenChange(false);
            }
            resetCreateWorkoutState();
        } catch (error) {
            console.error('Failed to create workout:', error);
            toast.error(t('general.error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen && !isSaving) {
                    onOpenChange(isOpen);
                    resetCreateWorkoutState();
                }
            }}
            onOpenAutoFocus={(e) => e.preventDefault()}
            title={t('library.newWorkout')}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        aria-label={t('library.cancelCreatingWorkout')}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !newWorkoutName.trim()}
                        aria-label={t('general.save')}
                        className="gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Spinner className="size-4" />
                                {t('general.save')}
                            </>
                        ) : (
                            <>
                                <Check className="size-4" />
                                {t('general.save')}
                            </>
                        )}
                    </Button>
                </div>
            }
        >
            <BasicInformation
                workoutName={newWorkoutName}
                setWorkoutName={setNewWorkoutName}
                workoutType={newWorkoutType}
                setWorkoutType={setNewWorkoutType}
                difficulty={newDifficulty}
                setDifficulty={setNewDifficulty}
                description={newDescription}
                setDescription={setNewDescription}
                nameError={newNameError}
                setNameError={setNewNameError}
                typeError={newTypeError}
                setTypeError={setNewTypeError}
                difficultyError={newDifficultyError}
                setDifficultyError={setNewDifficultyError}
                selectedBuilder={null}
                setSelectedBuilder={() => { }}
            />
        </SidePanel>
    );
};
