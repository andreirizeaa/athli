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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/general/utils';
import { Check, Loader2, Trash2 } from 'lucide-react';

import { getSectionTypeOptions, type SectionType } from '../section-type-utils';

type EditSectionDetailsSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sectionMeta: {
        title: string;
        sectionType: SectionType;
        description: string;
    };
    onSave: (data: { title: string; sectionType: SectionType; description: string }) => Promise<void>;
    onDelete?: () => Promise<void>;
};

export const EditSectionDetailsSidePanel = ({
    open,
    onOpenChange,
    sectionMeta,
    onSave,
    onDelete,
}: EditSectionDetailsSidePanelProps) => {
    const t = useTranslations();
    const [title, setTitle] = useState(sectionMeta.title);
    const [sectionType, setSectionType] = useState<SectionType>(sectionMeta.sectionType);
    const [description, setDescription] = useState(sectionMeta.description);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Track original values to detect changes
    const [originalValues, setOriginalValues] = useState({
        title: sectionMeta.title,
        description: sectionMeta.description,
    });

    useEffect(() => {
        if (open) {
            setTitle(sectionMeta.title);
            setSectionType(sectionMeta.sectionType);
            setDescription(sectionMeta.description);
            setOriginalValues({
                title: sectionMeta.title,
                description: sectionMeta.description,
            });
            setTitleError(null);
        }
    }, [open, sectionMeta]);

    // Check if values have changed - ignore sectionType as it is disabled
    const hasChanges =
        title !== originalValues.title ||
        description !== originalValues.description;

    // Check if form is valid (all required fields filled)
    const isFormValid = title.trim() !== '';

    // Save button should be enabled only if there are changes AND form is valid
    const isSaveEnabled = hasChanges && isFormValid && !isSaving;

    const handleSave = async () => {
        if (!title.trim()) {
            setTitleError(t('library.sections.sectionNameRequired') || 'Section name is required');
            return;
        }

        try {
            setIsSaving(true);
            await onSave({ title, sectionType, description });
            // Update original values after successful save
            setOriginalValues({
                title,
                description,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save section details:', error);
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const sectionTypeOptions = getSectionTypeOptions();
    const selectedOption = sectionTypeOptions.find(opt => opt.value === sectionType);

    return (
        <>
            <SidePanel
                open={open}
                onOpenChange={onOpenChange}
                title="Edit Section Details"
                onOpenAutoFocus={(e) => e.preventDefault()}
                footer={
                    <div className="flex w-full justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting}>
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
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="section-title" className="text-sm font-medium">
                            {t('library.sections.sectionName') || 'Section Name'}<RequiredAsterisk />
                        </Label>
                        <Input
                            id="section-title"
                            type="text"
                            placeholder={t('library.sections.sectionNamePlaceholder') || 'e.g. Warm Up'}
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
                        <Label htmlFor="section-type" className="text-sm font-medium">
                            {t('library.sections.type') || 'Type'}
                        </Label>
                        <Select
                            value={sectionType}
                            disabled
                            onValueChange={(value) => setSectionType(value as SectionType)}
                        >
                            <SelectTrigger id="section-type" className="w-full opacity-70 cursor-not-allowed bg-muted">
                                <SelectValue>
                                    {selectedOption?.label || t('library.sections.selectTypePlaceholder') || "Select type"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {sectionTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col gap-0.5">
                                            <span>{option.label}</span>
                                            <span className="text-xs text-muted-foreground">{option.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="section-description" className="text-sm font-medium">
                            {t('library.sections.description') || 'Description'}
                        </Label>
                        <Textarea
                            id="section-description"
                            placeholder={t('library.sections.descriptionPlaceholder') || 'Describe this section...'}
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
                itemName={title}
                itemType="section"
            />
        </>
    );
};
