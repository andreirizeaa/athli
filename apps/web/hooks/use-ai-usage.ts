'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAiPromptUsage,
  checkAndIncrementAiPrompt,
  type AiPromptUsage,
  type AiPromptCheckResult,
} from '@/api/billing/billing-service';
import { useEntitlements } from '@/lib/permissions/entitlements-provider';

// DEV ONLY: Force simulate unlimited AI access (bypass all checks)
const FORCE_SIMULATE_UNLIMITED_AI = true;

const DAILY_TRIAL_LIMIT = 5;

/**
 * Hook to manage AI assistant usage limits during trial
 *
 * During trial:
 * - AI assistant is available but limited to 5 prompts per day
 * - Use checkBeforePrompt() before each AI request
 * - Shows remaining prompts to user
 *
 * After trial (with AI addon):
 * - Unlimited prompts
 */
export function useAiUsage() {
  const queryClient = useQueryClient();
  const { isOnTrial, hasAddon } = useEntitlements();

  // DEV: Force unlimited access when simulating
  if (FORCE_SIMULATE_UNLIMITED_AI) {
    return {
      usage: {
        current_count: 0,
        daily_limit: Infinity,
        remaining: Infinity,
        is_limited: false,
      },
      isLimited: false,
      hasUnlimitedAccess: true,
      remaining: Infinity,
      dailyLimit: Infinity,
      currentCount: 0,
      hasReachedLimit: false,
      isLoading: false,
      checkBeforePrompt: async () => ({ allowed: true }),
      refetch: () => {},
    };
  }

  // Only fetch usage if on trial (paid users with addon have unlimited)
  const shouldTrackUsage = isOnTrial;
  const hasUnlimitedAccess = !isOnTrial && hasAddon('ai_assistant');

  const {
    data: usage,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: getAiPromptUsage,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    enabled: shouldTrackUsage,
  });

  const checkMutation = useMutation({
    mutationFn: checkAndIncrementAiPrompt,
    onSuccess: () => {
      // Invalidate the usage query to refresh count
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    },
  });

  /**
   * Check if AI prompt is allowed and increment count if so
   * Call this BEFORE making an AI request
   *
   * Returns: { allowed: boolean, message?: string }
   */
  const checkBeforePrompt = async (): Promise<{ allowed: boolean; message?: string }> => {
    // If has unlimited access (paid addon), always allow
    if (hasUnlimitedAccess) {
      return { allowed: true };
    }

    // If on trial, check the limit
    if (isOnTrial) {
      try {
        const result = await checkMutation.mutateAsync();

        if (!result.allowed) {
          return {
            allowed: false,
            message: `You've reached your daily limit of ${result.daily_limit} AI prompts during the trial. Upgrade to Pro or Max for unlimited AI access.`,
          };
        }

        return { allowed: true };
      } catch (error) {
        // On error, still allow (fail open for better UX)
        console.error('Failed to check AI usage:', error);
        return { allowed: true };
      }
    }

    // If no access to AI assistant at all
    return {
      allowed: false,
      message: 'AI assistant requires a Pro or Max plan, or the AI Assistant add-on.',
    };
  };

  // Calculate display values
  const remaining = hasUnlimitedAccess
    ? Infinity
    : (usage?.remaining ?? DAILY_TRIAL_LIMIT);

  const dailyLimit = hasUnlimitedAccess
    ? Infinity
    : (usage?.daily_limit ?? DAILY_TRIAL_LIMIT);

  const currentCount = usage?.current_count ?? 0;
  const isLimited = isOnTrial;
  const hasReachedLimit = isOnTrial && (usage?.remaining ?? DAILY_TRIAL_LIMIT) <= 0;

  return {
    /** Current usage stats */
    usage: usage ?? {
      current_count: 0,
      daily_limit: DAILY_TRIAL_LIMIT,
      remaining: DAILY_TRIAL_LIMIT,
      is_limited: isOnTrial,
    },
    /** Whether user is on trial with limited prompts */
    isLimited,
    /** Whether user has unlimited AI access (paid addon) */
    hasUnlimitedAccess,
    /** Number of prompts remaining today */
    remaining,
    /** Daily limit (Infinity if unlimited) */
    dailyLimit,
    /** Current prompt count for today */
    currentCount,
    /** Whether the daily limit has been reached */
    hasReachedLimit,
    /** Loading state */
    isLoading,
    /** Check and increment before making AI request */
    checkBeforePrompt,
    /** Refetch current usage */
    refetch,
  };
}
