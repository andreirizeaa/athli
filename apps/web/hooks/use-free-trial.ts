import { useMemo } from 'react';
import { useGlobalData } from '@/providers/global-data-provider';

const FREE_TRIAL_DAYS = 30;

interface FreeTrialStatus {
  isOnTrial: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
}

/**
 * Hook to calculate free trial status for coaches
 * Trial is calculated based on days from coach profile creation date
 */
export function useFreeTrial(): FreeTrialStatus {
  const { user } = useGlobalData();

  return useMemo(() => {
    // Default state for non-coaches or missing data
    const defaultState: FreeTrialStatus = {
      isOnTrial: false,
      isTrialExpired: false,
      daysRemaining: 0,
      trialEndDate: null,
    };

    // Only coaches have trials
    if (!user || user.userType !== 'coach') {
      return defaultState;
    }

    // If trial is already completed (they subscribed), no trial
    if (user.freeTrialCompleted) {
      return defaultState;
    }

    // Use coach profile creation date for trial calculation
    const createdAt = user.coachCreatedAt || user.createdAt;
    if (!createdAt) {
      return defaultState;
    }

    const creationDate = new Date(createdAt);
    const today = new Date();

    // Calculate trial end date (30 days from creation, at end of day)
    const trialEndDate = new Date(creationDate);
    trialEndDate.setDate(trialEndDate.getDate() + FREE_TRIAL_DAYS);
    trialEndDate.setHours(23, 59, 59, 999);

    // Calculate days remaining (by comparing dates, not timestamps)
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDateOnly = new Date(trialEndDate.getFullYear(), trialEndDate.getMonth(), trialEndDate.getDate());

    const diffTime = endDateOnly.getTime() - todayDateOnly.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const daysRemaining = Math.max(0, diffDays);
    const isTrialExpired = daysRemaining <= 0;
    const isOnTrial = !isTrialExpired;

    return {
      isOnTrial,
      isTrialExpired,
      daysRemaining,
      trialEndDate,
    };
  }, [user]);
}
