'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { ChevronRight, Download, Loader2 } from 'lucide-react';
import { CheckInReviewContent } from '@/components/forms/check-in-review-content';
import { useClientProfile } from '@/hooks/use-client-profile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getCheckInInstance, type CheckInInstance } from '@/api/client/client-form-service';
import { downloadQuestionnaire } from '@/lib/general/pdf-service';
import { Button } from '@/components/ui/button';

const CheckInReviewPage = () => {
    const t = useTranslations();
    const params = useParams<{ clientId: string; checkInId: string; instanceId: string }>();

    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;
    const instanceId = Array.isArray(params.instanceId) ? params.instanceId[0] : params.instanceId;

    const { client } = useClientProfile(clientId);
    const { user } = useUserProfile();
    const [checkInInstance, setCheckInInstance] = useState<CheckInInstance | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchInstance = async () => {
            if (!clientId || !checkInId || !instanceId) return;
            try {
                const data = await getCheckInInstance(clientId, checkInId, instanceId, user!.id);
                setCheckInInstance(data);
            } catch (error) {
                console.error('Failed to fetch check-in instance:', error);
            }
        };
        fetchInstance();
    }, [clientId, checkInId, instanceId]);

    const handleDownload = async () => {
        if (!checkInInstance || isDownloading) return;
        setIsDownloading(true);
        try {
            const name = client ? `${client.firstName} ${client.lastName}` : 'Client';
            await downloadQuestionnaire({
                questionnaire: {
                    id: checkInInstance.id,
                    name: checkInInstance.formName,
                    description: '',
                    status: checkInInstance.status === 'assigned' ? 'pending' : 'completed',
                    sentAt: checkInInstance.scheduledDate,
                    completedAt: checkInInstance.completedAt,
                    questions: checkInInstance.questions || [],
                    answers: checkInInstance.answers || [],
                },
                clientName: name,
                clientId,
                coachId: user!.id,
                formType: 'check-in',
                checkInId,
                submissionId: instanceId,
            });
        } catch (error) {
            console.error('Failed to download check-in PDF:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const clientName = client ? `${client.firstName} ${client.lastName}` : '';
    const checkInName = checkInInstance?.formName || '';

    return (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden font-sans">
            <div className="w-full relative flex-shrink-0">
                <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
                    <Breadcrumb>
                        <BreadcrumbList className="text-xs gap-1">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link
                                        href="/check-ins"
                                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                                    >
                                        {t('sidebar.links.checkIns')}
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-muted-foreground/60">
                                <ChevronRight className="h-2 w-2" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link
                                        href={`/athletes/${clientId}/overview`}
                                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                                    >
                                        {clientName || t('forms.checkIns.review.client')}
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-muted-foreground/60">
                                <ChevronRight className="h-2 w-2" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="px-0.5 font-semibold text-foreground">
                                    {checkInName && clientName
                                        ? `${checkInName} · ${clientName}`
                                        : checkInName || t('forms.checkIns.review.title')}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="flex items-center justify-between">
                        <h1 className="text-[22px] font-semibold">
                            {checkInName
                                ? `${t('forms.checkIns.review.title')} ${checkInName}`
                                : t('forms.checkIns.review.pageTitle')}
                        </h1>
                        {checkInInstance && checkInInstance.status !== 'assigned' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="gap-2"
                            >
                                {isDownloading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Download className="size-4" />
                                )}
                                <span>{t('common.download')}</span>
                            </Button>
                        )}
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
                            coachId={user!.id}
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
