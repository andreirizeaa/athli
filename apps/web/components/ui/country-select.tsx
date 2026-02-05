'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import type { Country } from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/general/utils';
import en from 'react-phone-number-input/locale/en.json';

interface CountrySelectProps {
  value?: Country;
  onChange?: (country: Country) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const FlagComponent = ({ country, countryName }: { country: Country; countryName?: string }) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName || ''} />}
    </span>
  );
};

export const CountrySelect = React.forwardRef<HTMLButtonElement, CountrySelectProps>(
  ({ value, onChange, disabled, placeholder = 'Select country...', className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    const countries = React.useMemo(() => {
      return getCountries().map((country) => ({
        value: country,
        label: en[country] || country,
      }));
    }, []);

    const selectedCountry = countries.find((country) => country.value === value);

    return (
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (isOpen) {
            setSearchValue('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between bg-sidebar font-normal',
              !value && 'text-muted-foreground font-normal',
              className
            )}
          >
            {value ? (
              <div className="flex items-center gap-2">
                <FlagComponent country={value} countryName={selectedCountry?.label} />
                <span className="font-normal">{selectedCountry?.label}</span>
              </div>
            ) : (
              <span className="font-normal">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search country..."
              value={searchValue}
              onValueChange={(value) => {
                setSearchValue(value);
                setTimeout(() => {
                  if (scrollAreaRef.current) {
                    const viewportElement = scrollAreaRef.current.querySelector(
                      '[data-radix-scroll-area-viewport]'
                    );
                    if (viewportElement) {
                      viewportElement.scrollTop = 0;
                    }
                  }
                }, 0);
              }}
            />
            <CommandList>
              <ScrollArea ref={scrollAreaRef} className="h-72">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.value}
                      value={country.label}
                      onSelect={() => {
                        onChange?.(country.value);
                        setOpen(false);
                      }}
                      className="gap-2"
                    >
                      <FlagComponent
                        country={country.value}
                        countryName={country.label}
                      />
                      <span className="flex-1 text-sm">{country.label}</span>
                      <span className="text-sm text-foreground/50">
                        +{getCountryCallingCode(country.value)}
                      </span>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          value === country.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

CountrySelect.displayName = 'CountrySelect';
