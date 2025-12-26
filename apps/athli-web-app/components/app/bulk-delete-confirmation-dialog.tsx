'use client';

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
import { useTranslations } from 'next-intl';

interface BulkDeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    count: number;
    itemName: string; // e.g. "metrics", "habits", etc.
}

export const BulkDeleteConfirmationDialog = ({
    open,
    onOpenChange,
    onConfirm,
    count,
    itemName,
}: BulkDeleteConfirmationDialogProps) => {
    const t = useTranslations();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t('general.confirmDeletion')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('general.bulkDeleteConfirmation', {
                            count,
                            item: itemName,
                        })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>
                        {t('general.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {t('general.delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
