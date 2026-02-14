'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccess } from '@/lib/permissions';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { useEntitlements, useSubscription } from '@/hooks/use-entitlements';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/api-client';
import confetti from 'canvas-confetti';
import { InvoicesCard } from './invoices-card';

interface Invoice {
  id: string;
  period_end: number;
}

interface InvoicesResponse {
  invoices: Invoice[];
}

// Plan display names
const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
};

// Format date for display
const formatCancelDate = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const BillingPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, trialDaysRemaining } = useAccess();
  const { clients, isLoading: isLoadingClients } = useCoachClients();
  const {
    plan,
    clientLimit,
    isTrial,
    hasAutomations,
    hasAiAssistant,
    hasPayments,
    isLoading: isLoadingEntitlements,
  } = useEntitlements();
  const {
    totalMonthlyCents,
    billingInterval,
    isCancelling,
    cancellingAddons,
    nextBillingDate,
    hasScheduledChanges,
    scheduledPlan,
    scheduledClientLimit,
    scheduledPriceCents,
    isLoading: isLoadingSubscription,
  } = useSubscription();
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch invoices to get period_end date (fallback when subscription.current_period_end is null)
  const { data: invoicesData } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => apiFetch<InvoicesResponse>('/billing/invoices'),
    staleTime: 5 * 60 * 1000,
  });

  // Get the cancellation date from subscription or latest invoice
  const cancellationDate = useMemo(() => {
    if (nextBillingDate) return nextBillingDate;
    // Fallback to latest invoice's period_end
    const latestInvoice = invoicesData?.invoices?.[0];
    if (latestInvoice?.period_end) {
      return new Date(latestInvoice.period_end * 1000);
    }
    return null;
  }, [nextBillingDate, invoicesData]);

  // Show confetti on successful checkout and remove success param from URL
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      // Invalidate cached data to show updated entitlements/subscription
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });

      // Remove success param from URL without reload
      router.replace('/settings/billing', { scroll: false });

      // Sidebar is ~256px, so offset the x origin to center in content area
      // Calculate x as: (sidebarWidth + contentWidth/2) / windowWidth
      const sidebarWidth = 256;
      const contentCenterX = (sidebarWidth + (window.innerWidth - sidebarWidth) / 2) / window.innerWidth;

      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];

      // First burst - from left angle
      confetti({
        particleCount: 80,
        spread: 55,
        angle: 60,
        origin: { x: contentCenterX - 0.1, y: 0.6 },
        colors,
      });

      // Second burst - from right angle, 300ms later
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 55,
          angle: 120,
          origin: { x: contentCenterX + 0.1, y: 0.6 },
          colors,
        });
      }, 300);
    }
  }, [searchParams, router, queryClient]);

  const activeClientsCount = clients.length;

  // Build current plan from entitlements
  const currentPlan = useMemo(() => {
    const addons: { name: string; included: boolean; isCancelling: boolean; addonType: string }[] = [];
    if (hasAutomations) addons.push({ name: 'Automations', included: true, isCancelling: cancellingAddons.includes('automations'), addonType: 'automations' });
    if (hasAiAssistant) addons.push({ name: 'AI Assistant', included: true, isCancelling: cancellingAddons.includes('ai_assistant'), addonType: 'ai_assistant' });
    if (hasPayments) addons.push({ name: 'Payments', included: true, isCancelling: cancellingAddons.includes('payments'), addonType: 'payments' });

    return {
      name: PLAN_NAMES[plan] || plan,
      isTrial: isTrial || status === 'trial',
      clientsLimit: clientLimit,
      price: isTrial ? 0 : totalMonthlyCents / 100,
      billingInterval: billingInterval || 'month' as const,
      addons,
    };
  }, [plan, isTrial, status, clientLimit, hasAutomations, hasAiAssistant, hasPayments, totalMonthlyCents, billingInterval, cancellingAddons]);

  const clientPercentage = currentPlan.clientsLimit > 0
    ? (activeClientsCount / currentPlan.clientsLimit) * 100
    : 0;

  const handleChangePlan = () => {
    if (currentPlan.isTrial) {
      setShowTrialWarning(true);
    } else {
      setIsNavigating(true);
      router.push('/settings/billing/update');
    }
  };

  const handleConfirmTrialEnd = () => {
    setShowTrialWarning(false);
    setIsNavigating(true);
    router.push('/settings/billing/update');
  };

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-auto">
        <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
          {/* Current Plan Card - Two-card layout when scheduled changes exist */}
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <div className="flex items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                {currentPlan.isTrial && (
                  <span className="px-2.5 py-0.5 text-sm font-medium rounded-sm border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    {trialDaysRemaining} days left in trial
                  </span>
                )}
                {!currentPlan.isTrial && hasScheduledChanges && (
                  <span className="px-2.5 py-0.5 text-sm font-medium rounded-sm border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    Changes scheduled
                  </span>
                )}
              </div>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-4 pt-1 pb-4">
              {/* Show two-card layout when there are scheduled changes */}
              {!currentPlan.isTrial && hasScheduledChanges && (scheduledPlan || scheduledClientLimit || cancellingAddons.length > 0) ? (
                <div className="space-y-4">
                  {/* Current Plan Card */}
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-base font-semibold text-foreground">Current Plan</p>
                      {(cancellationDate || nextBillingDate) && (
                        <span className="text-xs font-medium px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                          Until {(cancellationDate || nextBillingDate)!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium">{currentPlan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clients:</span>
                        <span className="font-medium">{currentPlan.clientsLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">${currentPlan.price}/{currentPlan.billingInterval === 'month' ? 'mo' : 'yr'}</span>
                      </div>
                      {currentPlan.addons.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Add-ons:</span>
                          <span className="font-medium">{currentPlan.addons.map(a => a.name).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      You'll keep all your current features until your next billing date.
                    </p>
                  </div>

                  {/* New Plan Card */}
                  <div className="border rounded-lg p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-base font-semibold text-foreground">New Plan</p>
                      {(cancellationDate || nextBillingDate) && (
                        <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                          Starting {(cancellationDate || nextBillingDate)!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium">{PLAN_NAMES[scheduledPlan || plan] || (scheduledPlan || plan)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clients:</span>
                        <span className="font-medium">{scheduledClientLimit || clientLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">${scheduledPriceCents !== null ? (scheduledPriceCents / 100).toFixed(0) : 0}/{billingInterval === 'month' ? 'mo' : 'yr'}</span>
                      </div>
                      {/* Show remaining add-ons (those not being cancelled) */}
                      {currentPlan.addons.filter(a => !cancellingAddons.includes(a.addonType)).length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Add-ons:</span>
                          <span className="font-medium">
                            {currentPlan.addons.filter(a => !cancellingAddons.includes(a.addonType)).map(a => a.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price difference summary */}
                  {(() => {
                    const currentPriceCents = currentPlan.price * 100;
                    const newPriceCents = scheduledPriceCents ?? 0;
                    const diff = currentPriceCents - newPriceCents;
                    const isSaving = diff > 0;
                    const periodLabel = billingInterval === 'month' ? 'mo' : 'yr';

                    if (diff === 0) {
                      return (
                        <div className="flex justify-between items-center px-1 pt-1">
                          <span className="text-base font-medium">Price change:</span>
                          <span className="text-base font-semibold text-muted-foreground">No change</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex justify-between items-center px-1 pt-1">
                        <span className="text-base font-medium">
                          {isSaving ? `${billingInterval === 'month' ? 'Monthly' : 'Annual'} savings:` : `${billingInterval === 'month' ? 'Monthly' : 'Annual'} increase:`}
                        </span>
                        <span className={`text-base font-semibold ${isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          ${Math.abs(diff / 100).toFixed(0)}/{periodLabel}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Update Plan button */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleChangePlan} disabled={isNavigating} className="gap-2 relative">
                      <span className={isNavigating ? 'opacity-0' : ''}>Update Plan</span>
                      <ArrowRight className={`size-4 ${isNavigating ? 'opacity-0' : ''}`} />
                      {isNavigating && (
                        <Loader2 className="size-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Standard layout when no scheduled changes */
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-8">
                  {/* Left side - Plan details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                      {currentPlan.isTrial && (
                        <span className="px-2.5 py-0.5 text-sm font-medium rounded-sm border bg-[#dcfce7] text-[#14532d] border-[#bbf7d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                          Free Trial
                        </span>
                      )}
                      {isCancelling && !currentPlan.isTrial && (
                        <span className="px-2.5 py-0.5 text-sm font-medium rounded-sm border bg-red-100 text-red-900 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
                          Cancelling {cancellationDate && formatCancelDate(cancellationDate)}
                        </span>
                      )}
                    </div>

                    {/* Plan includes */}
                    <div className="mt-3 space-y-1.5">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Clients:</span>{' '}
                        <span className="font-medium">Up to {currentPlan.clientsLimit}</span>
                      </p>
                      {currentPlan.addons.map((addon) => (
                        <p key={addon.name} className="text-sm">
                          <span className="text-muted-foreground">{addon.name}:</span>{' '}
                          <span className="font-medium">
                            {addon.included
                              ? (currentPlan.isTrial ? 'Included with Free Trial' : 'Included')
                              : 'Not included'}
                          </span>
                          {addon.isCancelling && cancellationDate && (
                            <span className="text-red-600 dark:text-red-400 ml-2">
                              (Cancelling on {formatCancelDate(cancellationDate)})
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Right side - Billing & Action */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-between md:self-stretch gap-4">
                    <div className="text-left md:text-right order-1 md:order-2">
                      <p className="text-2xl font-bold">
                        ${currentPlan.price}
                        <span className="text-sm font-normal text-muted-foreground">/{currentPlan.billingInterval}</span>
                      </p>
                      {currentPlan.isTrial && (
                        <p className="text-xs text-muted-foreground">Free during trial</p>
                      )}
                    </div>
                    <Button onClick={handleChangePlan} disabled={isNavigating} className="gap-2 relative order-2 md:order-1">
                      <span className={isNavigating ? 'opacity-0' : ''}>
                        {isCancelling && !currentPlan.isTrial ? "Don't Cancel" : 'Update Plan'}
                      </span>
                      {!isCancelling && <ArrowRight className={`size-4 ${isNavigating ? 'opacity-0' : ''}`} />}
                      {isNavigating && (
                        <Loader2 className="size-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Clients Card */}
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>Active Clients</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-4 pt-3 pb-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isLoadingClients ? 'Loading...' : `${activeClientsCount} of ${currentPlan.clientsLimit} clients`}
                  </span>
                  <span className="text-sm font-medium">
                    {clientPercentage < 1 && clientPercentage > 0
                      ? `${clientPercentage.toFixed(1)}%`
                      : `${Math.round(clientPercentage)}%`}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(clientPercentage, 100)}%` }}
                  />
                </div>
                {clientPercentage >= 80 && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      You're approaching your client limit. Consider upgrading your plan.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleChangePlan}
                      disabled={isNavigating}
                      className="gap-2 relative"
                    >
                      <span className={isNavigating ? 'opacity-0' : ''}>
                        {isCancelling && !currentPlan.isTrial ? "Don't Cancel" : 'Increase Allowance'}
                      </span>
                      {!isCancelling && <ArrowRight className={`size-4 ${isNavigating ? 'opacity-0' : ''}`} />}
                      {isNavigating && (
                        <Loader2 className="size-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoices Card */}
          <InvoicesCard />
        </div>
      </div>

      {/* Trial Warning Dialog */}
      <Dialog open={showTrialWarning} onOpenChange={setShowTrialWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You're on a Free Trial</DialogTitle>
            <DialogDescription>
              You currently have {trialDaysRemaining} days left on your free trial. If you proceed to purchase a plan, your free trial will end and billing will start immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrialWarning(false)} disabled={isNavigating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTrialEnd} disabled={isNavigating} className="relative">
              <span className={isNavigating ? 'opacity-0' : ''}>Continue</span>
              {isNavigating && (
                <Loader2 className="size-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BillingPage;
