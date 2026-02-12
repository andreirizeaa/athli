'use client';

import { ArrowRight, Check } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface FreeTrialStepProps {
  onContinue: () => void;
}

const features = [
  'Full access to all premium features',
  'Automate client onboarding and workflows',
  'Try Lyra, your AI coaching assistant',
  'Train and manage up to 50 clients',
];

export function FreeTrialStep({ onContinue }: FreeTrialStepProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-3xl font-bold text-foreground mb-3"
      >
        Start your 30-day free trial
      </TextEffect>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-muted-foreground text-lg mb-8 max-w-md"
      >
        We&apos;ve given you full access to explore everything Athli has to offer.
      </motion.p>

      {/* Features list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="rounded-xl border bg-background p-6 mb-8 w-full max-w-md"
      >
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              className="flex items-center gap-3 text-left"
            >
              <div className="flex items-center justify-center size-6 rounded-full bg-emerald-500/10 shrink-0">
                <Check className="size-4 text-emerald-500" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="flex flex-col items-center gap-3"
      >
        <Button
          onClick={onContinue}
          className="h-12 px-8 rounded-xl text-base"
        >
          Start free trial
          <ArrowRight className="ml-2 size-5" />
        </Button>
        <p className="text-sm text-muted-foreground">
          No credit card required
        </p>
      </motion.div>
    </div>
  );
}
