'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    // Wait a bit to let Clerk's redirect happen first
    // This is a fallback redirect in case Clerk's redirect didn't work
    const redirectTimer = setTimeout(() => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      
      if (!appUrl) {
        console.warn('NEXT_PUBLIC_APP_URL is not set. Please set it in your Vercel environment variables.');
        return;
      }
      

      if (typeof window === 'undefined') {
        return;
      }

      try {
        // Normalize URLs (remove trailing slashes for comparison)
        const normalizedAppUrl = appUrl.replace(/\/$/, '');
        const currentUrl = window.location.href;
        const currentUrlNormalized = currentUrl.replace(/\/$/, '');
        
        const appUrlObj = new URL(normalizedAppUrl);
        const currentUrlObj = new URL(currentUrlNormalized);
        
        // Only redirect if we're still on the www domain (Clerk's redirect didn't work)
        // This prevents redirect loops
        if (currentUrlObj.hostname !== appUrlObj.hostname && !currentUrlNormalized.startsWith(normalizedAppUrl)) {
          setIsRedirecting(true);
          // Use replace to avoid adding to history
          window.location.replace(normalizedAppUrl);
        }
      } catch (error) {
        console.error('Error during redirect:', error);
      }
    }, 1500); // Give Clerk more time to redirect first

    return () => clearTimeout(redirectTimer);
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
