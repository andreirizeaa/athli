import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';

type InputBoxProps = {
  label: string | React.ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  showCharacterCount?: boolean;
  hideLabel?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputRowStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightIcon?: React.ReactNode;
  themeColors?: ThemeColors;
  forceDarkMode?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style'>;

export type InputBoxRef = {
  focus: () => void;
  blur: () => void;
  clear: () => void;
};

export const InputBox = forwardRef<InputBoxRef, InputBoxProps>(
  ({ label, value, onChangeText, placeholder, required, showCharacterCount, hideLabel, containerStyle, inputRowStyle, inputStyle, maxLength, rightIcon, themeColors: propThemeColors, forceDarkMode, ...textInputProps }, ref) => {
    const { colors: defaultThemeColors } = useThemePreference();
    const themeColors = propThemeColors ?? defaultThemeColors;
    const inputRef = useRef<TextInput>(null);

    const handleClear = () => {
      onChangeText('');
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: handleClear,
    }));

    return (
      <Card
        variant="form"
        themeColors={propThemeColors}
        forceDarkMode={forceDarkMode}
        style={StyleSheet.flatten([
          hideLabel && { paddingTop: 12, paddingBottom: 12 },
          containerStyle,
        ])}
      >
        {!hideLabel && (
          <View style={styles.labelRow}>
            <View style={styles.labelLeft}>
              <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
                {label}
              </Text>
              {required && <Text style={styles.requiredAsterisk}>*</Text>}
            </View>
            {showCharacterCount && maxLength && (
              <Text style={[styles.characterCount, { color: themeColors.mutedText }]}>
                {value.length}/{maxLength}
              </Text>
            )}
          </View>
        )}
        <View style={[styles.inputRow, inputRowStyle]}>
          <TextInput
            ref={inputRef}
            style={[styles.inputBoxInput, { color: themeColors.text }, inputStyle]}
            placeholder={placeholder}
            placeholderTextColor={themeColors.mutedText}
            value={value}
            onChangeText={onChangeText}
            maxLength={maxLength}
            keyboardAppearance={forceDarkMode ? 'dark' : undefined}
            {...textInputProps}
          />
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      </Card>
    );
  }
);

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputBoxLabel: {
    ...typography.p4,
  },
  requiredAsterisk: {
    ...typography.p4,
    color: '#EF4444',
    marginLeft: 2,
  },
  characterCount: {
    ...typography.p4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  inputBoxInput: {
    ...typography.p1,
    padding: 0,
    margin: 0,
    flex: 1,
    height: 28,
    textAlignVertical: 'center',
  },
  rightIconContainer: {
    marginLeft: 12,
  },
});

