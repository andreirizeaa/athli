'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_PACKAGE_IMAGE } from '@/lib/constants/package-presets';
import type { CoachPackage } from '@athli/shared-types';

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatInterval(interval: string, intervalCount?: number | null): string {
  if (interval === 'one_time') return '';
  const count = intervalCount ?? 1;
  if (count > 1) return `/ ${count} ${interval}s`;
  if (interval === 'day') return '/ day';
  if (interval === 'week') return '/ week';
  if (interval === 'month') return '/ month';
  if (interval === 'year') return '/ year';
  return '';
}

interface PackageCardProps {
  pkg: CoachPackage;
  coachAvatar?: string | null;
  coachInitials?: string;
  showCoachInfo?: boolean;
  actionButton?: React.ReactNode;
  className?: string;
}

export function PackageCard({
  pkg,
  coachAvatar,
  coachInitials,
  showCoachInfo = false,
  actionButton,
  className = '',
}: PackageCardProps) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden max-w-[380px] w-full${!pkg.is_active ? ' opacity-60' : ''} ${className}`}
    >
      {/* Image */}
      <div className="w-full aspect-[3/2] bg-muted relative">
        <img
          src={pkg.image_url || DEFAULT_PACKAGE_IMAGE}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      <div className="flex-1 p-5 sm:p-6">
        {/* Coach avatar + Name */}
        {showCoachInfo && (coachAvatar || coachInitials) ? (
          <div className="flex items-center gap-2">
            {coachAvatar ? (
              <img
                src={coachAvatar}
                alt=""
                className="size-7 rounded-full object-cover flex-shrink-0"
              />
            ) : coachInitials ? (
              <div className="size-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-medium text-muted-foreground">{coachInitials}</span>
              </div>
            ) : null}
            <h3 className="text-lg font-semibold truncate">{pkg.name}</h3>
          </div>
        ) : (
          <h3 className="text-lg font-semibold truncate">{pkg.name}</h3>
        )}

        {pkg.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
        )}

        {/* Price + Currency pill */}
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold">
            {formatAmount(pkg.amount_cents, pkg.currency)}
          </span>
          {pkg.interval !== 'one_time' && (
            <span className="text-muted-foreground text-sm">
              {formatInterval(pkg.interval, pkg.interval_count)}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase font-medium ml-auto">
            {pkg.currency}
          </Badge>
        </div>

        {/* Initial fee */}
        {(pkg.initial_fee_cents ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            + {formatAmount(pkg.initial_fee_cents, pkg.currency)} initial fee
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {pkg.interval === 'one_time' && (
            <Badge variant="secondary">One-time</Badge>
          )}
          {(pkg.free_trial_days ?? 0) > 0 && (
            <Badge variant="outline">{pkg.free_trial_days}-day free trial</Badge>
          )}
        </div>
      </div>

      {/* Action button and features section */}
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {actionButton}

        {/* Features — below button */}
        {pkg.features && pkg.features.length > 0 && (
          <ul className={`space-y-2 ${actionButton ? 'mt-4' : ''}`}>
            {pkg.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-green-500 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
