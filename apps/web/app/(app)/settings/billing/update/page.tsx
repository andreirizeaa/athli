'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AthliLogo } from '@/components/athli-logo';
import PricingPlans from '@/components/pricing-plans';
import PricingComparison from '@/components/pricing-comparison';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { useEntitlements, useSubscription } from '@/hooks/use-entitlements';

export default function UpdatePlanPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { activeClientCount, isLoading: isLoadingClients } = useCoachClients();
  const { isLoading: isLoadingEntitlements } = useEntitlements();
  const { isLoading: isLoadingSubscription } = useSubscription();

  // Wait for all data to load before showing pricing
  const isLoading = isLoadingEntitlements || isLoadingSubscription || isLoadingClients;

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when page is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBack = () => {
    router.push('/settings/billing');
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background overflow-auto">
      {/* Grid Background - Light mode */}
      <div
        className="fixed inset-0 opacity-40 dark:hidden pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="fixed inset-0 hidden opacity-40 dark:block pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Header with back button */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex-1" />
          <AthliLogo />
          <div className="flex-1" />
          <div className="w-[72px]" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <PricingPlans
              hideHeader
              isUpdateMode
              minClientCount={activeClientCount}
            />

            <PricingComparison />
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
