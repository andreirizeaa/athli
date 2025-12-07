import { QueryClient } from '@tanstack/react-query';
import { clearAllLoadingLifts } from './lifts/loadingLiftsStorage';
import { clearAllUserData } from './storageService';
import { showAlert } from './alertService';

// Global context reset functions - these will be set by the contexts themselves
let resetLiftDataContext: (() => void) | null = null;
let resetUserDetailsContext: (() => void) | null = null;
let resetUserCheckInsContext: (() => void) | null = null;
let resetLoadingLiftsContext: (() => void) | null = null;
let resetTutorialContext: (() => void) | null = null;
let resetOnboardingContext: (() => void) | null = null;

// Functions to register context reset functions
export function registerContextResetters(resetters: {
  resetLiftDataContext?: () => void;
  resetUserDetailsContext?: () => void;
  resetUserCheckInsContext?: () => void;
  resetLoadingLiftsContext?: () => void;
  resetTutorialContext?: () => void;
  resetOnboardingContext?: () => void;
}) {
  if (resetters.resetLiftDataContext) resetLiftDataContext = resetters.resetLiftDataContext;
  if (resetters.resetUserDetailsContext)
    resetUserDetailsContext = resetters.resetUserDetailsContext;
  if (resetters.resetUserCheckInsContext)
    resetUserCheckInsContext = resetters.resetUserCheckInsContext;
  if (resetters.resetLoadingLiftsContext)
    resetLoadingLiftsContext = resetters.resetLoadingLiftsContext;
  if (resetters.resetTutorialContext) resetTutorialContext = resetters.resetTutorialContext;
  if (resetters.resetOnboardingContext) resetOnboardingContext = resetters.resetOnboardingContext;
}

/**
 * Clears all user data from React Query cache and contexts
 */
export async function clearAllContextData(queryClient: QueryClient): Promise<void> {
  try {
    // Clear all React Query cache
    await queryClient.clear();

    // Clear loading lifts from storage
    await clearAllLoadingLifts();

    // Clear all AsyncStorage data
    await clearAllUserData();
  } catch (error) {
    throw error;
  }
}

/**
 * Clears user-specific data from contexts without clearing everything
 */
export async function clearUserSpecificData(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  try {
    // Clear ALL queries to prevent any cached data from persisting
    await queryClient.clear();

    // Invalidate all queries to ensure fresh data on next fetch
    await queryClient.invalidateQueries();

    // Reset all queries to their initial state
    await queryClient.resetQueries();

    // Reset all context states to their initial values using global functions
    try {
      (global as any).resetLiftDataContext?.();
      (global as any).resetUserDetailsContext?.();
      (global as any).resetUserCheckInsContext?.();
      (global as any).resetLoadingLiftsContext?.();
      (global as any).resetTutorialContext?.();
      (global as any).resetOnboardingContext?.();
    } catch (contextError) {}

    // Clear loading lifts from storage
    await clearAllLoadingLifts();

    // Clear all AsyncStorage data
    await clearAllUserData();
  } catch (error) {
    showAlert(
      'Error',
      'An error occurred while clearing your data. Please try again.',
      undefined,
      'CONTEXT_CLEANUP_SERVICE_ERROR',
      error
    );
    throw error;
  }
}
