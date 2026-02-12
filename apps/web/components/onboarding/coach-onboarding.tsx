'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AthliLogo } from '@/components/athli-logo';
import { Confetti } from '@/components/ui/confetti';
import { MobileDownloadOverlay } from '@/components/app/mobile-download-overlay';
import { useIsMobileWithLoading } from '@/hooks/use-mobile';
import { FreeTrialStep } from './steps/free-trial-step';
import { CompanyNameStep } from './steps/company-name-step';
import { CountryStep } from './steps/country-step';
import { SpecialitiesStep } from './steps/specialities-step';
import { WebsiteStep } from './steps/website-step';
import { LinkedinStep } from './steps/linkedin-step';
import { LogoStep } from './steps/logo-step';
import { CompleteStep } from './steps/complete-step';
import { updateCoachCompany, markOnboardingComplete } from '@/api/settings/coach/coach-company-service';
import type { Country } from 'react-phone-number-input';

export type OnboardingData = {
  companyName: string;
  country: Country | undefined;
  specialities: string[];
  website: string;
  linkedin: string;
  logoUrl: string | null;
};

// 0: free trial, 1: name, 2: country, 3: specialities, 4: website, 5: linkedin, 6: logo, 7: complete
const TOTAL_STEPS = 8;

export function CoachOnboarding() {
  const router = useRouter();
  const isMobile = useIsMobileWithLoading();
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(true); // Show on free trial step
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    country: undefined,
    specialities: [],
    website: '',
    linkedin: '',
    logoUrl: null,
  });

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Save data optimistically in background
  const saveInBackground = useCallback(async (dataToSave: Partial<OnboardingData>) => {
    try {
      await updateCoachCompany({
        company_name: dataToSave.companyName || data.companyName || 'My Company',
        location: dataToSave.country || data.country || '',
        specialities: dataToSave.specialities || data.specialities,
        website: dataToSave.website || data.website || '',
        linkedin: dataToSave.linkedin || data.linkedin || '',
        logo_url: dataToSave.logoUrl || data.logoUrl || undefined,
      });
    } catch (error) {
      console.error('[Onboarding] Failed to save:', error);
    }
  }, [data]);

  const handleNext = useCallback(() => {
    // Save current step data in background
    if (currentStep === 1 && data.companyName) {
      saveInBackground({ companyName: data.companyName });
    } else if (currentStep === 2 && data.country) {
      saveInBackground({ country: data.country });
    } else if (currentStep === 3 && data.specialities.length > 0) {
      saveInBackground({ specialities: data.specialities });
    } else if (currentStep === 4 && data.website) {
      saveInBackground({ website: data.website });
    } else if (currentStep === 5 && data.linkedin) {
      saveInBackground({ linkedin: data.linkedin });
    } else if (currentStep === 6 && data.logoUrl) {
      saveInBackground({ logoUrl: data.logoUrl });
    }

    // Show confetti and mark complete when moving to complete step
    if (currentStep === TOTAL_STEPS - 2) {
      setShowConfetti(true);
      // Mark onboarding as complete in background
      markOnboardingComplete().catch(err => console.error('[Onboarding] Failed to mark complete:', err));
    } else {
      setShowConfetti(false);
    }
    setCurrentStep(prev => prev + 1);
  }, [currentStep, data, saveInBackground, router]);

  const handleBack = useCallback(() => {
    setShowConfetti(false);
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(async () => {
    // Save whatever data we have and mark onboarding complete
    if (data.companyName) {
      saveInBackground(data);
    }
    await markOnboardingComplete().catch(err => console.error('[Onboarding] Failed to mark complete:', err));
    if (isMobile) {
      setShowMobileOverlay(true);
    } else {
      router.push('/get-started');
    }
  }, [data, saveInBackground, router, isMobile]);

  // Determine if continue button should be enabled
  const canContinue = currentStep === 0 // Welcome - always enabled
    || (currentStep === 1 ? data.companyName.trim().length > 0 : true); // Company name required, rest optional

  // Get step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <FreeTrialStep onContinue={handleNext} />;
      case 1:
        return <CompanyNameStep value={data.companyName} onChange={(v) => updateData({ companyName: v })} />;
      case 2:
        return <CountryStep value={data.country} onChange={(v) => updateData({ country: v })} />;
      case 3:
        return <SpecialitiesStep value={data.specialities} onChange={(v) => updateData({ specialities: v })} />;
      case 4:
        return <WebsiteStep value={data.website} onChange={(v) => updateData({ website: v })} />;
      case 5:
        return <LinkedinStep value={data.linkedin} onChange={(v) => updateData({ linkedin: v })} />;
      case 6:
        return <LogoStep value={data.logoUrl} onChange={(v) => updateData({ logoUrl: v })} />;
      case 7:
        return <CompleteStep onComplete={() => {
          if (isMobile) {
            setShowMobileOverlay(true);
          } else {
            router.push('/get-started');
          }
        }} />;
      default:
        return null;
    }
  };

  // Button text
  const getButtonText = () => {
    if (currentStep === 0) return "Let's get started";
    if (currentStep === TOTAL_STEPS - 1) return 'Finish';
    return 'Continue';
  };

  // Show back button on steps 2-6 (not on welcome, company name, or complete)
  const showBackButton = currentStep > 1 && currentStep < TOTAL_STEPS - 1;

  // Show skip button after company name step (steps 2-6)
  const showSkipButton = currentStep > 1 && currentStep < TOTAL_STEPS - 1;

  // Show progress dots during steps 1-6
  const showProgressDots = currentStep > 0 && currentStep < TOTAL_STEPS - 1;

  // Show mobile download overlay
  if (showMobileOverlay) {
    return <MobileDownloadOverlay userType="coach" />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Confetti */}
      <Confetti trigger={showConfetti} />

      {/* Header with centered logo */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-center px-6 py-4">
          <AthliLogo />
        </div>
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

      {/* Skip button - bottom right */}
      {showSkipButton && (
        <button
          onClick={handleSkip}
          className="absolute right-6 bottom-6 z-20 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      )}

      {/* Content */}
      <div className={`relative z-10 flex flex-col px-4 pb-8 ${currentStep === 0 || currentStep === TOTAL_STEPS - 1 ? 'min-h-[calc(100vh-65px)] justify-center' : 'pt-12'}`}>
        <div className="w-full max-w-lg mx-auto">
          {/* Step Content */}
          <div className="w-full">
            {renderStepContent()}
          </div>

          {/* Navigation - follows content (hidden on complete step) */}
          {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
            <div className="w-full mt-10">
              <div className="flex items-center gap-4">
                {showBackButton && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="h-11 px-6 rounded-xl"
                  >
                    Back
                  </Button>
                )}

                {/* Progress dots - in middle */}
                {showProgressDots && (
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map((step) => (
                      <div
                        key={step}
                        className={`size-2 rounded-full transition-colors ${
                          step <= currentStep ? 'bg-foreground' : 'bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Spacer when no dots */}
                {!showProgressDots && <div className="flex-1" />}

                <Button
                  onClick={handleNext}
                  disabled={!canContinue}
                  className="h-11 px-6 rounded-xl"
                >
                  {getButtonText()}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
