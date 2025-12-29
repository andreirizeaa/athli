'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SidePanel } from '@/components/app/side-panel';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { toast } from 'sonner';
import { cn } from '@/lib/general/utils';

import { DIFFICULTY_LEVELS, PROGRAM_TYPES } from '@/lib/constants/training';



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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Track original values to detect changes
    const [originalValues, setOriginalValues] = useState({
        name: programMeta.name,
        type: programMeta.type,
        difficulty: programMeta.difficulty,
        description: programMeta.description,
    });

    useEffect(() => {
        if (open) {
            setName(programMeta.name);
            setType(programMeta.type);
            setDifficulty(programMeta.difficulty);
            setDescription(programMeta.description);
            setOriginalValues({
                name: programMeta.name,
                type: programMeta.type,
                difficulty: programMeta.difficulty,
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
        <>
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
                                onClick={() => setIsDeleteDialogOpen(true)}
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
                            {t('programs.addProgram.description')}
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
            <ConfirmDeleteDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={() => {
                    setIsDeleteDialogOpen(false);
                    onDelete?.();
                }}
                itemName={name}
                itemType="program"
            />
        </>
    );
};
