'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Spinner } from '@/components/ui/spinner';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/general/utils';
import { createProgram } from '@/api/coach/coach-program-service';
import { toast } from 'sonner';
import { useTrainingData } from '../../training-data-context';
import { Check } from 'lucide-react';

import { PROGRAM_TYPES, DIFFICULTY_LEVELS } from '@/lib/constants/training';

interface CreateProgramSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CreateProgramSidePanel = ({ open, onOpenChange }: CreateProgramSidePanelProps) => {
    const t = useTranslations();
    const router = useRouter();
    const { refreshPrograms } = useTrainingData();

    const [newProgramName, setNewProgramName] = useState<string>('');
    const [newProgramType, setNewProgramType] = useState<string>('');
    const [newProgramDifficulty, setNewProgramDifficulty] = useState<string>('all_levels');
    const [newProgramWeeks, setNewProgramWeeks] = useState<string>('');
    const [newProgramDescription, setNewProgramDescription] = useState<string>('');
    const [newProgramError, setNewProgramError] = useState<string | null>(null);
    const [newProgramTypeError, setNewProgramTypeError] = useState<string | null>(null);
    const [newProgramDifficultyError, setNewProgramDifficultyError] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);

    const resetCreateProgramState = () => {
        setNewProgramName('');
        setNewProgramType('');
        setNewProgramDifficulty(DIFFICULTY_LEVELS[0].value);
        setNewProgramWeeks('');
        setNewProgramDescription('');
        setNewProgramError(null);
        setNewProgramTypeError(null);
        setNewProgramDifficultyError(null);
        setIsNavigating(false);
    };

    const handleCreateProgramContinue = async () => {
        if (!newProgramName.trim()) {
            setNewProgramError(t('programs.addProgram.programNameRequiredError'));
            return;
        }

        // Type is optional now
        // if (!newProgramType) {
        //     setNewProgramTypeError(t('programs.addProgram.programTypeRequiredError'));
        //     return;
        // }

        // Difficulty is optional now
        // if (!newProgramDifficulty) {
        //     setNewProgramDifficultyError(t('programs.addProgram.difficultyRequiredError'));
        //     return;
        // }

        setIsNavigating(true);

        const programData = {
            name: newProgramName.trim(),
            type: newProgramType,
            difficulty: newProgramDifficulty,
            weeks: newProgramWeeks || '1',
            description: newProgramDescription.trim(),
        };

        try {
            await createProgram(programData);
            toast.success(`Successfully created ${newProgramName}`);

            // Reload programs to show the new one
            await refreshPrograms();

            // Close side panel and reset state
            onOpenChange(false);
            resetCreateProgramState();
        } catch (error) {
            console.error('Failed to create program:', error);
            toast.error(t('programs.builder.saveFailed'));
        } finally {
            setIsNavigating(false);
        }
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen && !isNavigating) {
                    onOpenChange(isOpen);
                    resetCreateProgramState();
                }
            }}
            title={t('programs.addProgram.title')}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        aria-label={t('programs.addProgram.cancelAria')}
                    >
                        {t('programs.addProgram.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCreateProgramContinue}
                        disabled={
                            isNavigating ||
                            !newProgramName.trim()
                        }
                        aria-label={t('programs.addProgram.continueAria')}
                        className="gap-2"
                    >
                        {isNavigating ? <Spinner className="size-4" /> : <Check className="size-4" />}
                        <span>{t('programs.addProgram.continue')}</span>
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="program-name" className="text-sm font-medium">
                            {t('programs.addProgram.programName')}<RequiredAsterisk />
                        </label>
                        <Input
                            id="program-name"
                            type="text"
                            placeholder={t('programs.addProgram.programNamePlaceholder')}
                            value={newProgramName}
                            onChange={(event) => {
                                setNewProgramName(event.target.value);
                                if (newProgramError) {
                                    setNewProgramError(null);
                                }
                            }}
                            className="w-full"
                            aria-invalid={!!newProgramError}
                        />
                        {newProgramError && <p className="text-sm text-destructive">{newProgramError}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="program-difficulty" className="text-sm font-medium">
                            {t('programs.addProgram.difficulty')}
                        </label>
                        <Select
                            value={newProgramDifficulty}
                            onValueChange={(value) => {
                                setNewProgramDifficulty(value);
                                if (newProgramDifficultyError) {
                                    setNewProgramDifficultyError(null);
                                }
                            }}
                        >
                            <SelectTrigger
                                id="program-difficulty"
                                className={cn(
                                    'w-full',
                                    newProgramDifficultyError &&
                                    'border-destructive aria-invalid:border-destructive'
                                )}
                                aria-invalid={!!newProgramDifficultyError}
                            >
                                <SelectValue placeholder={t('general.select')} />
                            </SelectTrigger>
                            <SelectContent>
                                {DIFFICULTY_LEVELS.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {newProgramDifficultyError && (
                            <p className="text-sm text-destructive">{newProgramDifficultyError}</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="program-type" className="text-sm font-medium">
                            {t('programs.addProgram.type')}
                        </label>
                        <Select
                            value={newProgramType}
                            onValueChange={(value) => {
                                setNewProgramType(value);
                                if (newProgramTypeError) {
                                    setNewProgramTypeError(null);
                                }
                            }}
                        >
                            <SelectTrigger
                                id="program-type"
                                className={cn(
                                    'w-full',
                                    newProgramTypeError && 'border-destructive aria-invalid:border-destructive'
                                )}
                                aria-invalid={!!newProgramTypeError}
                            >
                                <SelectValue placeholder={t('general.select')} />
                            </SelectTrigger>
                            <SelectContent>
                                {PROGRAM_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {newProgramTypeError && (
                            <p className="text-sm text-destructive">{newProgramTypeError}</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="program-weeks" className="text-sm font-medium">
                            {t('programs.addProgram.weeks')}
                        </label>
                        <Input
                            id="program-weeks"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            placeholder={t('programs.addProgram.weeksPlaceholder')}
                            value={newProgramWeeks}
                            onChange={(event) => {
                                const value = event.target.value.replace(/[^0-9]/g, '');
                                setNewProgramWeeks(value);
                            }}
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="program-description" className="text-sm font-medium">
                        {t('programs.addProgram.description')}
                    </label>
                    <Textarea
                        id="program-description"
                        value={newProgramDescription}
                        onChange={(event) => setNewProgramDescription(event.target.value)}
                        placeholder={t('programs.addProgram.descriptionPlaceholder')}
                        rows={4}
                        className="resize-none"
                    />
                </div>
            </div>
        </SidePanel>
    );
};
