import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  const handlePress = () => {
    // Call onPress immediately for responsive navigation
    onPress();
    // Run haptic feedback asynchronously to avoid blocking
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: '#F0F0F0' }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <ChevronLeft size={24} color={'#000000'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
