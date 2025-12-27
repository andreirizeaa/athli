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

interface ConfirmArchiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    itemName?: string; // Name of single item being archived
    count?: number; // Number of items for bulk archive
}

export const ConfirmArchiveDialog = ({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    count,
}: ConfirmArchiveDialogProps) => {
    const t = useTranslations();

    const isSingleArchive = itemName !== undefined;
    const title = isSingleArchive
        ? `Archive ${itemName}?`
        : t('general.confirmArchive', { defaultValue: 'Confirm archive' });

    const description = isSingleArchive
        ? `Are you sure you want to archive "${itemName}"? They will lose access to the app immediately, but you can unarchive them later.`
        : `Are you sure you want to archive ${count} selected clients? They will lose access to the app immediately, but you can unarchive them later.`;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
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
                        {t('athletes.actions.archive', { defaultValue: 'Archive' })}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
