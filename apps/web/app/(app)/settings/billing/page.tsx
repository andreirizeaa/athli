'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { useAccess } from '@/lib/permissions';
import { useCoachClients } from '@/hooks/use-coach-clients';

const BillingPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { status, trialDaysRemaining } = useAccess();
  const { clients, isLoading: isLoadingClients } = useCoachClients();

  const activeClientsCount = clients.length;

  // Mock data for now - will be replaced with real subscription data later
  const currentPlan = {
    name: 'Max',
    isTrial: status === 'trial',
    clientsLimit: 50,
    price: 0, // Free during trial
    billingInterval: 'month' as const,
    addons: [
      { name: 'Automations', included: true },
      { name: 'AI Assistant (Limited)', included: true },
    ],
  };

  const clientPercentage = (activeClientsCount / currentPlan.clientsLimit) * 100;

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
                  <Button onClick={() => router.push('/settings/billing/update')} className="gap-2">
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
                <div className="flex items-center justify-between pt-1">
                  {clientPercentage >= 80 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      You're approaching your client limit. Consider upgrading your plan.
                    </p>
                  ) : (
                    <div />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/settings/billing/update')}
                    className="gap-2"
                  >
                    Increase Allowance
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default BillingPage;
