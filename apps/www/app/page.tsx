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
    if (!isLoaded) {
      return;
    }

    // If user is signed in, immediately redirect to app
    // This handles the case where Clerk redirects back to www after sign-in
    if (isSignedIn) {
      setIsRedirecting(true);
      const appUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://app.oneninety.com'
          : 'http://localhost:3001';
      // Use replace to avoid adding to history
      window.location.replace(appUrl);
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
