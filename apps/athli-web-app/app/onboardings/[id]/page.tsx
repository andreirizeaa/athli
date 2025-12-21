'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import { FlowEditor } from '@/components/onboardings/flow-editor';

// Mock onboarding data - in production this would come from an API
const mockOnboardings = [
  {
    id: 'onboarding-1',
    name: 'New Client Onboarding',
    description: 'Comprehensive onboarding flow for new clients',
    stepCount: 5,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'onboarding-2',
    name: 'Athlete Welcome',
    description: 'Welcome and introduction flow for new athletes',
    stepCount: 3,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const OnboardingDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const onboardingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const onboarding = mockOnboardings.find((o) => o.id === onboardingId);

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleNodeClick = () => {
    // Handle node click if needed
  };

  if (!onboarding) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('onboardings.notFound')}</h1>
          <p className="text-muted-foreground">{t('onboardings.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Full Width Header */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/onboardings')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('onboardings.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {onboarding.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[22px] font-semibold">{onboarding.name}</h1>
          </div>
        </div>
        <Separator />
      </div>

      {/* Flow Editor */}
      <FlowEditor
        onTriggerClick={handleNodeClick}
        onActionClick={handleNodeClick}
      />
    </div>
  );
};

export default OnboardingDetailPage;
