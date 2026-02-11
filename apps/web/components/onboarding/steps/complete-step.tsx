'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface CompleteStepProps {
  onComplete: () => void;
}

export function CompleteStep({ onComplete }: CompleteStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-3xl font-bold text-foreground mb-3"
      >
        You&apos;re all set!
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground text-lg mb-8"
      >
        Your business profile is ready.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Button
          onClick={handleClick}
          disabled={isLoading}
          className="h-12 min-w-[220px] rounded-xl text-base"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              Go to my dashboard
              <ArrowRight className="ml-2 size-5" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
