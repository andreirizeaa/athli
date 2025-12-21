import * as React from 'react';
import { cn } from '@/lib/general/utils';

interface RequiredAsteriskProps {
  className?: string;
}

export const RequiredAsterisk = ({ className }: RequiredAsteriskProps) => {
  return (
    <span className={cn('text-destructive ml-1 mb-1 inline-block', className)}>*</span>
  );
};

