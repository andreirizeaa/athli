'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { AthliLogo } from '@/components/athli-logo';
import { AppStoreButton, GooglePlayButton } from '@/components/public/app-store-buttons';
import { Confetti } from '@/components/ui/confetti';
import { getPublicPackages } from '@/api/payments/payment-service';
import type { CoachPackage } from '@athli/shared-types';

export default function PaymentCompletePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const coachCode = params.coachCode as string;
  const packageId = params.packageId as string;
  const sessionId = searchParams.get('session_id');

  const [pkg, setPkg] = useState<CoachPackage | null>(null);
  const [coachName, setCoachName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Clear the URL once the page loads
  useEffect(() => {
    if (sessionId) {
      // Replace the URL to remove the session_id without refreshing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [sessionId]);

  // Fetch package data
  useEffect(() => {
    if (!coachCode) return;

    const fetchData = async () => {
      try {
        const data = await getPublicPackages(coachCode);
        const foundPkg = data.packages.find((p) => p.id === packageId);
        if (foundPkg) {
          setPkg(foundPkg);
          setCoachName(data.company?.company_name || data.coach?.name?.split(' ')[0] || 'your coach');
        }
      } catch {
        // Ignore errors - we'll show a generic success message
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [coachCode, packageId]);

  // Process payment completion (trigger onboarding, etc.)
  useEffect(() => {
    if (!sessionId && !isLoading) {
      setIsProcessing(false);
      setShowConfetti(true);
      return;
    }

    if (isLoading) return;

    const processCompletion = async () => {
      // Simulate processing time for onboarding setup
      // In a real implementation, this would call an API to:
      // 1. Verify the Stripe session
      // 2. Create coach-client assignment
      // 3. Trigger onboarding/sequence flows
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsProcessing(false);
      setShowConfetti(true);
    };

    processCompletion();
  }, [sessionId, isLoading]);

  if (isLoading || isProcessing) {
    return (
      <div className="relative min-h-screen bg-background">
        {/* Logo */}
        <div className="absolute left-6 top-6 z-20">
          <AthliLogo />
        </div>

        {/* Grid Background - Light mode */}
        <div
          className="absolute inset-0 opacity-40 dark:hidden"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Grid Background - Dark mode */}
        <div
          className="absolute inset-0 hidden opacity-40 dark:block"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing your payment...</h2>
            <p className="text-muted-foreground">Please wait while we set up your account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Confetti */}
      <Confetti trigger={showConfetti} />

      {/* Logo */}
      <div className="absolute left-6 top-6 z-20">
        <AthliLogo />
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="absolute inset-0 hidden opacity-40 dark:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="flex flex-col items-center max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
          </div>

          {/* Header */}
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground mb-8">
            {pkg ? (
              <>Thank you for purchasing <span className="font-medium text-foreground">{pkg.name}</span>. You&apos;re all set to get started with {coachName}!</>
            ) : (
              <>Thank you for your purchase. You&apos;re all set to get started!</>
            )}
          </p>

          {/* Download App Section */}
          <div className="w-full max-w-xs space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the app to get started
            </p>
            <div className="flex items-center justify-center gap-3">
              <AppStoreButton href="#" />
              <GooglePlayButton href="#" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
