'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  /** Screenshot paths for light and dark modes */
  screenshot?: {
    light: string;
    dark: string;
    alt?: string;
  };
  /** Custom content to render instead of screenshot */
  children?: ReactNode;
}

/**
 * Animated border effect for screenshots in upgrade dialogs
 */
function ScreenshotBorder({ width, height, gradientId }: { width: number; height: number; gradientId: string }) {
  const r = 8;

  if (width <= 0 || height <= 0) return null;

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 z-10"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="rgb(192,132,252)" />
          <stop offset="100%" stopColor="rgb(165,180,252)" />
        </linearGradient>
      </defs>
      <motion.rect
        x={1.5}
        y={1.5}
        width={width - 3}
        height={height - 3}
        rx={r}
        ry={r}
        pathLength={1}
        stroke={`url(#${gradientId})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.15 0.85"
        animate={{ strokeDashoffset: [0, -1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.rect
        x={1.5}
        y={1.5}
        width={width - 3}
        height={height - 3}
        rx={r}
        ry={r}
        pathLength={1}
        stroke={`url(#${gradientId})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="0.15 0.85"
        animate={{ strokeDashoffset: [-0.5, -1.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

/**
 * Screenshot preview component with animated border
 */
function ScreenshotPreview({ light, dark, alt, gradientId }: { light: string; dark: string; alt: string; gradientId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <ScreenshotBorder width={dims.w} height={dims.h} gradientId={gradientId} />
      <img
        src={light}
        alt={alt}
        className="block w-full h-auto rounded-lg border dark:hidden"
      />
      <img
        src={dark}
        alt={alt}
        className="hidden w-full h-auto rounded-lg border dark:block"
      />
    </div>
  );
}

/**
 * Reusable upgrade dialog component with consistent styling
 */
export function UpgradeDialog({
  open,
  onOpenChange,
  title = 'Upgrade to Pro',
  description,
  screenshot,
  children,
}: UpgradeDialogProps) {
  const router = useRouter();
  const gradientId = `border-grad-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {(screenshot || children) && (
          <div className="py-4">
            {screenshot ? (
              <ScreenshotPreview
                light={screenshot.light}
                dark={screenshot.dark}
                alt={screenshot.alt || `${title} preview`}
                gradientId={gradientId}
              />
            ) : (
              children
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={() => router.push('/settings/billing')}>
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
