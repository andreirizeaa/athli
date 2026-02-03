import React from 'react';

import { useAppView } from '@/stores';
import { CoachHomeContent } from '@/components/features/home/coach-home-content';
import { AthleteHomeContent } from '@/components/features/home/athlete-home-content';

export default function HomeScreen() {
  const { appView } = useAppView();

  if (appView === 'coach') {
    return <CoachHomeContent />;
  }

  return <AthleteHomeContent />;
}
