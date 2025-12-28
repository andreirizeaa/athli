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
    itemType?: string; // e.g. "flow", "metric", "habit", "file"
    title?: string;
    description?: string;
    confirmText?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
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
}: ConfirmDeleteDialogProps) => {
    const t = useTranslations();

    const isSingleDelete = itemName !== undefined;

    let title = customTitle;
    if (!title) {
        title = isSingleDelete
            ? `Delete ${itemName}?`
            : t('general.confirmDeletion');
    }

    let description = customDescription;
    if (!description) {
        description = isSingleDelete
            ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
            : t('general.bulkDeleteConfirmation', {
                count: count || 0,
                item: itemType,
            });
    }

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
                        variant={variant}
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmText || t('general.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
