import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OnboardingContextType, OnboardingData } from '../types/onboarding';
import { saveOnboardingProgress } from '../services/onboardingService';
import { showAlert } from '../services/alertService';

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialOnboardingData: OnboardingData = {
  userId: null,
  language: 'en',
  gender: null,
  workoutsPerWeek: null,
  discoverySource: null,
  trainingReason: null,
  gymChallenge: null,
  lifterType: null,
  perfectFormGoal: null,
  formConfidence: null,
  threeMonthGoal: null,
  hasPersonalTrainer: null,
  unitSystem: 'metric',
  referralCode: null,
  metricHeight: 170,
  metricWeight: 60,
  ageRange: null,
  hasRated: null,
  signInMethod: null,
  onboardingCompleted: false,
  walkthroughCompleted: false,
  profilePicture: null,
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
  const [isComplete, setIsComplete] = useState(false);

  const updateOnboardingData = <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) => {
    setOnboardingData((prev: OnboardingData) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setComplete = (complete: boolean) => {
    setIsComplete(complete);
  };

  // Function to get all onboarding data in API-ready format
  const getOnboardingDataForAPI = () => {
    return onboardingData;
  };

  // Function to reset onboarding data
  const resetOnboarding = () => {
    setOnboardingData(onboardingData);
    setIsComplete(false);
  };

  // Function to get onboarding progress percentage
  const getOnboardingProgress = (): number => {
    const fields = Object.keys(onboardingData);

    const completedFields = fields.filter(
      (field) =>
        onboardingData[field as keyof OnboardingData] !== null &&
        onboardingData[field as keyof OnboardingData] !== undefined
    );

    return Math.round((completedFields.length / fields.length) * 100);
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingData,
        updateOnboardingData,
        isComplete,
        setComplete,
        getOnboardingDataForAPI,
        resetOnboarding,
        getOnboardingProgress,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
