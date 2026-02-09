'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { rateLimitEvents } from '@/lib/rate-limit-events';

export function RateLimitOverlay() {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);
  const [gridOpacities, setGridOpacities] = useState<number[]>([]);

  useEffect(() => {
    setGridOpacities(
      Array.from({ length: 100 }, () => Math.random() * 0.5 + 0.5)
    );
  }, []);

  useEffect(() => {
    const unsubscribe = rateLimitEvents.onRateLimited(() => {
      setIsVisible(true);
    });
    return unsubscribe;
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl space-y-4 lg:space-y-8">
        <div className="bg-primary/5 border-primary/10 relative flex h-64 items-center justify-center overflow-hidden rounded-lg border sm:h-80">
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="border-primary/30 border-1"
                style={{
                  opacity: gridOpacities[i] ?? 0.75,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            <div className="text-primary mb-4 text-8xl font-black tracking-tighter sm:text-9xl">
              {t('error.rateLimit.heading')}
            </div>
            <div className="text-foreground text-xl font-medium sm:text-2xl">
              {t('error.rateLimit.message')}
            </div>
          </div>

          <div className="from-background/80 absolute right-0 bottom-0 left-0 h-1/3 bg-gradient-to-t to-transparent" />
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setIsVisible(false);
              window.location.reload();
            }}
          >
            {t('error.rateLimit.tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  );
}
