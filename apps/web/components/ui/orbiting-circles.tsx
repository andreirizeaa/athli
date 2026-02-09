'use client';

import { cn } from '@/lib/general/utils';

interface OrbitingCirclesProps {
  children: React.ReactNode;
  radius: number;
  duration?: number;
  delay?: number;
  reverse?: boolean;
  className?: string;
}

export function OrbitingCircles({
  children,
  radius,
  duration = 20,
  delay = 0,
  reverse = false,
  className,
}: OrbitingCirclesProps) {
  const angle = delay * (360 / duration);

  return (
    <div
      className={cn(
        'absolute left-1/2 top-1/2 flex size-10 items-center justify-center',
        className,
      )}
      style={
        {
          '--radius': radius,
          '--angle': angle,
          marginLeft: '-20px',
          marginTop: '-20px',
          animation: `orbit ${duration}s linear infinite${reverse ? ' reverse' : ''}`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
