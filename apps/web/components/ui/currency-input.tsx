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

const CURRENCIES = [
  { value: 'usd', label: 'USD', symbol: '$' },
  { value: 'gbp', label: 'GBP', symbol: '£' },
  { value: 'eur', label: 'EUR', symbol: '€' },
] as const;

type CurrencyInputProps = {
  currency: string;
  onCurrencyChange?: (currency: string) => void;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  currencyDisabled?: boolean;
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency, onCurrencyChange, value, onValueChange, placeholder = '0.00', className, id, currencyDisabled }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const selected = CURRENCIES.find((c) => c.value === currency) || CURRENCIES[0];

    const currencyButton = (
      <Button
        type="button"
        variant="outline"
        className={cn(
          'flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10 shrink-0',
          currencyDisabled && 'pointer-events-none',
        )}
        disabled={currencyDisabled}
      >
        <span className="text-sm font-medium">{selected.symbol}</span>
        <span className="text-sm">{selected.label}</span>
        {!currencyDisabled && <ChevronsUpDown className="-mr-2 size-4 opacity-50" />}
      </Button>
    );

    return (
      <div className={cn('flex', className)}>
        {currencyDisabled ? (
          currencyButton
        ) : (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              {currencyButton}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1" align="start">
              <div className="flex flex-col">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent transition-colors',
                      currency === c.value && 'bg-accent',
                    )}
                    onClick={() => {
                      onCurrencyChange?.(c.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="w-4 text-center">{c.symbol}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Input
          ref={ref}
          id={id}
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (val.includes('.') && val.split('.')[1]?.length > 2) return;
            onValueChange(val);
          }}
          placeholder={placeholder}
          className="rounded-e-lg rounded-s-none flex-1"
        />
      </div>
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput, CURRENCIES };
