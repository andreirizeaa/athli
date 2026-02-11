'use client';

import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';

interface CompanyNameStepProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompanyNameStep({ value, onChange }: CompanyNameStepProps) {
  return (
    <div>
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2"
      >
        What's your business called?
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-8"
      >
        This will be shown to your clients
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 rounded-xl text-lg"
          autoFocus
        />
      </motion.div>
    </div>
  );
}
