import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';
import { PressableOpacity } from 'pressto';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';

type InputBoxProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style'>;

export type InputBoxRef = {
  focus: () => void;
  blur: () => void;
  clear: () => void;
};

export const InputBox = forwardRef<InputBoxRef, InputBoxProps>(
  ({ label, value, onChangeText, placeholder, ...textInputProps }, ref) => {
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
      <View style={[styles.inputBox, { backgroundColor: themeColors.surfaceSecondary }]}>
        <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
          {label}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.inputBoxInput, { color: themeColors.text }]}
            placeholder={placeholder}
            placeholderTextColor={themeColors.mutedText}
            value={value}
            onChangeText={onChangeText}
            {...textInputProps}
          />
          {value.length > 0 && (
            <PressableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={8}
            >
              <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                <X {...({ size: 12, color: themeColors.surfaceSecondary, strokeWidth: 3 } as any)} />
              </View>
            </PressableOpacity>
          )}
        </View>
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
  inputBoxLabel: {
    ...typography.p4,
    marginBottom: 2,
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
  clearButton: {
    marginLeft: 12,
  },
  clearButtonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

