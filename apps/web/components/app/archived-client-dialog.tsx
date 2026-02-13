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

interface ArchivedClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnarchive: () => void;
    clientName: string;
}

export const ArchivedClientDialog = ({
    open,
    onOpenChange,
    onUnarchive,
    clientName,
}: ArchivedClientDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{clientName} is Archived</DialogTitle>
                    <DialogDescription className="text-sm">
                        This client does not have access to the app, and you are not being billed for this client.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onUnarchive();
                            onOpenChange(false);
                        }}
                    >
                        Unarchive
                    </Button>
                    <Button
                        onClick={() => onOpenChange(false)}
                    >
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
