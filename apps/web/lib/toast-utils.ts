import { toast } from 'sonner';
import { isSessionExpiredError } from '@/api/api-client';

/**
 * Show an error toast, but suppress it for session expired errors
 * (since the session expired dialog handles those)
 */
export const showErrorToast = (error: unknown, fallbackMessage = 'An error occurred'): void => {
    // Don't show toast for session expired errors - the dialog handles it
    if (isSessionExpiredError(error)) {
        return;
    }

    const message = error instanceof Error && error.message ? error.message : fallbackMessage;
    
    // Don't show empty toast messages
    if (!message) {
        return;
    }
    
    toast.error(message);
};

/**
 * Check if an error should suppress the toast
 * Useful for manual error handling in catch blocks
 */
export const shouldSuppressErrorToast = (error: unknown): boolean => {
    return isSessionExpiredError(error);
};
