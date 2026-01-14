import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type DateOfBirthInputProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
};

export const DateOfBirthInput = ({
  label,
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
}: DateOfBirthInputProps) => {
  const { colors: themeColors } = useThemePreference();
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const prevValueRef = useRef('');

  // Initialize from value
  useEffect(() => {
    if (value) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = String(value.getFullYear());
      const formatted = `${day}/${month}/${year}`;
      setDisplayValue(formatted);
      prevValueRef.current = formatted;
    }
  }, []);

  const formatDateInput = (text: string, isBackspace: boolean): string => {
    // Remove all non-numeric characters
    const numbers = text.replace(/[^0-9]/g, '');
    
    // Format as DD/MM/YYYY
    let formatted = '';
    
    if (numbers.length > 0) {
      // Day (first 2 digits)
      formatted = numbers.slice(0, 2);
      
      // Auto-add slash after 2 digits for day (only when typing forward)
      if (numbers.length === 2 && !isBackspace) {
        formatted += '/';
      }
    }
    
    if (numbers.length > 2) {
      // Add slash and month
      if (!formatted.endsWith('/')) {
        formatted += '/';
      }
      formatted += numbers.slice(2, 4);
      
      // Auto-add slash after 2 digits for month (only when typing forward)
      if (numbers.length === 4 && !isBackspace) {
        formatted += '/';
      }
    }
    
    if (numbers.length > 4) {
      // Add slash and year
      if (!formatted.endsWith('/')) {
        formatted += '/';
      }
      formatted += numbers.slice(4, 8);
    }
    
    return formatted;
  };

  const validateAndUpdate = (formatted: string) => {
    // Extract day, month, year from formatted string
    const parts = formatted.split('/');
    
    if (parts.length === 3 && parts[2].length === 4) {
      const dayNum = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      const yearNum = parseInt(parts[2], 10);

      // Validate ranges
      if (
        !isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum) &&
        dayNum >= 1 && dayNum <= 31 &&
        monthNum >= 1 && monthNum <= 12 &&
        yearNum >= 1900 && yearNum <= new Date().getFullYear()
      ) {
        const date = new Date(yearNum, monthNum - 1, dayNum);
        // Validate the date is real (e.g., not Feb 30)
        if (
          date.getDate() === dayNum &&
          date.getMonth() === monthNum - 1 &&
          date.getFullYear() === yearNum
        ) {
          onChange(date);
          return;
        }
      }
    }

    // If incomplete or invalid, set to null
    if (formatted.length === 0) {
      onChange(null);
    }
  };

  const handleChangeText = (text: string) => {
    const prevValue = prevValueRef.current;
    const isBackspace = text.length < prevValue.length;
    
    // Handle backspace on slash - remove the slash AND the digit before it
    if (isBackspace && prevValue.endsWith('/') && !text.endsWith('/')) {
      // User backspaced a slash, also remove the digit before it
      const withoutLastDigit = text.slice(0, -1);
      const formatted = formatDateInput(withoutLastDigit, true);
      setDisplayValue(formatted);
      prevValueRef.current = formatted;
      validateAndUpdate(formatted);
      return;
    }
    
    const formatted = formatDateInput(text, isBackspace);
    setDisplayValue(formatted);
    prevValueRef.current = formatted;
    validateAndUpdate(formatted);
  };

  return (
    <View style={[styles.inputBox, { backgroundColor: themeColors.surfacePrimary }]}>
      <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
        {label}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.inputBoxInput, { color: themeColors.text }]}
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeColors.mutedText}
          keyboardType="number-pad"
          maxLength={10}
        />
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
});
