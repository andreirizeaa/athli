'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
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
import confetti from 'canvas-confetti';
import { InvoicesCard } from './invoices-card';

// Plan display names
const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
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
    isLoading: isLoadingSubscription,
  } = useSubscription();
  const [showTrialWarning, setShowTrialWarning] = useState(false);

  // Show confetti on successful checkout and remove success param from URL
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
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
  }, [searchParams, router]);

  const activeClientsCount = clients.length;

  // Build current plan from entitlements
  const currentPlan = useMemo(() => {
    const addons = [];
    if (hasAutomations) addons.push({ name: 'Automations', included: true });
    if (hasAiAssistant) addons.push({ name: 'AI Assistant', included: true });
    if (hasPayments) addons.push({ name: 'Payments', included: true });

    return {
      name: PLAN_NAMES[plan] || plan,
      isTrial: isTrial || status === 'trial',
      clientsLimit: clientLimit,
      price: isTrial ? 0 : totalMonthlyCents / 100,
      billingInterval: billingInterval || 'month' as const,
      addons,
    };
  }, [plan, isTrial, status, clientLimit, hasAutomations, hasAiAssistant, hasPayments, totalMonthlyCents, billingInterval]);

  const clientPercentage = currentPlan.clientsLimit > 0
    ? (activeClientsCount / currentPlan.clientsLimit) * 100
    : 0;

  const handleChangePlan = () => {
    if (currentPlan.isTrial) {
      setShowTrialWarning(true);
    } else {
      router.push('/settings/billing/update');
    }
  };

  const handleConfirmTrialEnd = () => {
    setShowTrialWarning(false);
    router.push('/settings/billing/update');
  };

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-auto">
        <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
          {/* Current Plan Card */}
          <Card className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <div className="flex items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                {currentPlan.isTrial && (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    {trialDaysRemaining} days left in trial
                  </Badge>
                )}
              </div>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-4 pt-1 pb-4">
              <div className="flex items-start justify-between gap-8">
                {/* Left side - Plan details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                    {currentPlan.isTrial && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        Free Trial
                      </Badge>
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
                        <span className="font-medium">{addon.included ? 'Included' : 'Not included'}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Right side - Billing & Action */}
                <div className="flex flex-col items-end gap-3">
                  <Button onClick={handleChangePlan} className="gap-2">
                    Change Plan
                    <ArrowRight className="size-4" />
                  </Button>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ${currentPlan.price}
                      <span className="text-sm font-normal text-muted-foreground">/{currentPlan.billingInterval}</span>
                    </p>
                    {currentPlan.isTrial && (
                      <p className="text-xs text-muted-foreground">Free during trial</p>
                    )}
                  </div>
                </div>
              </div>
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
                    {Math.round(clientPercentage)}%
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
                      className="gap-2"
                    >
                      Increase Allowance
                      <ArrowRight className="size-4" />
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
            <Button variant="outline" onClick={() => setShowTrialWarning(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTrialEnd}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BillingPage;
