import type { FeatureRules } from './types';

export const featureRules: FeatureRules = {
  forms: {
    key: 'forms',
    label: 'Forms',
    description: 'Check-in forms and questionnaires',
    enabled: true,
  },
  flows: {
    key: 'flows',
    label: 'Flows',
    description: 'Automated workflow sequences',
    enabled: true,
  },
  packages: {
    key: 'packages',
    label: 'Packages',
    description: 'Coaching packages and pricing',
    enabled: true,
  },
  lyra: {
    key: 'lyra',
    label: 'Lyra AI',
    description: 'AI assistant features',
    enabled: true,
  },
};
