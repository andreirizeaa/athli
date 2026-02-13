'use client';

import { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTranslations } from 'next-intl';

interface ConfirmArchiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    itemName?: string; // Name of single item being archived
    count?: number; // Number of items for bulk archive
    isLoading?: boolean; // Show loading state during API call
}

export const ConfirmArchiveDialog = ({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    count,
    isLoading,
}: ConfirmArchiveDialogProps) => {
    const t = useTranslations();

    // Two-step confirmation state
    const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
    const [confirmButtonDisabled, setConfirmButtonDisabled] = useState(false);

    // Reset step when dialog closes
    useEffect(() => {
        if (!open) {
            setConfirmStep(1);
            setConfirmButtonDisabled(false);
        }
    }, [open]);

    // Enable confirm button after 1 second delay when step 2 is reached
    useEffect(() => {
        if (confirmStep === 2) {
            setConfirmButtonDisabled(true);
            const timer = setTimeout(() => {
                setConfirmButtonDisabled(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [confirmStep]);

    const isSingleArchive = itemName !== undefined;

    const getTitle = () => {
        if (confirmStep === 2) {
            return 'Confirm Archive';
        }
        return isSingleArchive
            ? `Archive ${itemName}?`
            : t('general.confirmArchive', { defaultValue: 'Confirm archive' });
    };

    const getDescription = () => {
        if (confirmStep === 2) {
            return 'Please confirm one more time to archive.';
        }
        return isSingleArchive
            ? `Are you sure you want to archive "${itemName}"? They will lose access to the app immediately, but you can unarchive them later.`
            : `Are you sure you want to archive ${count} selected clients? They will lose access to the app immediately, but you can unarchive them later.`;
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setConfirmStep(1);
        }
        onOpenChange(newOpen);
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader style={{ minHeight: '85px' }}>
                    <AlertDialogTitle>
                        {getTitle()}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {getDescription()}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        className="min-w-[100px]"
                        disabled={isLoading}
                        onClick={() => {
                            if (confirmStep === 2) {
                                setConfirmStep(1);
                            } else {
                                onOpenChange(false);
                            }
                        }}
                    >
                        {confirmStep === 1 ? t('general.cancel') : 'Go Back'}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            if (confirmStep === 1) {
                                setConfirmStep(2);
                            } else {
                                onConfirm();
                            }
                        }}
                        disabled={(confirmStep === 2 && confirmButtonDisabled) || isLoading}
                        className="bg-destructive text-white hover:bg-destructive/90 min-w-[100px] relative"
                    >
                        <span className={isLoading ? "invisible" : ""}>
                            {confirmStep === 1
                                ? t('athletes.actions.archive', { defaultValue: 'Archive' })
                                : 'Confirm Archive'
                            }
                        </span>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner className="size-4" />
                            </div>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
