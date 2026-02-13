'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, Ticket, Loader2, X } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyReferralCode } from '@/api/billing/billing-service';
import { toast } from 'sonner';
import { fireConfetti } from '@/components/ui/confetti';

const REFERRAL_CODE_KEY = 'athli_referral_code';

interface FreeTrialStepProps {
  onContinue: () => void;
}

const features = [
  'Full access to all premium features',
  'Automate client onboarding and workflows',
  'Try Lyra, your AI coaching assistant',
  'Train and manage up to 50 clients',
];

export function FreeTrialStep({ onContinue }: FreeTrialStepProps) {
  const [referralCode, setReferralCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isCodeApplied, setIsCodeApplied] = useState(false);
  const [cameFromReferralLink, setCameFromReferralLink] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Load referral code from localStorage on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedCode = localStorage.getItem(REFERRAL_CODE_KEY);
    if (savedCode) {
      setReferralCode(savedCode);
      setCameFromReferralLink(true);
      // Also load referrer name if available (set by referral landing page)
      const savedReferrerName = localStorage.getItem('athli_referrer_name');
      if (savedReferrerName) {
        setReferrerName(savedReferrerName);
      }
    }
  }, []);

  const handleApplyCode = async () => {
    if (!referralCode.trim() || isApplying || isCodeApplied) return;

    setIsApplying(true);
    setReferralError(null);
    try {
      const result = await applyReferralCode(referralCode.trim());
      if (result.success) {
        // Clear from localStorage
        localStorage.removeItem(REFERRAL_CODE_KEY);
        localStorage.removeItem('athli_referrer_name');
        setIsCodeApplied(true);
        setReferrerName(result.referrerName || null);
        // Fire confetti on successful application
        fireConfetti();
        toast.success('Referral code applied!');
      } else {
        // API returned success: false with an error message
        const errorMessage = result.error || 'Invalid referral code';
        setReferralError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Failed to apply referral code:', error);
      const errorMessage = error.message || 'Failed to apply referral code';
      setReferralError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  const handleStartTrial = async () => {
    // If from referral link and not yet applied, apply it first
    if (cameFromReferralLink && !isCodeApplied && referralCode.trim()) {
      setIsStartingTrial(true);
      try {
        const result = await applyReferralCode(referralCode.trim());
        if (result.success) {
          localStorage.removeItem(REFERRAL_CODE_KEY);
          localStorage.removeItem('athli_referrer_name');
          fireConfetti();
        }
      } catch (error: any) {
        console.error('Failed to apply referral code:', error);
        // Don't block - continue anyway
      } finally {
        setIsStartingTrial(false);
      }
    }
    onContinue();
  };

  // Determine if start button should be disabled
  // If user manually entered a code (not from link), they must click Apply first
  const hasManualCode = !cameFromReferralLink && referralCode.trim().length > 0;
  const canStart = !isStartingTrial && (!hasManualCode || isCodeApplied);

  return (
    <div>
      {/* Header */}
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2"
      >
        Start your 30-day free trial
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-8"
      >
        We&apos;ve given you full access to explore everything Athli has to offer.
      </motion.p>

      {/* Referral code section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-4"
      >
        {cameFromReferralLink ? (
          // User came from referral link - show input with Applied button, then styled message
          <div className="space-y-3">
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                value={referralCode}
                readOnly
                className="pl-10 pr-24 h-12 rounded-xl pointer-events-none"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <Button
                  disabled
                  className="h-9 w-[72px]"
                >
                  Applied
                </Button>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
              <p className="text-sm text-muted-foreground">
                {referrerName ? `Referred by ${referrerName}. ` : ''}You will receive <span className="font-bold text-base text-emerald-500">$20</span> in credits to go towards your second paid month.
              </p>
            </div>
          </div>
        ) : (
          // Manual entry - show input with Apply/Applied button
          <div className="space-y-2">
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Referral code (optional)"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  // Reset applied state and error if they change the code
                  if (isCodeApplied) setIsCodeApplied(false);
                  if (referralError) setReferralError(null);
                }}
                readOnly={isCodeApplied}
                className={`pl-10 pr-24 h-12 rounded-xl ${isCodeApplied ? 'pointer-events-none' : ''}`}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {!isCodeApplied && referralCode.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setReferralCode('');
                      setReferralError(null);
                    }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <Button
                  onClick={isCodeApplied ? undefined : handleApplyCode}
                  disabled={isCodeApplied || !referralCode.trim() || isApplying}
                  className="h-9 w-[72px]"
                >
                  {isApplying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isCodeApplied ? (
                    'Applied'
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            </div>
            {isCodeApplied && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
              >
                <p className="text-sm text-muted-foreground">
                  {referrerName ? `Referred by ${referrerName}. ` : ''}You will receive <span className="font-bold text-base text-emerald-500">$20</span> in credits to go towards your second paid month.
                </p>
              </motion.div>
            )}
            {referralError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive"
              >
                {referralError}
              </motion.p>
            )}
          </div>
        )}
      </motion.div>

      {/* Features list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="rounded-xl border bg-background p-6 mb-8"
      >
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center justify-center size-6 rounded-full bg-emerald-500/10 shrink-0">
                <Check className="size-4 text-emerald-500" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Button and helper text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="space-y-2"
      >
        <Button
          onClick={handleStartTrial}
          disabled={!canStart}
          className="w-full h-12 rounded-xl text-base"
        >
          {isStartingTrial ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              Start free trial
              <ArrowRight className="ml-2 size-5" />
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          No credit card required
        </p>
      </motion.div>
    </div>
  );
}
