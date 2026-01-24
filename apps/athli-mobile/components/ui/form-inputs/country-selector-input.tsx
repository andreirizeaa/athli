import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableOpacity } from 'pressto';
import { ChevronDown } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { CountryPickerModal } from './country-picker-modal';
import { type Country } from './countries-data';

export type { Country } from './countries-data';

type CountrySelectorInputProps = {
  label: string;
  value: Country | null;
  onChange: (country: Country) => void;
  placeholder?: string;
  modalTitle?: string;
};

export const CountrySelectorInput = ({
  label,
  value,
  onChange,
  placeholder = 'Select country...',
  modalTitle = 'Select Country',
}: CountrySelectorInputProps) => {
  const { colors: themeColors } = useThemePreference();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePress = useCallback(() => {
    setIsModalVisible(true);
    setSearchQuery('');
  }, []);

  const handleClose = useCallback(() => {
    setIsModalVisible(false);
    setSearchQuery('');
  }, []);

  const handleSelectCountry = useCallback((country: Country) => {
    onChange(country);
    setIsModalVisible(false);
    setSearchQuery('');
  }, [onChange]);

  return (
    <>
      <PressableOpacity
        style={[styles.inputBox, { backgroundColor: themeColors.surfacePrimary }]}
        onPress={handlePress}
      >
        <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
          {label}
        </Text>
        <View style={styles.inputRow}>
          {value && (
            <Text style={styles.selectedFlag}>{value.flag}</Text>
          )}
          <Text
            style={[
              styles.inputBoxValue,
              { color: value ? themeColors.text : themeColors.mutedText },
            ]}
          >
            {value ? value.name : placeholder}
          </Text>
          <ChevronDown {...({ size: 20, color: themeColors.mutedText } as any)} />
        </View>
      </PressableOpacity>

      <CountryPickerModal
        visible={isModalVisible}
        onClose={handleClose}
        onSelect={handleSelectCountry}
        selectedCountry={value}
        title={modalTitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </>
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
  selectedFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  inputBoxValue: {
    ...typography.p1,
    flex: 1,
  },
});
