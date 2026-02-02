import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { PressableOpacity } from 'pressto';
import { SymbolView } from 'expo-symbols';
import { Plus, Megaphone } from 'lucide-react-native';

import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';

type FABProps = {
  onPress: () => void;
  variant?: 'plus' | 'megaphone';
  bottom?: number;
};

export const FAB = ({ onPress, variant = 'plus', bottom = 90 }: FABProps) => {
  const { primaryColor, colors: themeColors } = useThemePreference();

  const handlePress = () => {
    haptics.medium();
    onPress();
  };

  const renderIcon = () => {
    const iconColor = themeColors.primaryForeground;
    const iconSize = 24;

    if (variant === 'megaphone') {
      if (Platform.OS === 'ios') {
        return (
          <SymbolView
            name="megaphone.fill"
            tintColor={iconColor}
            size={iconSize}
            type="monochrome"
          />
        );
      }
      return <Megaphone size={iconSize} color={iconColor} />;
    }

    if (Platform.OS === 'ios') {
      return (
        <SymbolView
          name="plus"
          tintColor={iconColor}
          size={iconSize}
          type="monochrome"
        />
      );
    }
    return <Plus size={iconSize} color={iconColor} />;
  };

  return (
    <PressableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: primaryColor,
          bottom,
        },
      ]}
      onPress={handlePress}
    >
      {renderIcon()}
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
});
