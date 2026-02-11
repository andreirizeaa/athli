'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSelectedLayoutSegments, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, ChevronDown, Unplug, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PageTabs } from '@/components/page-tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { useStripeConnection, useCoachPackages } from '@/hooks/use-coach-packages';
import { useGlobalData } from '@/providers/global-data-provider';

type BusinessLayoutProps = {
  children: React.ReactNode;
};

const BusinessLayout = ({ children }: BusinessLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const searchParams = useSearchParams();
  const { data: stripeAccount, refetch: refetchConnection } = useStripeConnection();
  const {
    startOnboarding,
    isOnboarding,
    getDashboardLink,
    isGettingDashboardLink,
    disconnectStripe,
    isDisconnecting,
  } = useCoachPackages();
  const { uniqueCode } = useGlobalData();

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;

  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);

  const tabs = [
    {
      value: 'activity',
      label: t('business.tabs.activity'),
    },
    {
      value: 'packages',
      label: t('business.tabs.packages'),
    },
    {
      value: 'coupons',
      label: t('business.tabs.coupons'),
    },
    {
      value: 'sequences',
      label: t('business.tabs.sequences'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const activeTab = segments.find((segment) => validTabValues.includes(segment)) || 'activity';

  const shouldShowHeader = segments.length === 1 && validTabValues.includes(segments[0]);

  // Handle Stripe onboarding return
  useEffect(() => {
    const onboardingStatus = searchParams.get('stripe_onboarding');
    if (onboardingStatus === 'complete') {
      refetchConnection();
      toast.success('Stripe account connected successfully');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (onboardingStatus === 'refresh') {
      refetchConnection();
      toast.info('Please complete Stripe onboarding');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, refetchConnection]);

  const handleConnectStripe = async () => {
    try {
      const url = await startOnboarding();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to start Stripe connection');
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const url = await getDashboardLink();
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to open Stripe Dashboard');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectStripe();
      toast.success('Stripe account disconnected');
      setIsDisconnectOpen(false);
    } catch {
      toast.error('Failed to disconnect Stripe account');
    }
  };

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    router.push(`/business/${value}`);
  };

  const headerActions = isConnected ? (
    <DropdownMenu>
      <ButtonGroup>
        <Button
          variant="ghost"
          disabled={!uniqueCode}
          onClick={() => uniqueCode && window.open(`/${uniqueCode}/packages`, '_blank')}
          className="h-9 gap-2 border border-[#635BFF] border-r-0 bg-transparent hover:bg-[#635BFF]/5 dark:bg-transparent dark:hover:bg-[#635BFF]/10 text-[#635BFF] dark:text-white"
        >
          <ExternalLink className="size-4" />
          <span>Preview Packages</span>
        </Button>
        <Button
          onClick={handleOpenDashboard}
          disabled={isGettingDashboardLink}
          className="h-9 gap-2 bg-[#635BFF] hover:bg-[#635BFF]/90 dark:bg-[#635BFF] dark:hover:bg-[#635BFF]/90 text-white dark:text-white"
        >
          {isGettingDashboardLink ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <img src="/icons/stripe-icon.png" alt="" className="size-4 brightness-0 invert" />
          )}
          <span>{t('business.packages.stripe.dashboard')}</span>
        </Button>
        <ButtonGroupSeparator className="bg-[#4B44C9]" />
        <DropdownMenuTrigger asChild>
          <Button className="h-9 px-2 bg-[#635BFF] hover:bg-[#635BFF]/90 dark:bg-[#635BFF] dark:hover:bg-[#635BFF]/90 text-white dark:text-white">
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
      </ButtonGroup>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setIsDisconnectOpen(true)}
          className="text-[#635BFF] focus:text-[#635BFF] dark:text-white dark:focus:text-white"
        >
          <Unplug className="h-4 w-4 mr-2 text-[#635BFF] dark:text-white" />
          Disconnect Stripe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <button
      onClick={handleConnectStripe}
      disabled={isOnboarding}
      className="flex items-center justify-center gap-2 rounded-md border border-[#635BFF] px-3 h-9 text-sm font-medium text-[#635BFF] hover:bg-[#635BFF]/5 transition-colors disabled:opacity-50"
    >
      {isOnboarding ? (
        <Loader2 className="size-4 animate-spin text-[#635BFF]" />
      ) : (
        <img src="/icons/stripe-icon.png" alt="" className="size-5" />
      )}
      {stripeAccount ? t('business.packages.stripe.continueSetup') : t('business.packages.stripe.connect')}
    </button>
  );

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      {shouldShowHeader && (
        <div className="w-full relative flex-shrink-0">
          <div className="pl-4 pr-4 flex items-center justify-between h-[38px] mt-2">
            <h1 className="text-[22px] font-semibold">{t('business.title')}</h1>
            {headerActions}
          </div>
          <div className="px-4">
            <PageTabs
              tabs={tabs}
              value={activeTab}
              onValueChange={handleTabChange}
              className="mt-1"
            />
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
      )}
      <div className="w-full flex-1 overflow-auto relative">{children}</div>

      <Dialog open={isDisconnectOpen} onOpenChange={(open) => !isDisconnecting && setIsDisconnectOpen(open)}>
        <DialogContent className="border-[#635BFF] bg-[#635BFF]/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/icons/stripe-icon.png" alt="" className="size-5" />
              {t('business.stripe.disconnectTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t('business.stripe.disconnectDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDisconnectOpen(false)}
              disabled={isDisconnecting}
              className="border-[#635BFF] text-[#635BFF] bg-transparent hover:bg-[#635BFF]/5"
            >
              {t('general.cancel')}
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="gap-2 relative bg-[#635BFF] hover:bg-[#635BFF]/90 text-white"
            >
              <span className={isDisconnecting ? 'invisible' : ''}>
                {t('business.stripe.disconnect')}
              </span>
              {isDisconnecting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-4" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessLayout;
