'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPublicPackages } from '@/api/payments/payment-service';
import type { CoachPackage } from '@athli/shared-types';

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
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

export default function PublicPackagesPage() {
  const params = useParams();
  const coachCode = params.coachCode as string;

  const [packages, setPackages] = useState<CoachPackage[]>([]);
  const [coach, setCoach] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!coachCode) return;

    const fetchData = async () => {
      try {
        const data = await getPublicPackages(coachCode);
        setPackages(data.packages);
        setCoach(data.coach);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [coachCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
          <p className="text-muted-foreground">This coach page doesn&apos;t exist or has no packages available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Coach header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {coach.logo_url && (
              <Image
                src={coach.logo_url}
                alt={coach.name}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-semibold">{coach.name}</h1>
              <p className="text-muted-foreground">Coaching Packages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Packages grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {packages.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-medium mb-2">No packages available</h2>
            <p className="text-muted-foreground">Check back later for available coaching packages.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className={`flex flex-col p-6${!pkg.is_active ? ' opacity-60' : ''}`}>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                  )}

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {formatAmount(pkg.amount_cents, pkg.currency)}
                    </span>
                    {pkg.interval !== 'one_time' && (
                      <span className="text-muted-foreground ml-1">{formatInterval(pkg.interval, pkg.interval_count)}</span>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pkg.interval === 'one_time' && <Badge variant="secondary">One-time</Badge>}
                    {(pkg.free_trial_days ?? 0) > 0 && (
                      <Badge variant="outline">{pkg.free_trial_days}-day free trial</Badge>
                    )}
                  </div>

                  {/* Features */}
                  {pkg.features && pkg.features.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="size-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button className="w-full" disabled={!pkg.is_active}>
                  {pkg.is_active ? 'Get Started' : 'Currently Unavailable'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
