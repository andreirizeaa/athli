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
import { Check, Loader2, Trash2 } from 'lucide-react';

import { DIFFICULTY_LEVELS, PROGRAM_TYPES } from '@athli/shared-types';



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
    const [isDeleting, setIsDeleting] = useState(false);
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
            // Normalize difficulty value to snake_case if it comes as "All levels" or "all levels"
            let normalizedDifficulty = programMeta.difficulty;
            if (programMeta.difficulty.toLowerCase() === 'all levels') {
                normalizedDifficulty = 'all_levels';
            }
            setDifficulty(normalizedDifficulty);
            setDescription(programMeta.description);
            setOriginalValues({
                name: programMeta.name,
                type: programMeta.type,
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

    // Check if form is valid (all required fields filled - only name is required)
    const isFormValid = name.trim() !== '';

    // Save button should be enabled only if there are changes AND form is valid
    const isSaveEnabled = hasChanges && isFormValid && !isSaving;

    const handleSave = async () => {
        if (!name.trim()) {
            setNameError(t('library.programNameRequired'));
            return;
        }
        // Type and difficulty are optional

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
            toast.error(t('toasts.failedSaveChanges'));
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
                    <div className="flex w-full justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving || isDeleting}
                        >
                            {t('general.cancel') || 'Cancel'}
                        </Button>
                        {onDelete && (
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                disabled={isSaving || isDeleting}
                                className="gap-2"
                            >
                                {isDeleting ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Trash2 className="size-4" />
                                )}
                                {t('general.delete') || 'Delete'}
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={!isSaveEnabled || isDeleting}
                            className="gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {t('general.save') || 'Save'}
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
                            <label htmlFor="program-difficulty" className="text-sm font-medium">
                                {t('programs.addProgram.difficulty')}
                            </label>
                            <Select
                                value={difficulty}
                                onValueChange={(value) => {
                                    setDifficulty(value === '__clear__' ? '' : value);
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
                                    {difficulty && (
                                        <SelectItem value="__clear__" className="text-muted-foreground">
                                            {t('general.clear')}
                                        </SelectItem>
                                    )}
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
                            <label htmlFor="program-type" className="text-sm font-medium">
                                {t('programs.addProgram.type')}
                            </label>
                            <Select
                                value={type}
                                onValueChange={(value) => {
                                    setType(value === '__clear__' ? '' : value);
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
                                    {type && (
                                        <SelectItem value="__clear__" className="text-muted-foreground">
                                            {t('general.clear')}
                                        </SelectItem>
                                    )}
                                    {PROGRAM_TYPES.map((programType) => (
                                        <SelectItem key={programType.value} value={programType.value}>
                                            {programType.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {typeError && <p className="text-sm text-destructive">{typeError}</p>}
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
                onConfirm={async () => {
                    setIsDeleteDialogOpen(false);
                    setIsDeleting(true);
                    try {
                        await onDelete?.();
                    } finally {
                        setIsDeleting(false);
                    }
                }}
                itemName={name}
                itemType="program"
            />
        </>
    );
};
