'use client';

import { featureRules } from './feature-rules';
import type { FeatureKey } from './types';

type FeatureGateProps = {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

function DefaultFallback({ feature }: { feature: FeatureKey }) {
  const rule = featureRules[feature];
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="text-muted-foreground mb-2 text-sm uppercase tracking-wide">
        Feature Unavailable
      </div>
      <h2 className="text-2xl font-semibold mb-2">{rule.label}</h2>
      <p className="text-muted-foreground max-w-md">
        {rule.description} is not available on your current plan.
        Upgrade to access this feature.
      </p>
    </div>
  );
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const rule = featureRules[feature];

  if (!rule.enabled) {
    return fallback ?? <DefaultFallback feature={feature} />;
  }

  return <>{children}</>;
}
