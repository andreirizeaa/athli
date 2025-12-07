import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HomeScreenProps {
  onShowFeedback?: (liftData: any) => void;
  onShowFeedbackSlideshow?: () => void;
  onShowLibrary?: () => void;
  onShowShare?: () => void;
  onTriggerAddOptions?: () => void;
  onNavigateToPerformance?: () => void;
}

export function HomeScreen(_props: HomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Home</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
});
