'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthErrorAlertProps {
  /** The current pathname (e.g., '/auth/login') */
  pathname: string;
}

export function AuthErrorAlert({ pathname }: AuthErrorAlertProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for errors in both query params and hash
    const queryError = searchParams.get('error');
    const queryErrorDescription = searchParams.get('error_description');
    const queryErrorCode = searchParams.get('error_code');

    // Parse hash for errors (some OAuth flows put errors in hash)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const hashError = hashParams.get('error');
    const hashErrorDescription = hashParams.get('error_description');
    const hashErrorCode = hashParams.get('error_code');

    const error = queryError || hashError;
    const errorDescription = queryErrorDescription || hashErrorDescription;
    const errorCode = queryErrorCode || hashErrorCode;

    if (error) {
      // Map error codes to user-friendly messages
      let message = 'We\'re sorry, but an issue occurred while trying to sign you in. Please try again in a few moments.';

      if (errorCode === 'unexpected_failure' || error === 'server_error') {
        message = 'We\'re sorry, but something went wrong on our end. Please try again in a few moments.';
      } else if (error === 'access_denied') {
        message = 'We\'re sorry, but the authentication request was denied. Please try again or contact support if this continues.';
      } else if (error === 'invalid_request') {
        message = 'We\'re sorry, but the authentication request was invalid. Please try again or contact support if this continues.';
      } else if (errorDescription) {
        message = `We're sorry, but ${decodeURIComponent(errorDescription.replace(/\+/g, ' '))}`;
      }

      setErrorMessage(message);
      setIsVisible(true);

      // Clean the URL by removing query params and hash
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setErrorMessage(null), 300);
  };

  if (!errorMessage || !isVisible) {
    return null;
  }

  return (
    <div className="w-full animate-in fade-in duration-300">
      <Alert className="bg-red-500/10 dark:bg-red-500/20 border-red-500/30 relative pr-12">
        <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="min-w-0 text-red-700 dark:text-red-200">
          {errorMessage}
        </AlertDescription>
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-red-600 dark:text-red-300"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
}
