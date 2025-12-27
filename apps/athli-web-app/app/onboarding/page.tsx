'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FlowEditor } from '@/components/flows/flow-editor';
import {
    getOnboarding,
    updateOnboarding,
    togglePublish,
    type Onboarding
} from '@/api/coach/coach-onboarding-service';
import type { Node, Edge } from 'reactflow';

const OnboardingPage = () => {
    const t = useTranslations();
    const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPublishing, setIsPublishing] = useState<boolean>(false);

    useEffect(() => {
        const fetchOnboarding = async () => {
            setIsLoading(true);
            try {
                const data = await getOnboarding();
                setOnboarding(data);
            } catch (error) {
                console.error('Failed to fetch onboarding:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOnboarding();
    }, []);

    const handleTogglePublish = async () => {
        setIsPublishing(true);
        try {
            const updatedOnboarding = await togglePublish();
            setOnboarding(updatedOnboarding);
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSaveFlow = async (data: { nodes: Node[]; edges: Edge[] }) => {
        await updateOnboarding({
            nodes: data.nodes,
            edges: data.edges,
        });
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!onboarding) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold mb-2">{t('onboarding.notFound')}</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            {/* Full Width Header */}
            <div className="w-full relative flex-shrink-0">
                <div className="px-4 flex items-center justify-between gap-4 mb-2 mt-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <h1 className="text-[22px] font-semibold">{t('onboarding.title')}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={onboarding.is_active ? "outline" : "default"}
                            className="min-w-[100px]"
                            onClick={handleTogglePublish}
                            disabled={isPublishing}
                        >
                            {isPublishing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {onboarding.is_active ? t('onboarding.unpublishing') : t('onboarding.publishing')}
                                </>
                            ) : (
                                onboarding.is_active ? t('onboarding.unpublish') : t('onboarding.publish')
                            )}
                        </Button>
                    </div>
                </div>
                <Separator />
            </div>

            {/* Flow Editor */}
            <FlowEditor
                flow={onboarding}
                isOnboardingMode={true}
                onSaveFlow={handleSaveFlow}
            />
        </div>
    );
};

export default OnboardingPage;
