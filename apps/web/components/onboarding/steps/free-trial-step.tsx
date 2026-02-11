'use client';

import { ArrowRight, Check, Crown, Sparkles, Workflow, Users } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface FreeTrialStepProps {
  onContinue: () => void;
}

const features = [
  {
    icon: Crown,
    title: 'Max plan access',
    description: 'Full access to all premium features',
  },
  {
    icon: Workflow,
    title: 'Automations included',
    description: 'Automate client onboarding and workflows',
  },
  {
    icon: Sparkles,
    title: 'Limited AI assistant',
    description: 'Try Lyra, your AI coaching assistant',
  },
  {
    icon: Users,
    title: 'Up to 50 clients',
    description: 'Train and manage up to 50 clients',
  },
];

export function FreeTrialStep({ onContinue }: FreeTrialStepProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex items-center justify-center size-16 rounded-2xl bg-primary/10"
      >
        <Crown className="size-8 text-primary" />
      </motion.div>

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

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="grid grid-cols-2 gap-4 mb-8 w-full max-w-md"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border"
          >
            <div className="flex items-center justify-center size-10 rounded-full bg-emerald-500/10 mb-3">
              <feature.icon className="size-5 text-emerald-500" />
            </div>
            <p className="font-medium text-sm">{feature.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
          </motion.div>
        ))}
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
