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

// Helper to normalize legacy values to snake_case format
const normalizeValue = (value: string, options: readonly { value: string; label: string }[]): string => {
    if (!value) return '';

    // Check if value already exists in our options
    const existingOption = options.find(opt => opt.value === value.toLowerCase());
    if (existingOption) return existingOption.value;

    // Try to match by label (case-insensitive)
    const matchByLabel = options.find(opt => opt.label.toLowerCase() === value.toLowerCase());
    if (matchByLabel) return matchByLabel.value;

    // Convert to snake_case as fallback
    return value.toLowerCase().replace(/\s+/g, '_');
};

type EditProgramDetailsSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    programMeta: {
        name: string;
        type: string;
        difficulty: string;
        description: string;
    };
    onSave: (data: { name: string; type: string; difficulty: string; description: string }) => Promise<void>;
    onDelete?: () => void; // Optional, only for existing programs
};

export const EditProgramDetailsSidePanel = ({
    open,
    onOpenChange,
    programMeta,
    onSave,
    onDelete,
}: EditProgramDetailsSidePanelProps) => {
    const t = useTranslations();
    const [name, setName] = useState(programMeta.name);
    const [type, setType] = useState(programMeta.type);
    const [difficulty, setDifficulty] = useState(programMeta.difficulty);
    const [description, setDescription] = useState(programMeta.description);
    const [isSaving, setIsSaving] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [typeError, setTypeError] = useState<string | null>(null);
    const [difficultyError, setDifficultyError] = useState<string | null>(null);

    // Track original values to detect changes
    const [originalValues, setOriginalValues] = useState({
        name: programMeta.name,
        type: programMeta.type,
        difficulty: programMeta.difficulty,
        description: programMeta.description,
    });

    useEffect(() => {
        if (open) {
            // Normalize values to ensure they match our value/label structure
            const normalizedType = normalizeValue(programMeta.type, PROGRAM_TYPES);
            const normalizedDifficulty = normalizeValue(programMeta.difficulty, DIFFICULTY_LEVELS);

            setName(programMeta.name);
            setType(normalizedType);
            setDifficulty(normalizedDifficulty);
            setDescription(programMeta.description);
            setOriginalValues({
                name: programMeta.name,
                type: normalizedType,
                difficulty: normalizedDifficulty,
                description: programMeta.description,
            });
            setNameError(null);
            setTypeError(null);
            setDifficultyError(null);
        }
    }, [open, programMeta]);

    // Check if values have changed
    const hasChanges =
        name !== originalValues.name ||
        type !== originalValues.type ||
        difficulty !== originalValues.difficulty ||
        description !== originalValues.description;

    // Check if form is valid (all required fields filled)
    const isFormValid = name.trim() !== '' && type.trim() !== '' && difficulty.trim() !== '';

    // Save button should be enabled only if there are changes AND form is valid
    const isSaveEnabled = hasChanges && isFormValid && !isSaving;

    const handleSave = async () => {
        if (!name.trim()) {
            setNameError(t('library.programNameRequired'));
            return;
        }
        if (!type.trim()) {
            setTypeError(t('library.programTypeRequired'));
            return;
        }
        if (!difficulty.trim()) {
            setDifficultyError(t('library.difficultyRequired'));
            return;
        }

        try {
            setIsSaving(true);
            await onSave({ name, type, difficulty, description });
            // Update original values after successful save
            setOriginalValues({
                name,
                type,
                difficulty,
                description,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save program details:', error);
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SidePanel
            open={open}
            onOpenChange={onOpenChange}
            title="Edit Program Details"
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
                        <label htmlFor="program-name" className="text-sm font-medium">
                            {t('programs.addProgram.programName')}<RequiredAsterisk />
                        </label>
                        <Input
                            id="program-name"
                            type="text"
                            placeholder={t('programs.addProgram.programNamePlaceholder')}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
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
                        <label htmlFor="program-type" className="text-sm font-medium">
                            {t('programs.addProgram.type')}<RequiredAsterisk />
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
                                {PROGRAM_TYPES.map((programType) => (
                                    <SelectItem key={programType.value} value={programType.value}>
                                        {programType.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {typeError && <p className="text-sm text-destructive">{typeError}</p>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="program-difficulty" className="text-sm font-medium">
                            {t('programs.addProgram.difficulty')}<RequiredAsterisk />
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
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="program-description" className="text-sm font-medium">
                        {t('programs.addProgram.description')} <span className="text-muted-foreground font-normal">{t('programs.addProgram.descriptionOptional')}</span>
                    </label>
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
