'use client';

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/general/utils';

const INTERVALS = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
  { value: 'year', label: 'Years' },
] as const;

type IntervalInputProps = {
  interval: string;
  onIntervalChange: (interval: string) => void;
  count: number;
  onCountChange: (count: number) => void;
  minCount?: number;
  maxCount?: number;
  className?: string;
  id?: string;
};

const IntervalInput = React.forwardRef<HTMLInputElement, IntervalInputProps>(
  ({ interval, onIntervalChange, count, onCountChange, minCount = 2, maxCount = 365, className, id }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const selected = INTERVALS.find((i) => i.value === interval) || INTERVALS[0];

    return (
      <div className={cn('flex', className)}>
        <Input
          ref={ref}
          id={id}
          type="number"
          min={minCount}
          max={maxCount}
          value={count}
          onChange={(e) => {
            const val = Math.max(minCount, parseInt(e.target.value) || minCount);
            onCountChange(val);
          }}
          className="rounded-s-lg rounded-e-none w-1/2 focus:z-10"
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex gap-1 rounded-s-none rounded-e-lg border-l-0 px-3 w-1/2 justify-between"
            >
              <span className="text-sm">{selected.label}</span>
              <ChevronsUpDown className="-mr-2 size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1" align="end">
            <div className="flex flex-col">
              {INTERVALS.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  className={cn(
                    'flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent transition-colors',
                    interval === i.value && 'bg-accent',
                  )}
                  onClick={() => {
                    onIntervalChange(i.value);
                    setIsOpen(false);
                  }}
                >
                  <span>{i.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

IntervalInput.displayName = 'IntervalInput';

export { IntervalInput, INTERVALS };
