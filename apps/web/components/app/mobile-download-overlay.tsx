'use client';

import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { AppStoreButton, GooglePlayButton } from '@/components/public/app-store-buttons';
import { AthliLogo } from '@/components/athli-logo';

interface MobileDownloadOverlayProps {
  userType: 'coach' | 'client';
}

export function MobileDownloadOverlay({ userType }: MobileDownloadOverlayProps) {
  const isCoach = userType === 'coach';

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Logo */}
      <div className="absolute left-6 top-6 z-20">
        <AthliLogo />
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <TextEffect
            as="h1"
            preset="fade-in-blur"
            speedReveal={1.5}
            speedSegment={1.5}
            className="text-2xl font-bold text-foreground mb-3"
          >
            Download the App
          </TextEffect>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-muted-foreground mb-8"
          >
            {isCoach
              ? 'The mobile app provides the best experience for managing your clients and growing your coaching business.'
              : 'The mobile app provides the best experience for tracking your workouts and achieving your fitness goals.'
            }
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex items-center justify-center gap-3"
          >
            <AppStoreButton href="#" />
            <GooglePlayButton href="#" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
