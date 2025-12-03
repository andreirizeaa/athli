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
    // Don't run until Clerk has finished loading
    if (!isLoaded) return;
  
    // Prevent double runs
    if (hasRedirected.current) return;
  
    // Only redirect when the user is signed in
    if (!isSignedIn) return;
  
    const appUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://one-ninety-app.vercel.app'
        : 'http://localhost:3001';
  
    const currentUrl = new URL(window.location.href);
    const appUrlObj = new URL(appUrl);

    console.log('currentUrl', currentUrl.origin);
    console.log('appUrlObj', appUrlObj.origin);
    console.log('signed in', isSignedIn);
  
    // Only redirect if we're not already on the app domain
    if (currentUrl.origin !== appUrlObj.origin) {
      hasRedirected.current = true;
      setIsRedirecting(true);
  
      // Redirect after a short tick to let Clerk hydrate fully
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = appUrl;
      }, 150);
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
