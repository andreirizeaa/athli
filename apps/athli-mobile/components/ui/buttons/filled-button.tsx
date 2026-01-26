import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type FilledButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
  size?: 'md' | 'lg';
};

export const FilledButton = ({
  label,
  onPress,
  disabled = false,
  style,
  textStyle,
  icon,
  backgroundColor,
  textColor,
  size = 'md',
}: FilledButtonProps) => {
  const { colors: themeColors } = useThemePreference();

  const bgColor = backgroundColor ?? (disabled ? themeColors.backgroundTertiary : themeColors.primary);
  const txtColor = textColor ?? (disabled ? themeColors.mutedText : themeColors.primaryForeground);

  return (
    <PressableScale onPress={onPress} enabled={!disabled}>
      <SquircleView
        cornerSmoothing={1}
        style={[
          styles.button,
          size === 'lg' && styles.buttonLg,
          {
            backgroundColor: bgColor,
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
    borderRadius: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 48,
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
  },
});

