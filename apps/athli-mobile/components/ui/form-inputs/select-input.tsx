import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, Trash2 } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { haptics } from '@/utils/haptics';

type SelectOption<T extends string> = {
  value: T;
  label: string;
  subtitle?: string;
};

type SelectInputProps<T extends string> = {
  label: string;
  value: T | null;
  onChange: (value: T | null) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
  clearable?: boolean;
};

export const SelectInput = <T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  required,
  compact,
  clearable,
}: SelectInputProps<T>) => {
  const { colors: themeColors } = useThemePreference();

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;
  const showClearButton = clearable && value !== null;

  const handleClear = () => {
    haptics.medium();
    onChange(null);
  };

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
          <ChevronDown {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </DropdownMenuWrapper>
    );
  }

  const cardContent = (
    <Card variant="form">
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
        <ChevronDown {...({ size: 20, color: themeColors.mutedText } as any)} />
      </View>
    </Card>
  );

  if (showClearButton) {
    return (
      <View style={styles.clearableRow}>
        <View style={styles.inputContainer}>
          <DropdownMenuWrapper options={menuOptions}>
            {cardContent}
          </DropdownMenuWrapper>
        </View>
        <PressableOpacity onPress={handleClear}>
          <SquircleView
            cornerSmoothing={1}
            style={[
              styles.clearButton,
              {
                backgroundColor: 'transparent',
                borderColor: themeColors.border,
              },
            ]}
          >
            <Trash2 size={20} color={themeColors.text} />
          </SquircleView>
        </PressableOpacity>
      </View>
    );
  }

  return (
    <DropdownMenuWrapper options={menuOptions}>
      {cardContent}
    </DropdownMenuWrapper>
  );
};

const styles = StyleSheet.create({
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
  clearableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  clearButton: {
    width: 52,
    height: 70,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

