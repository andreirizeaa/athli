import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type OutlinedButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  borderColor?: string;
  textColor?: string;
  size?: 'md' | 'lg';
};

export const OutlinedButton = ({
  label,
  onPress,
  disabled = false,
  style,
  textStyle,
  icon,
  borderColor,
  textColor,
  size = 'md',
}: OutlinedButtonProps) => {
  const { colors: themeColors } = useThemePreference();

  const brdColor = borderColor ?? (disabled ? themeColors.mutedText : themeColors.primary);
  const txtColor = textColor ?? (disabled ? themeColors.mutedText : themeColors.primary);

  return (
    <PressableScale onPress={onPress} enabled={!disabled}>
      <SquircleView
        cornerSmoothing={1}
        style={[
          styles.button,
          size === 'lg' && styles.buttonLg,
          {
            borderColor: brdColor,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[
            styles.buttonText,
            { color: txtColor },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </SquircleView>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLg: {
    paddingVertical: 18,
  },
  iconContainer: {
    position: 'absolute',
    left: 20,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.p1,
    fontWeight: '600',
  },
});

