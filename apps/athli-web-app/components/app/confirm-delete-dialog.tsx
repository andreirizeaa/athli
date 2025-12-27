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
import { useTranslations } from 'next-intl';

interface ConfirmDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    itemName?: string; // Name of single item being deleted
    count?: number; // Number of items for bulk delete
    itemType: string; // e.g. "flow", "metric", "habit", "file"
}

export const ConfirmDeleteDialog = ({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    count,
    itemType,
}: ConfirmDeleteDialogProps) => {
    const t = useTranslations();

    const isSingleDelete = itemName !== undefined;
    const title = isSingleDelete
        ? `Delete ${itemName}?`
        : t('general.confirmDeletion');

    const description = isSingleDelete
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : t('general.bulkDeleteConfirmation', {
            count: count || 0,
            item: itemType,
        });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-base text-sm">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {t('general.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
