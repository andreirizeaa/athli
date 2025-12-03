'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import HeroSection from '@/components/hero-section';
import Features from '@/components/features-4';
import Footer from '@/components/footer';
import FAQsTwo from '@/components/faqs-2';
import Pricing from '@/components/pricing';
import { Spinner } from '@/components/ui/spinner';
import FeaturesSection from '@/components/features-7';

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasRedirected = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || hasRedirected.current) {
      return;
    }

    // If user is signed in, redirect to app
    // This handles the case where Clerk redirects back to www after sign-in
    if (isSignedIn) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
      
      // Validate appUrl
      if (!appUrl || appUrl === 'undefined') {
        console.error('NEXT_PUBLIC_APP_URL is not set correctly');
        return;
      }
      
      // Check if we're already on the app domain to prevent redirect loops
      const currentUrl = new URL(window.location.href);
      let appUrlObj: URL;
      
      try {
        appUrlObj = new URL(appUrl);
      } catch (error) {
        console.error('Invalid app URL:', appUrl, error);
        return;
      }
      
      // If already on the app domain, don't redirect
      if (currentUrl.origin === appUrlObj.origin) {
        return;
      }

      // Check URL parameters for loop prevention flag
      const urlParams = new URLSearchParams(window.location.search);
      const loopPreventionFlag = urlParams.get('__www_redirect');
      
      // If we have the loop prevention flag, we've already tried redirecting
      // Wait a bit longer and try once more, then stop
      if (loopPreventionFlag === 'true') {
        // Check how many times we've been here
        const retryCount = parseInt(sessionStorage.getItem('www_redirect_retry') || '0', 10);
        
        if (retryCount >= 1) {
          // We've already retried, stop to prevent infinite loop
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('__www_redirect');
          window.history.replaceState({}, '', newUrl.toString());
          sessionStorage.removeItem('www_redirect_retry');
          console.warn('Redirect loop detected, stopping redirect after retry');
          return;
        }
        
        // Increment retry count and wait longer
        sessionStorage.setItem('www_redirect_retry', String(retryCount + 1));
        hasRedirected.current = true;
        setIsRedirecting(true);
        
        redirectTimeoutRef.current = setTimeout(() => {
          console.log('Retrying redirect to app (without flag):', appUrl);
          window.location.replace(appUrl);
        }, 2000);
        return;
      }

      // Normal redirect - user is signed in and we're on www
      hasRedirected.current = true;
      setIsRedirecting(true);
      
      // Log for debugging
      console.log('User signed in, redirecting to app:', appUrl);
      console.log('Current URL:', window.location.href);
      
      // Redirect immediately (or with minimal delay)
      redirectTimeoutRef.current = setTimeout(() => {
        // Add redirect flag to help app identify this is from www
        const redirectUrl = new URL(appUrl);
        redirectUrl.searchParams.set('__www_redirect', 'true');
        const finalUrl = redirectUrl.toString();
        console.log('Executing redirect to:', finalUrl);
        // Use href instead of replace to ensure it happens
        window.location.href = finalUrl;
      }, 100);
    }
  }, [isLoaded, isSignedIn]);

  return (
    <>
      <HeroSection />
      <Features />
      <FeaturesSection />
      <FAQsTwo />
      <Footer />
      {isRedirecting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">Redirecting to app...</p>
          </div>
        </div>
      )}
    </>
  );
}
