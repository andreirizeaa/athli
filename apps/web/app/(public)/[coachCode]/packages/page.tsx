'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { AthliLogo } from '@/components/athli-logo';
import { TextEffect } from '@/components/ui/text-effect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPublicPackages } from '@/api/payments/payment-service';
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

export default function PublicPackagesPage() {
  const params = useParams();
  const router = useRouter();
  const coachCode = params.coachCode as string;

  const [packages, setPackages] = useState<CoachPackage[]>([]);
  const [coach, setCoach] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [company, setCompany] = useState<Awaited<ReturnType<typeof getPublicPackages>>['company']>(null);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [navigatingPackageId, setNavigatingPackageId] = useState<string | null>(null);

  const landingPageUrl = process.env.NEXT_PUBLIC_LANDING_PAGE || '/';

  useEffect(() => {
    if (!coachCode) return;

    const fetchData = async () => {
      try {
        const data = await getPublicPackages(coachCode);
        setStripeEnabled(data.stripe_enabled);
        setPackages(data.packages);
        setCoach(data.coach);
        setCompany(data.company);
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
          <p className="text-muted-foreground">This coach page doesn&apos;t exist or has no packages available.</p>
        </div>
      </div>
    );
  }

  if (!stripeEnabled || !coach) {
    return (
      <div className="relative min-h-screen bg-background">
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
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-2xl font-semibold mb-2">Packages Unavailable</h1>
            <p className="text-muted-foreground mb-6">
              This coach hasn&apos;t set up their packages yet. Check back later or visit our website to learn more.
            </p>
            <Button asChild>
              <a href={landingPageUrl}>Visit Athli</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = company?.company_name || coach.name.split(' ')[0];
  const coachAvatar = coach.logo_url;
  const coachInitials = coach.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen bg-background">
      <style jsx global>{`
        @keyframes packageFloatUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="fixed left-6 top-6 z-20">
        <AthliLogo />
      </div>

      {/* Grid Background - Light mode */}
      <div
        className="fixed inset-0 opacity-40 dark:hidden pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Grid Background - Dark mode */}
      <div
        className="fixed inset-0 hidden opacity-40 dark:block pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-6 md:pt-24 md:pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
            <TextEffect
              preset="fade-in-blur"
              speedSegment={0.3}
              as="h1"
              className="mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[5.25rem]"
            >
              {`${displayName}'s Packages`}
            </TextEffect>
            <TextEffect
              per="line"
              preset="fade-in-blur"
              speedSegment={0.3}
              delay={0.5}
              as="p"
              className="text-muted-foreground mx-auto mt-8 max-w-3xl text-balance text-lg"
            >
              Browse available coaching packages and find the perfect plan to help you reach your goals.
            </TextEffect>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="relative z-10 pb-16 md:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {packages.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-medium mb-2">No packages available</h2>
              <p className="text-muted-foreground">Check back later for available coaching packages.</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`flex flex-col rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md overflow-hidden w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[380px]${!pkg.is_active ? ' opacity-60' : ''}`}
                  style={{
                    animation: 'packageFloatUp 0.7s cubic-bezier(0.25, 0.1, 0.25, 1) 0.75s forwards',
                    opacity: 0,
                  }}
                >
                  {/* Image — edge-to-edge, top corners rounded via card overflow-hidden */}
                  <div className="w-full aspect-[3/2] bg-muted relative">
                    <img
                      src={pkg.image_url || DEFAULT_PACKAGE_IMAGE}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 p-5 sm:p-6">
                    {/* Coach avatar + Name */}
                    <div className="flex items-center gap-2">
                      {coachAvatar ? (
                        <img
                          src={coachAvatar}
                          alt=""
                          className="size-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-muted-foreground">{coachInitials}</span>
                        </div>
                      )}
                      <h3 className="text-lg font-semibold truncate">{pkg.name}</h3>
                    </div>

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

                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <Button
                      className="w-full"
                      disabled={!pkg.is_active || navigatingPackageId !== null}
                      onClick={() => {
                        setNavigatingPackageId(pkg.id);
                        router.push(`/auth/checkout/${coachCode}/${pkg.id}`);
                      }}
                    >
                      {navigatingPackageId === pkg.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : pkg.is_active ? (
                        <>
                          Get Started
                          <ArrowRight className="size-4" />
                        </>
                      ) : (
                        'Currently Unavailable'
                      )}
                    </Button>

                    {/* Features — below button */}
                    {pkg.features && pkg.features.length > 0 && (
                      <ul className="mt-4 space-y-2">
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
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
