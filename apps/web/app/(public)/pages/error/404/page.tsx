'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

export default function Page() {
  const t = useTranslations();
  const [gridOpacities, setGridOpacities] = useState<number[]>([]);

  useEffect(() => {
    setGridOpacities(
      Array.from({ length: 100 }, () => Math.random() * 0.5 + 0.5)
    );
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        <div className="bg-primary/5 border-primary/10 relative flex min-h-64 items-center justify-center overflow-hidden rounded-lg border py-12 sm:min-h-80">
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
              {t('error.notFound.heading')}
            </div>
            <div className="text-foreground text-xl font-medium sm:text-2xl">
              {t('error.notFound.message')}
            </div>
            <div className="mt-6">
              <Button asChild variant="outline" size="lg" className="group">
                <Link href="/home" aria-label={t('error.notFound.backToHomeAria')}>
                  {t('error.notFound.backToHome')}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="from-background/80 absolute right-0 bottom-0 left-0 h-1/3 bg-gradient-to-t to-transparent" />
        </div>
      </div>
    </div>
  );
}

