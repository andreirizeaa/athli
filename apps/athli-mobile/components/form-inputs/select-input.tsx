import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type SelectInputProps<T extends string> = {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
};

export const SelectInput = <T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
}: SelectInputProps<T>) => {
  const { colors: themeColors } = useThemePreference();

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const menuOptions: DropdownMenuOption[] = options.map((option) => ({
    label: option.label,
    onPress: () => onChange(option.value),
  }));

  return (
    <DropdownMenuWrapper options={menuOptions}>
      <View style={[styles.inputBox, { backgroundColor: themeColors.surfaceSecondary }]}>
        <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
          {label}
        </Text>
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
  inputBoxLabel: {
    ...typography.p4,
    marginBottom: 2,
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
});

