'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface ConfirmDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void> | void;
    itemName?: string; // Name of single item being deleted
    count?: number; // Number of items for bulk delete
    itemType?: string; // e.g. "flow", "metric", "habit", "file"
    title?: string;
    description?: string;
    confirmText?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    /** Enable two-step confirmation for destructive actions */
    twoStep?: boolean;
    /** Custom text for step 2 title */
    step2Title?: string;
    /** Custom text for step 2 description */
    step2Description?: string;
    /** Custom text for step 2 confirm button */
    step2ConfirmText?: string;
    /** Enable typed confirmation - user must type "delete [itemName]" */
    typedConfirmation?: boolean;
}

export const ConfirmDeleteDialog = ({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    count,
    itemType = "item",
    title: customTitle,
    description: customDescription,
    confirmText,
    variant = 'destructive',
    twoStep = false,
    step2Title,
    step2Description,
    step2ConfirmText,
    typedConfirmation = false,
}: ConfirmDeleteDialogProps) => {
    const t = useTranslations();
    const [isDeleting, setIsDeleting] = useState(false);

    // Two-step confirmation state
    const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
    const [confirmButtonDisabled, setConfirmButtonDisabled] = useState(false);

    // Typed confirmation state
    const [confirmInput, setConfirmInput] = useState('');

    // Reset step when dialog closes
    useEffect(() => {
        if (!open) {
            setConfirmStep(1);
            setConfirmButtonDisabled(false);
            setConfirmInput('');
        }
    }, [open]);

    // Enable confirm button after 1 second delay when step 2 is reached (only for non-typed confirmation)
    useEffect(() => {
        if (twoStep && !typedConfirmation && confirmStep === 2) {
            setConfirmButtonDisabled(true);
            const timer = setTimeout(() => {
                setConfirmButtonDisabled(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [twoStep, typedConfirmation, confirmStep]);

    // For typed confirmation, the expected input is "delete [itemName]"
    const expectedInput = itemName ? `delete ${itemName}` : '';
    const isTypedInputCorrect = typedConfirmation && confirmInput.toLowerCase() === expectedInput.toLowerCase();

    const isSingleDelete = itemName !== undefined;

    const getTitle = () => {
        if (twoStep && confirmStep === 2) {
            return step2Title || 'Confirm Action';
        }
        if (customTitle) return customTitle;
        return isSingleDelete
            ? `Delete ${itemName}?`
            : t('general.confirmDeletion');
    };

    const getDescription = () => {
        if (twoStep && confirmStep === 2) {
            return step2Description || 'Please confirm one more time.';
        }
        if (customDescription) return customDescription;
        return isSingleDelete
            ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
            : t('general.bulkDeleteConfirmation', {
                count: count || 0,
                item: itemType,
            });
    };

    const getConfirmText = () => {
        if (twoStep && confirmStep === 2) {
            return step2ConfirmText || 'Confirm';
        }
        return confirmText || t('general.delete');
    };

    const handleConfirm = async () => {
        // For both twoStep and typedConfirmation, move to step 2 from step 1
        if ((twoStep || typedConfirmation) && confirmStep === 1) {
            setConfirmStep(2);
            return;
        }

        console.log('ConfirmDeleteDialog - Deletion Confirmed');
        setIsDeleting(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            // Error handling should be done in the parent component
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = () => {
        if ((twoStep || typedConfirmation) && confirmStep === 2) {
            setConfirmStep(1);
            setConfirmInput('');
        } else {
            onOpenChange(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setConfirmStep(1);
        }
        if (!isDeleting) {
            onOpenChange(newOpen);
        }
    };

    // For typed confirmation in step 2, show the input field
    const renderTypedConfirmationStep = () => (
        <>
            <DialogHeader>
                <DialogTitle>Type to Confirm</DialogTitle>
                <DialogDescription>
                    Please type <span className="font-bold text-destructive text-base">"delete {itemName}"</span> exactly to continue.
                </DialogDescription>
            </DialogHeader>
            <div className="pt-1 pb-2">
                <Label htmlFor="confirm-input" className="sr-only">
                    Type delete {itemName}
                </Label>
                <Input
                    id="confirm-input"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    placeholder={`delete ${itemName}`}
                    className="text-destructive border-destructive bg-destructive/5 focus-visible:ring-destructive focus-visible:border-destructive focus:border-destructive"
                    autoComplete="off"
                    autoFocus
                />
            </div>
            <DialogFooter>
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isDeleting}
                    className="min-w-[100px]"
                >
                    Go Back
                </Button>
                <Button
                    variant={variant}
                    onClick={(e) => {
                        e.preventDefault();
                        handleConfirm();
                    }}
                    disabled={isDeleting || !isTypedInputCorrect}
                    className="gap-2 relative min-w-[100px]"
                >
                    <span className={isDeleting ? "invisible" : ""}>
                        {getConfirmText()}
                    </span>
                    {isDeleting && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner className="size-4" />
                        </div>
                    )}
                </Button>
            </DialogFooter>
        </>
    );

    // Standard step content (step 1 or non-typed step 2)
    const renderStandardStep = () => (
        <>
            <DialogHeader style={twoStep && !typedConfirmation ? { minHeight: '85px' } : undefined}>
                <DialogTitle>
                    {getTitle()}
                </DialogTitle>
                <DialogDescription className="text-base text-sm">
                    {getDescription()}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isDeleting}
                    className="min-w-[100px]"
                >
                    {twoStep && confirmStep === 2 ? 'Go Back' : t('general.cancel')}
                </Button>
                <Button
                    variant={variant}
                    onClick={(e) => {
                        e.preventDefault();
                        handleConfirm();
                    }}
                    disabled={isDeleting || (twoStep && !typedConfirmation && confirmStep === 2 && confirmButtonDisabled)}
                    className="gap-2 relative min-w-[100px]"
                >
                    <span className={isDeleting ? "invisible" : ""}>
                        {getConfirmText()}
                    </span>
                    {isDeleting && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner className="size-4" />
                        </div>
                    )}
                </Button>
            </DialogFooter>
        </>
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                {typedConfirmation && confirmStep === 2 ? renderTypedConfirmationStep() : renderStandardStep()}
            </DialogContent>
        </Dialog>
    );
};
