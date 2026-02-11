'use client';

import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { TextEffect } from '@/components/ui/text-effect';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/general/utils';
import type { Country } from 'react-phone-number-input';
import { getCountries } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en';

interface CountryStepProps {
  value: Country | undefined;
  onChange: (value: Country | undefined) => void;
}

// Popular countries to show first
const POPULAR_COUNTRIES: Country[] = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BR', 'MX', 'IN'];

export function CountryStep({ value, onChange }: CountryStepProps) {
  const [search, setSearch] = useState('');

  const allCountries = useMemo(() => {
    return getCountries().map(code => ({
      code: code as Country,
      name: en[code] || code,
    }));
  }, []);

  const filteredCountries = useMemo(() => {
    const searchLower = search.toLowerCase();
    if (!search) {
      // Show popular countries first, then rest
      const popular = POPULAR_COUNTRIES.map(code => ({
        code,
        name: en[code] || code,
      }));
      const rest = allCountries.filter(c => !POPULAR_COUNTRIES.includes(c.code));
      return [...popular, ...rest];
    }
    return allCountries.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.code.toLowerCase().includes(searchLower)
    );
  }, [search, allCountries]);

  return (
    <div>
      <TextEffect
        as="h1"
        preset="fade-in-blur"
        speedReveal={1.5}
        speedSegment={1.5}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2"
      >
        Where are you based?
      </TextEffect>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-6"
      >
        Select your country
      </motion.p>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="relative mb-4"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 rounded-xl"
        />
      </motion.div>

      {/* Country Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="max-h-[280px] md:max-h-[350px] overflow-y-auto -mx-1 px-1"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {filteredCountries.slice(0, 30).map((country) => (
            <button
              key={country.code}
              onClick={() => onChange(value === country.code ? undefined : country.code)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border text-left transition-all bg-background',
                value === country.code
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-foreground/20'
              )}
            >
              <span className="text-xl">
                {getFlagEmoji(country.code)}
              </span>
              <span className="text-sm font-medium truncate flex-1">
                {country.name}
              </span>
              {value === country.code && (
                <Check className="size-4 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
        {filteredCountries.length > 30 && !search && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Search to find more countries
          </p>
        )}
      </motion.div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
