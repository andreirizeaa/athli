import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';
import { PressableOpacity } from 'pressto';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type TextAreaInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  numberOfLines?: number;
  minHeight?: number;
  required?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style' | 'multiline' | 'numberOfLines'>;

export type TextAreaInputRef = {
  focus: () => void;
  blur: () => void;
  clear: () => void;
};

export const TextAreaInput = forwardRef<TextAreaInputRef, TextAreaInputProps>(
  ({ label, value, onChangeText, placeholder, numberOfLines = 4, minHeight = 80, required, ...textInputProps }, ref) => {
    const { colors: themeColors } = useThemePreference();
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
      <View style={[styles.inputBox, { backgroundColor: themeColors.surfacePrimary }]}>
        <View style={styles.labelRow}>
          <View style={styles.labelLeft}>
            <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
              {label}
            </Text>
            {required && <Text style={styles.requiredAsterisk}>*</Text>}
          </View>
          {value.length > 0 && (
            <PressableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={8}
            >
              <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                <X {...({ size: 10, color: themeColors.surfacePrimary, strokeWidth: 3 } as any)} />
              </View>
            </PressableOpacity>
          )}
        </View>
        <TextInput
          ref={inputRef}
          style={[styles.inputBoxInput, { color: themeColors.text, minHeight }]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.mutedText}
          value={value}
          onChangeText={onChangeText}
          multiline
          numberOfLines={numberOfLines}
          textAlignVertical="top"
          {...textInputProps}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  inputBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 18,
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
  inputBoxInput: {
    ...typography.p1,
    padding: 0,
    margin: 0,
  },
  clearButton: {
    marginLeft: 12,
  },
  clearButtonIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

