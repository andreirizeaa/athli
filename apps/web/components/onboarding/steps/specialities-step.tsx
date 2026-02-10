'use client';

import { Check } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { cn } from '@/lib/general/utils';

interface SpecialitiesStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const SPECIALITIES = [
  { label: 'Personal Training', value: 'personal-training' },
  { label: 'Strength', value: 'strength' },
  { label: 'Physiotherapy', value: 'physiotherapy' },
  { label: 'Sports Performance', value: 'sports-performance' },
  { label: 'CrossFit', value: 'crossfit' },
  { label: 'Weightlifting', value: 'weightlifting' },
  { label: 'Powerlifting', value: 'powerlifting' },
  { label: 'Bodybuilding', value: 'bodybuilding' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Yoga', value: 'yoga' },
  { label: 'Pilates', value: 'pilates' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Functional Training', value: 'functional-training' },
  { label: 'Rehabilitation', value: 'rehabilitation' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Wellness Coaching', value: 'wellness-coaching' },
  { label: 'Group Fitness', value: 'group-fitness' },
  { label: 'Athletic Development', value: 'athletic-development' },
  { label: 'Endurance Training', value: 'endurance-training' },
  { label: 'Speed & Agility', value: 'speed-agility' },
];

export function SpecialitiesStep({ value, onChange }: SpecialitiesStepProps) {
  const toggleSpeciality = (speciality: string) => {
    if (value.includes(speciality)) {
      onChange(value.filter(v => v !== speciality));
    } else {
      onChange([...value, speciality]);
    }
  };

  return (
    <div>
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2"
      >
        What do you specialise in?
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-6"
      >
        Select all that apply
      </motion.p>

      {/* Specialities Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="max-h-[320px] md:max-h-[380px] overflow-y-auto -mx-1 px-1"
      >
        <div className="flex flex-wrap gap-2 pt-1">
          {SPECIALITIES.map((speciality) => {
            const isSelected = value.includes(speciality.value);
            return (
              <button
                key={speciality.value}
                onClick={() => toggleSpeciality(speciality.value)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all bg-background',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-foreground/20'
                )}
              >
                {speciality.label}
                {isSelected && <Check className="size-3.5" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
