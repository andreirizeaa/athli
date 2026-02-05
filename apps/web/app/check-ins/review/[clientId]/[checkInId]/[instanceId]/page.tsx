'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { CheckInReviewContent } from '@/components/forms/check-in-review-content';
import { Button } from '@/components/ui/button';

const CheckInReviewPage = () => {
    const t = useTranslations();
    const router = useRouter();
    const params = useParams<{ clientId: string; checkInId: string; instanceId: string }>();

    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;
    const instanceId = Array.isArray(params.instanceId) ? params.instanceId[0] : params.instanceId;

    const handleBack = () => {
        router.push('/check-ins');
    };

    return (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden font-sans">
            <div className="w-full relative flex-shrink-0">
                <div className="px-6 py-4 flex flex-col gap-1">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink
                                    href="/check-ins"
                                    className="hover:text-foreground transition-colors"
                                >
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
                    <div className="flex items-center gap-4 mt-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBack}
                            className="size-8 -ml-2"
                        >
                            <ChevronLeft className="size-5" />
                        </Button>
                        <h1 className="text-xl font-semibold">Review Submission</h1>
                    </div>
                </div>
                <Separator className="absolute bottom-[-1px] left-0 right-0" />
            </div>

            <div className="flex-1 w-full overflow-auto py-8">
                <div className="max-w-3xl mx-auto px-4">
                    {clientId && checkInId && instanceId && (
                        <CheckInReviewContent
                            clientId={clientId}
                            checkInId={checkInId}
                            instanceId={instanceId}
                            onReviewSaved={() => {
                                // Optionally navigate back or show success state
                                // router.push('/check-ins');
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckInReviewPage;
