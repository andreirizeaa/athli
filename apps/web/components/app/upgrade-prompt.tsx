'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/general/utils';

type UpgradePromptVariant = 'card' | 'inline' | 'banner' | 'overlay';

interface UpgradePromptProps {
  /** Feature that requires upgrade */
  feature: string;
  /** Description of what the feature does */
  description?: string;
  /** Which addon is required (optional - for specific addon upsells) */
  requiredAddon?: 'automations' | 'ai_assistant' | 'payments';
  /** Visual variant */
  variant?: UpgradePromptVariant;
  /** Additional CSS classes */
  className?: string;
  /** Custom CTA text */
  ctaText?: string;
  /** Whether to show as a full-page overlay */
  fullPage?: boolean;
}

const ADDON_LABELS = {
  automations: 'Automations',
  ai_assistant: 'AI Assistant',
  payments: 'Payments',
};

// Features that require Max plan
const MAX_PLAN_ADDONS = ['ai_assistant'];

function getRequiredPlanLabel(requiredAddon?: string): string {
  if (requiredAddon && MAX_PLAN_ADDONS.includes(requiredAddon)) {
    return 'Upgrade to Max';
  }
  return 'Upgrade to Pro';
}

const ADDON_SCREENSHOTS: Record<string, { light: string; dark: string }> = {
  payments: {
    light: '/app-screenshots/packages/light.png',
    dark: '/app-screenshots/packages/dark.png',
  },
};

export function UpgradePrompt({
  feature,
  description,
  requiredAddon,
  variant = 'card',
  className,
  ctaText,
  fullPage = false,
}: UpgradePromptProps) {
  const router = useRouter();
  const defaultCtaText = getRequiredPlanLabel(requiredAddon);
  const buttonText = ctaText || defaultCtaText;

  const handleUpgrade = () => {
    router.push('/settings/billing/update');
  };

  const screenshot = requiredAddon ? ADDON_SCREENSHOTS[requiredAddon] : null;

  // Full page overlay variant
  if (fullPage || variant === 'overlay') {
    return (
      <div className={cn('flex flex-col items-center justify-center min-h-[400px] p-8 text-center', className)}>
        {screenshot ? (
          <div className="relative w-full max-w-2xl mb-6 rounded-lg overflow-hidden border shadow-lg">
            {/* Light mode image */}
            <img
              src={screenshot.light}
              alt={`${feature} preview`}
              className="w-full h-auto dark:hidden"
            />
            {/* Dark mode image */}
            <img
              src={screenshot.dark}
              alt={`${feature} preview`}
              className="w-full h-auto hidden dark:block"
            />
          </div>
        ) : (
          <div className="rounded-full bg-muted p-4 mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h2 className="text-2xl font-semibold mb-2">{feature}</h2>
        {description && (
          <p className="text-muted-foreground max-w-md mb-6">{description}</p>
        )}
        {requiredAddon && (
          <p className="text-sm text-muted-foreground mb-4">
            Requires the <span className="font-medium text-foreground">{ADDON_LABELS[requiredAddon]}</span> add-on
          </p>
        )}
        <Button onClick={handleUpgrade} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {buttonText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg',
        className
      )}>
        <div className="flex items-center gap-3">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-medium">{feature}</span>
            {requiredAddon && (
              <span className="text-muted-foreground"> requires the {ADDON_LABELS[requiredAddon]} add-on</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleUpgrade} className="gap-1.5 flex-shrink-0">
          Upgrade
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Lock className="h-3.5 w-3.5" />
        <span>
          {requiredAddon ? `Requires ${ADDON_LABELS[requiredAddon]}` : 'Upgrade to unlock'}
        </span>
        <Button variant="link" size="sm" onClick={handleUpgrade} className="h-auto p-0 text-primary">
          Upgrade
        </Button>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={cn('p-6 text-center', className)}>
      {screenshot ? (
        <div className="relative w-full mb-4 rounded-md overflow-hidden border">
          {/* Light mode image */}
          <img
            src={screenshot.light}
            alt={`${feature} preview`}
            className="w-full h-auto dark:hidden"
          />
          {/* Dark mode image */}
          <img
            src={screenshot.dark}
            alt={`${feature} preview`}
            className="w-full h-auto hidden dark:block"
          />
        </div>
      ) : (
        <div className="rounded-full bg-muted p-3 w-fit mx-auto mb-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-semibold mb-1">{feature}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {requiredAddon && (
        <p className="text-xs text-muted-foreground mb-4">
          Requires the <span className="font-medium">{ADDON_LABELS[requiredAddon]}</span> add-on
        </p>
      )}
      <Button onClick={handleUpgrade} size="sm" className="gap-2">
        <Sparkles className="h-4 w-4" />
        {buttonText}
      </Button>
    </Card>
  );
}

/**
 * Tooltip content for disabled features
 */
export function UpgradeTooltip({ requiredAddon }: { requiredAddon?: 'automations' | 'ai_assistant' | 'payments' }) {
  return (
    <div className="text-center py-1">
      <p className="font-medium">Upgrade Required</p>
      {requiredAddon && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Requires {ADDON_LABELS[requiredAddon]} add-on
        </p>
      )}
    </div>
  );
}
