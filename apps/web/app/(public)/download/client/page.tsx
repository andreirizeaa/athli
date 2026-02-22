'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AthliLogo } from '@/components/athli-logo';
import { AppStoreButton, GooglePlayButton } from '@/components/public/app-store-buttons';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/general/utils';

const CLIENT_SCREENSHOTS = [
  { folder: 'home', label: 'Home' },
  { folder: 'workouts', label: 'Workouts' },
  { folder: 'exercise-history', label: 'Exercise History' },
  { folder: 'progress', label: 'Progress' },
  { folder: 'progress-photos', label: 'Progress Photos' },
  { folder: 'metrics', label: 'Metrics' },
  { folder: 'habits', label: 'Habits' },
  { folder: 'chat', label: 'Chat' },
  { folder: 'forms', label: 'Forms' },
];

export default function DownloadClientPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? CLIENT_SCREENSHOTS.length - 1 : prev - 1));
  }, []);

  const scrollNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === CLIENT_SCREENSHOTS.length - 1 ? 0 : prev + 1));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        scrollNext();
      } else {
        scrollPrev();
      }
    }

    touchStartX.current = null;
  }, [scrollNext, scrollPrev]);

  const themeVariant = mounted ? (resolvedTheme === 'dark' ? 'dark' : 'light') : 'light';
  const currentScreenshot = CLIENT_SCREENSHOTS[currentIndex];

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-center px-6 py-4">
          <AthliLogo />
        </div>
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="absolute inset-0 hidden opacity-40 dark:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 py-6 overflow-hidden">
        {/* Header Section */}
        <div className="text-center max-w-md mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Your experience is waiting
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            Download the Athli app to access your personalized training
          </p>
          <div className="flex items-center justify-center gap-3">
            <AppStoreButton href="#" />
            <GooglePlayButton href="#" />
          </div>
        </div>

        {/* Carousel Section */}
        <div
          className="flex-1 flex items-center justify-center w-full max-w-lg min-h-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-center gap-2 md:gap-4 w-full">
            {/* Previous Button */}
            <Button
              variant="outline"
              size="icon"
              className="size-10 md:size-12 rounded-full shrink-0 bg-background/80 backdrop-blur-sm"
              onClick={scrollPrev}
            >
              <ChevronLeft className="size-5 md:size-6" />
              <span className="sr-only">Previous screenshot</span>
            </Button>

            {/* Phone Screenshot */}
            <div className="relative flex-1 flex items-center justify-center min-h-0 max-h-full">
              <div className="relative w-full max-w-[280px] aspect-[9/19.5]">
                <Image
                  src={`/mobile/client/${currentScreenshot.folder}/${themeVariant}.png`}
                  alt={`${currentScreenshot.label} screen`}
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </div>

            {/* Next Button */}
            <Button
              variant="outline"
              size="icon"
              className="size-10 md:size-12 rounded-full shrink-0 bg-background/80 backdrop-blur-sm"
              onClick={scrollNext}
            >
              <ChevronRight className="size-5 md:size-6" />
              <span className="sr-only">Next screenshot</span>
            </Button>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {CLIENT_SCREENSHOTS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'size-2 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Current label */}
        <p className="text-sm text-muted-foreground mt-2">{currentScreenshot.label}</p>
      </div>
    </div>
  );
}
