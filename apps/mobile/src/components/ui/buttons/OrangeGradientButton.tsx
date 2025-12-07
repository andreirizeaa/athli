import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OrangeGradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  activeOpacity?: number;
  children?: React.ReactNode;
}

export function OrangeGradientButton({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  activeOpacity = 0.8,
  children,
}: OrangeGradientButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[disabled && styles.disabledContainer]}
    >
      <LinearGradient
        colors={['#f6339a', '#fb2c36', '#ff6900', '#fe9a00']}
        locations={[0, 0.5, 0.8, 1]}
        style={[styles.button, style, disabled && styles.disabledButton]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {children || (
          <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  disabledContainer: {
    opacity: 0.6,
  },
  disabledButton: {
    // Gradient will still show but container opacity is reduced
  },
  disabledText: {
    // Keep text color the same, opacity is handled by container
  },
});
