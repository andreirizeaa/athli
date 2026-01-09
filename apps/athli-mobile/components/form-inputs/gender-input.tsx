import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';

export type GenderValue = 'male' | 'female' | 'prefer-not-to-say' | null;

type GenderInputProps = {
  label: string;
  value: GenderValue;
  onChange: (value: GenderValue) => void;
  placeholder?: string;
  options?: {
    male: string;
    female: string;
    preferNotToSay: string;
  };
};

const defaultOptions = {
  male: 'Male',
  female: 'Female',
  preferNotToSay: 'Prefer not to say',
};

export const GenderInput = ({
  label,
  value,
  onChange,
  placeholder = 'Select gender',
  options = defaultOptions,
}: GenderInputProps) => {
  const { colors: themeColors } = useThemePreference();

  const getDisplayValue = (): string => {
    if (!value) return placeholder;
    if (value === 'male') return options.male;
    if (value === 'female') return options.female;
    return options.preferNotToSay;
  };

  const menuOptions: DropdownMenuOption[] = [
    {
      label: options.male,
      onPress: () => onChange('male'),
    },
    {
      label: options.female,
      onPress: () => onChange('female'),
    },
    {
      label: options.preferNotToSay,
      onPress: () => onChange('prefer-not-to-say'),
    },
  ];

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
            {getDisplayValue()}
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

