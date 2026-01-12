import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';

type SelectOption<T extends string> = {
  value: T;
  label: string;
  subtitle?: string;
};

type SelectInputProps<T extends string> = {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
};

export const SelectInput = <T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  required,
  compact,
}: SelectInputProps<T>) => {
  const { colors: themeColors } = useThemePreference();

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const menuOptions: DropdownMenuOption[] = options.map((option) => ({
    label: option.label,
    subtitle: option.subtitle,
    onPress: () => onChange(option.value),
  }));

  if (compact) {
    return (
      <DropdownMenuWrapper options={menuOptions}>
        <View style={styles.compactRow}>
          <Text
            style={[
              styles.compactValue,
              { color: value ? themeColors.text : themeColors.mutedText },
            ]}
          >
            {displayValue}
          </Text>
          <ChevronDown size={16} color={themeColors.mutedText} />
        </View>
      </DropdownMenuWrapper>
    );
  }

  return (
    <DropdownMenuWrapper options={menuOptions}>
      <View style={[styles.inputBox, { backgroundColor: themeColors.surfaceSecondary }]}>
        {label.length > 0 && (
          <View style={styles.labelRow}>
            <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
              {label}
            </Text>
            {required && <Text style={styles.requiredAsterisk}>*</Text>}
          </View>
        )}
        <View style={styles.inputRow}>
          <Text
            style={[
              styles.inputBoxValue,
              { color: value ? themeColors.text : themeColors.mutedText },
            ]}
          >
            {displayValue}
          </Text>
          <ChevronDown size={20} color={themeColors.mutedText} />
        </View>
      </View>
    </DropdownMenuWrapper>
  );
};

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
    marginBottom: 2,
  },
  inputBoxLabel: {
    ...typography.p4,
  },
  requiredAsterisk: {
    ...typography.p4,
    color: '#EF4444',
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  inputBoxValue: {
    ...typography.p1,
    flex: 1,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactValue: {
    ...typography.p1,
  },
});

