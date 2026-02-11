'use client';

import { Globe } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';

interface WebsiteStepProps {
  value: string;
  onChange: (value: string) => void;
}

export function WebsiteStep({ value, onChange }: WebsiteStepProps) {
  return (
    <div>
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2"
      >
        Got a website?
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-8"
      >
        Help clients find you online
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="relative"
      >
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-11 rounded-xl"
        />
      </motion.div>
    </div>
  );
}
