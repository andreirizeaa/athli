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
import { useAddonAccess } from '@/lib/permissions/feature-gate';
import { motion } from 'motion/react';

function ScreenshotPreview() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ w: 0, h: 0 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight });
    };
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const r = 8;

  return (
    <div ref={containerRef} className="relative">
      {w > 0 && h > 0 && (
        <svg
          className="pointer-events-none absolute top-0 left-0 z-10"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          fill="none"
        >
          <defs>
            <linearGradient id="border-grad-dialog" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-dialog)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [0, -1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-dialog)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [-0.5, -1.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      )}
      <img
        src="/app-screenshots/packages/light.png"
        alt="Packages preview"
        className="block w-full h-auto rounded-lg border dark:hidden"
      />
      <img
        src="/app-screenshots/packages/dark.png"
        alt="Packages preview"
        className="w-full h-auto rounded-lg border hidden dark:block"
      />
    </div>
  );
}

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
  const { hasAccess: hasPaymentsAddon } = useAddonAccess('payments');

  const isConnected = stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;

  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

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

  // Show Stripe connect button - disabled if no payments addon
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
      onClick={() => {
        if (!hasPaymentsAddon) {
          setIsUpgradeDialogOpen(true);
        } else {
          handleConnectStripe();
        }
      }}
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

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payments Add-on Required</DialogTitle>
            <DialogDescription>
              To connect Stripe and accept payments from your clients, you need to add the Payments add-on to your plan.
            </DialogDescription>
          </DialogHeader>
          {/* Screenshot preview with animated border */}
          <ScreenshotPreview />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpgradeDialogOpen(false)}
            >
              {t('general.cancel')}
            </Button>
            <Button
              onClick={() => {
                setIsUpgradeDialogOpen(false);
                router.push('/settings/billing/update');
              }}
            >
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessLayout;
