'use client';

import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';
import { CheckInReviewContent } from './check-in-review-content';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CheckInReviewSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    checkInId: string;
    instanceId: string;
    coachId: string;
    onReviewSaved?: () => void;
    clientName?: string;
    checkinName?: string;
}

export const CheckInReviewSidePanel = ({
    open,
    onOpenChange,
    clientId,
    checkInId,
    instanceId,
    coachId,
    onReviewSaved,
    clientName = 'Review',
    checkinName = 'Check in',
}: CheckInReviewSidePanelProps) => {
    const t = useTranslations();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-[700px] p-0 flex flex-col bg-background border-l">
                <div className="flex-shrink-0">
                    <div className="px-6 py-4 flex flex-col gap-1">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink className="cursor-default pointer-events-none">
                                        Check-ins
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator>
                                    <ChevronRight className="size-3.5" />
                                </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Review</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <h2 className="text-xl font-semibold mt-1">
                            {checkinName} - {clientName}
                        </h2>
                    </div>
                    <Separator />
                </div>

                <div className="flex-1 overflow-auto px-6 py-6">
                    {clientId && checkInId && instanceId && (
                        <CheckInReviewContent
                            clientId={clientId}
                            checkInId={checkInId}
                            instanceId={instanceId}
                            coachId={coachId}
                            onReviewSaved={() => {
                                onReviewSaved?.();
                                // Optionally close on save if it's a one-time thing
                                // onOpenChange(false);
                            }}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
