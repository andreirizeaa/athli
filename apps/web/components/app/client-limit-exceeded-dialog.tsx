'use client';

import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClientLimitExceededDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientLimit: number;
    currentCount: number;
}

export const ClientLimitExceededDialog = ({
    open,
    onOpenChange,
    clientLimit,
    currentCount,
}: ClientLimitExceededDialogProps) => {
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Plan Limit Exceeded</DialogTitle>
                    <DialogDescription className="text-sm">
                        You currently have {currentCount} active clients and your plan allows {clientLimit}.
                        Please increase your client allowance to unarchive this client.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            router.push('/settings/billing/update');
                            onOpenChange(false);
                        }}
                    >
                        Manage Plan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
