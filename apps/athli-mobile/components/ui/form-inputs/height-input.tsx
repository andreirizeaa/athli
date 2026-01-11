import React, { useRef } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type HeightInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suffix?: string;
};

export const HeightInput = ({
  label,
  value,
  onChangeText,
  placeholder = '',
  suffix = 'cm',
}: HeightInputProps) => {
  const { colors: themeColors } = useThemePreference();
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limit decimal places to 1
    if (parts[1] && parts[1].length > 1) {
      return;
    }
    onChangeText(cleaned);
  };

  return (
    <View style={[styles.inputBox, { backgroundColor: themeColors.surfaceSecondary }]}>
      <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
        {label}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.inputBoxInput, { color: themeColors.text }]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeColors.mutedText}
          keyboardType="decimal-pad"
        />
        {suffix && (
          <Text style={[styles.suffix, { color: themeColors.mutedText }]}>
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
};

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
  suffix: {
    ...typography.p1,
    marginLeft: 8,
  },
});

