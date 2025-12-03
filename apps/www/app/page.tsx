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

  useEffect(() => {
    if (!isLoaded || hasRedirected.current) {
      return;
    }

    // If user is signed in, redirect to app
    // This handles the case where Clerk redirects back to www after sign-in
    if (isSignedIn) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
      
      // Check if we're already on the app domain to prevent redirect loops
      const currentUrl = new URL(window.location.href);
      const appUrlObj = new URL(appUrl);
      
      // If already on the app domain, don't redirect
      if (currentUrl.origin === appUrlObj.origin) {
        return;
      }

      // Check for redirect loop using sessionStorage
      const redirectKey = 'www_redirect_attempts';
      const maxAttempts = 3;
      const redirectAttempts = parseInt(sessionStorage.getItem(redirectKey) || '0', 10);
      
      // If we've exceeded max redirect attempts, stop to prevent infinite loop
      if (redirectAttempts >= maxAttempts) {
        sessionStorage.removeItem(redirectKey);
        console.warn('Redirect loop detected, stopping redirect attempts');
        return;
      }

      // Check URL parameters to detect if we're in a redirect loop
      const urlParams = new URLSearchParams(window.location.search);
      const redirectedParam = urlParams.get('redirected');
      
      // If we've been redirected before, don't redirect again to prevent loops
      if (redirectedParam === 'true') {
        sessionStorage.removeItem(redirectKey);
        return;
      }

      // Check if we just came from the app domain (prevent redirect loops)
      // This happens when app redirects back to www due to session not being ready
      let shouldWait = false;
      if (document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          if (referrerUrl.origin === appUrlObj.origin) {
            // We just came from the app, increment redirect attempts
            sessionStorage.setItem(redirectKey, String(redirectAttempts + 1));
            shouldWait = true;
          }
        } catch {
          // Invalid referrer URL, continue with normal redirect
        }
      }

      // If not coming from app, reset redirect attempts
      if (!shouldWait) {
        sessionStorage.removeItem(redirectKey);
      }

      hasRedirected.current = true;
      setIsRedirecting(true);
      
      // If coming from app, wait longer for session to propagate
      // Otherwise redirect immediately
      const redirectDelay = shouldWait ? 1500 : 0;
      
      setTimeout(() => {
        window.location.replace(appUrl);
      }, redirectDelay);
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
