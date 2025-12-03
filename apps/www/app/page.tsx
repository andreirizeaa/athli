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
      
      // Check if we're already on the app domain to prevent redirect loops
      const currentUrl = new URL(window.location.href);
      const appUrlObj = new URL(appUrl);
      
      // If already on the app domain, don't redirect
      if (currentUrl.origin === appUrlObj.origin) {
        return;
      }

      hasRedirected.current = true;
      setIsRedirecting(true);
      
      // Redirect to app (simple, like localhost)
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.replace(appUrl);
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
