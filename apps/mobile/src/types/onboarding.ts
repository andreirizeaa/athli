export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface OnboardingData {
  userId: string | null;
  language: string;
  gender: string | null;
  workoutsPerWeek: string | null;
  discoverySource: string | null;
  trainingReason: string | null;
  gymChallenge: string | null;
  lifterType: string | null;
  perfectFormGoal: string | null;
  formConfidence: string | null;
  threeMonthGoal: string | null;
  hasPersonalTrainer: boolean | null;
  unitSystem: string | null;
  referralCode: string | null;
  metricHeight: number | null;
  metricWeight: number | null;
  ageRange: string | null;
  hasRated: boolean | null;
  onboardingCompleted: boolean;
  walkthroughCompleted: boolean;
  signInMethod: string | null;
  profilePicture?: string | null;
}

export interface OnboardingContextType {
  onboardingData: OnboardingData;
  updateOnboardingData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  isComplete: boolean;
  setComplete: (complete: boolean) => void;
  getOnboardingDataForAPI: () => OnboardingData;
  resetOnboarding: () => void;
  getOnboardingProgress: () => number;
}
