import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { PressableScale } from 'pressto';
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
      return <Megaphone size={iconSize} />;
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
    return <Plus size={iconSize} />;
  };

  return (
    <PressableScale
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
    </PressableScale>
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
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1000,
  },
});
