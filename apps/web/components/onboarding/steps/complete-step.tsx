'use client';

import { ArrowRight } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface CompleteStepProps {
  onComplete: () => void;
}

export function CompleteStep({ onComplete }: CompleteStepProps) {
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
          onClick={onComplete}
          className="h-12 px-8 rounded-xl text-base"
        >
          Go to my dashboard
          <ArrowRight className="ml-2 size-5" />
        </Button>
      </motion.div>
    </div>
  );
}
