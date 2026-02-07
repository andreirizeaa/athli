import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { ChevronDown } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { TimezonePickerModal } from './timezone-picker-modal';
import { TIMEZONE_OPTIONS } from '@athli/shared-types';
import { Card } from '@/components/ui/card';

type TimezoneSelectorInputProps = {
  label: string;
  value: string | null;
  onChange: (timezone: string) => void;
  placeholder?: string;
  modalTitle?: string;
};

export const TimezoneSelectorInput = ({
  label,
  value,
  onChange,
  placeholder = 'Select timezone...',
  modalTitle = 'Select Timezone',
}: TimezoneSelectorInputProps) => {
  const { colors: themeColors } = useThemePreference();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayLabel = useMemo(() => {
    if (!value) return null;
    const option = TIMEZONE_OPTIONS.find((tz) => tz.value === value);
    const label = option?.label ?? value;
    return label.replace(/^\(UTC[^)]*\)\s*/, '');
  }, [value]);

  const handlePress = useCallback(() => {
    setIsModalVisible(true);
    setSearchQuery('');
  }, []);

  const handleClose = useCallback(() => {
    setIsModalVisible(false);
    setSearchQuery('');
  }, []);

  const handleSelectTimezone = useCallback(
    (tzValue: string) => {
      onChange(tzValue);
      setIsModalVisible(false);
      setSearchQuery('');
    },
    [onChange]
  );

  return (
    <>
      <PressableOpacity onPress={handlePress}>
        <Card variant="form">
          <Text
            style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}
          >
            {label}
          </Text>
          <View style={styles.inputRow}>
            <Text
              style={[
                styles.inputBoxValue,
                {
                  color: displayLabel
                    ? themeColors.text
                    : themeColors.mutedText,
                },
              ]}
              numberOfLines={1}
            >
              {displayLabel || placeholder}
            </Text>
            <ChevronDown
              {...({ size: 20, color: themeColors.mutedText } as any)}
            />
          </View>
        </Card>
      </PressableOpacity>

      <TimezonePickerModal
        visible={isModalVisible}
        onClose={handleClose}
        onSelect={handleSelectTimezone}
        selectedTimezone={value}
        title={modalTitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </>
  );
};

const styles = StyleSheet.create({
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
