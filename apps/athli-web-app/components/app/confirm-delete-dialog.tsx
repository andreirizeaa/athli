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

import { useState } from 'react';
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
    variant = 'default',
}: ConfirmDeleteDialogProps) => {
    const t = useTranslations();
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleConfirm = async () => {
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

    return (
        <Dialog open={open} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
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
                        disabled={isDeleting}
                    >
                        {t('general.cancel')}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={isDeleting}
                        className="gap-2 relative"
                    >
                        <span className={isDeleting ? "invisible" : ""}>
                            {confirmText || t('general.delete')}
                        </span>
                        {isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner className="size-4" />
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
