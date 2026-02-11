export type FeatureKey =
  | 'forms'
  | 'flows'
  | 'packages'
  | 'lyra';

export type FeatureRule = {
  key: FeatureKey;
  label: string;
  description: string;
  enabled: boolean;  // Default state, can be overridden by user plan/subscription
};

export type FeatureRules = Record<FeatureKey, FeatureRule>;
