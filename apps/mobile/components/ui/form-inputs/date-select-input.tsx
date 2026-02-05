import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { Card } from '@/components/ui/card';

type DateSelectInputProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  allowFuture?: boolean;
  mode?: 'default' | 'birthdate';
};

export const DateSelectInput = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  allowFuture = true,
  mode = 'default',
}: DateSelectInputProps) => {
  const { colors: themeColors } = useThemePreference();
  const { setDateSelectCallback } = useModalCallbacks();
  const router = useRouter();

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  const displayValue = value ? formatDate(value) : placeholder;

  const handlePress = useCallback(() => {
    setDateSelectCallback((newDate: Date) => {
      onChange(newDate);
    });
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: {
        selectedDate: (value || new Date()).toISOString(),
        allowFuture: allowFuture ? 'true' : 'false',
        mode,
      },
    });
  }, [router, setDateSelectCallback, value, onChange, allowFuture, mode]);

  return (
    <PressableOpacity onPress={handlePress}>
      <Card variant="form">
        {label.length > 0 && (
          <View style={styles.labelRow}>
            <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
              {label}
            </Text>
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
    </PressableOpacity>
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
