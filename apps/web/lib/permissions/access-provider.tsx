'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useFreeTrial } from '@/hooks/use-free-trial';
import { useGlobalData } from '@/providers/global-data-provider';

// DEV ONLY: Force simulate starter plan (must match entitlements-provider.tsx)
const FORCE_SIMULATE_STARTER = true;

export type AccessStatus = 'active' | 'trial' | 'expired' | 'loading';

export type AccessReason =
  | 'subscription'  // Has active Stripe subscription
  | 'trial'         // On free trial
  | 'none';         // No access

interface AccessContextType {
  /** Whether the user has access to the app */
  hasAccess: boolean;
  /** Current access status */
  status: AccessStatus;
  /** Why they have (or don't have) access */
  reason: AccessReason;
  /** Days remaining in trial (0 if not on trial) */
  trialDaysRemaining: number;
  /** Whether data is still loading */
  isLoading: boolean;
}

const AccessContext = createContext<AccessContextType>({
  hasAccess: false,
  status: 'loading',
  reason: 'none',
  trialDaysRemaining: 0,
  isLoading: true,
});

export const useAccess = () => useContext(AccessContext);

interface AccessProviderProps {
  children: ReactNode;
}

export function AccessProvider({ children }: AccessProviderProps) {
  const { user, isLoading: isUserLoading } = useGlobalData();
  const { isOnTrial, isTrialExpired, daysRemaining } = useFreeTrial();

  const value = useMemo<AccessContextType>(() => {
    // Still loading
    if (isUserLoading || !user) {
      return {
        hasAccess: false,
        status: 'loading',
        reason: 'none',
        trialDaysRemaining: 0,
        isLoading: true,
      };
    }

    // Only coaches need subscription/trial checks
    // Clients always have access (they're invited by coaches)
    if (user.userType === 'client') {
      return {
        hasAccess: true,
        status: 'active',
        reason: 'subscription', // Clients don't pay, their coach does
        trialDaysRemaining: 0,
        isLoading: false,
      };
    }

    // DEV: Force simulate starter plan - treat as active subscription
    if (FORCE_SIMULATE_STARTER) {
      return {
        hasAccess: true,
        status: 'active',
        reason: 'subscription',
        trialDaysRemaining: 0,
        isLoading: false,
      };
    }

    // Coach access logic:
    // 1. Check for active subscription (TODO: integrate with Stripe)
    // 2. Check for active trial
    // 3. Otherwise, no access

    // TODO: Add Stripe subscription check here
    // const hasActiveSubscription = checkStripeSubscription(user.id);
    const hasActiveSubscription = user.freeTrialCompleted; // For now, freeTrialCompleted means they subscribed

    if (hasActiveSubscription) {
      return {
        hasAccess: true,
        status: 'active',
        reason: 'subscription',
        trialDaysRemaining: 0,
        isLoading: false,
      };
    }

    if (isOnTrial) {
      return {
        hasAccess: true,
        status: 'trial',
        reason: 'trial',
        trialDaysRemaining: daysRemaining,
        isLoading: false,
      };
    }

    // Trial expired, no subscription
    return {
      hasAccess: false,
      status: 'expired',
      reason: 'none',
      trialDaysRemaining: 0,
      isLoading: false,
    };
  }, [user, isUserLoading, isOnTrial, isTrialExpired, daysRemaining]);

  return (
    <AccessContext.Provider value={value}>
      {children}
    </AccessContext.Provider>
  );
}
