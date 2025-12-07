import React from 'react';
import { View } from 'react-native';

interface HomeScreenProps {
  onShowFeedback?: (liftData: any) => void;
  onShowFeedbackSlideshow?: () => void;
  onShowLibrary?: () => void;
  onShowShare?: () => void;
  onTriggerAddOptions?: () => void;
  onNavigateToPerformance?: () => void;
}

export function HomeScreen(_props: HomeScreenProps) {
  return <View style={{ flex: 1 }} />;
}
