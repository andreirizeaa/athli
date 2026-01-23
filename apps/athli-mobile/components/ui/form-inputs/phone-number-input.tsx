import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native';
import { PressableOpacity } from 'pressto';
import { X } from 'lucide-react-native';
import { AsYouType, type CountryCode } from 'libphonenumber-js';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { CountryPickerModal } from './country-picker-modal';
import { DEFAULT_COUNTRY, type Country } from './countries-data';

export type PhoneNumber = {
  country: Country;
  number: string;
};

type PhoneNumberInputProps = {
  codeLabel?: string;
  numberLabel?: string;
  value: PhoneNumber | null;
  onChange: (phoneNumber: PhoneNumber) => void;
  placeholder?: string;
  modalTitle?: string;
};

// Extract only digits from input
const extractDigits = (text: string): string => {
  return text.replace(/\D/g, '');
};

// Format phone number for display based on country code
export const formatPhoneNumber = (phoneNumber: string, countryCode: string): string => {
  if (!phoneNumber) return '';

  try {
    const formatter = new AsYouType(countryCode as CountryCode);
    return formatter.input(phoneNumber);
  } catch (error) {
    // Fallback to unformatted number if formatting fails
    return phoneNumber;
  }
};

export const PhoneNumberInput = ({
  codeLabel = 'Code',
  numberLabel = 'Phone Number',
  value,
  onChange,
  placeholder = 'Enter your phone',
  modalTitle = 'Select Country',
}: PhoneNumberInputProps) => {
  const { colors: themeColors } = useThemePreference();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Initialize with default country if no value
  const selectedCountry = value?.country || DEFAULT_COUNTRY;
  const phoneNumber = value?.number || '';

  // Format the phone number for display
  const formattedPhoneNumber = useMemo(() => {
    if (!phoneNumber) return '';

    try {
      const formatter = new AsYouType(selectedCountry.code as CountryCode);
      return formatter.input(phoneNumber);
    } catch (error) {
      // Fallback to unformatted number if formatting fails
      return phoneNumber;
    }
  }, [phoneNumber, selectedCountry]);

  const handleOpenCountryPicker = useCallback(() => {
    setIsModalVisible(true);
    setSearchQuery('');
  }, []);

  const handleCloseCountryPicker = useCallback(() => {
    setIsModalVisible(false);
    setSearchQuery('');
  }, []);

  const handleSelectCountry = useCallback((country: Country) => {
    onChange({
      country,
      number: phoneNumber,
    });
    setIsModalVisible(false);
    setSearchQuery('');
  }, [onChange, phoneNumber]);

  const handlePhoneNumberChange = useCallback((text: string) => {
    // Only allow digits
    const digits = extractDigits(text);

    onChange({
      country: selectedCountry,
      number: digits,
    });
  }, [onChange, selectedCountry]);

  const handleClearNumber = useCallback(() => {
    onChange({
      country: selectedCountry,
      number: '',
    });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange, selectedCountry]);

  return (
    <>
      <View style={styles.container}>
        {/* Left Box: Country Code Dropdown */}
        <PressableOpacity
          style={[styles.codeBox, { backgroundColor: themeColors.surfacePrimary }]}
          onPress={handleOpenCountryPicker}
        >
          <Text style={[styles.boxLabel, { color: themeColors.mutedText }]}>
            {codeLabel}
          </Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeFlag}>{selectedCountry.flag}</Text>
            <Text style={[styles.codeValue, { color: themeColors.text }]}>
              {selectedCountry.dialCode}
            </Text>
          </View>
        </PressableOpacity>

        {/* Right Box: Phone Number Input */}
        <View style={[styles.numberBox, { backgroundColor: themeColors.surfacePrimary }]}>
          <Text style={[styles.boxLabel, { color: themeColors.mutedText }]}>
            {numberLabel}
          </Text>
          <View style={styles.numberRow}>
            <TextInput
              ref={inputRef}
              style={[styles.numberInput, { color: themeColors.text }]}
              placeholder={placeholder}
              placeholderTextColor={themeColors.mutedText}
              value={formattedPhoneNumber}
              onChangeText={handlePhoneNumberChange}
              keyboardType="number-pad"
            />
            {phoneNumber.length > 0 && (
              <PressableOpacity
                style={styles.clearButton}
                onPress={handleClearNumber}
                hitSlop={8}
              >
                <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                  <X size={12} {...({ stroke: themeColors.surfaceSecondary } as any)} strokeWidth={3} />
                </View>
              </PressableOpacity>
            )}
          </View>
        </View>
      </View>

      <CountryPickerModal
        visible={isModalVisible}
        onClose={handleCloseCountryPicker}
        onSelect={handleSelectCountry}
        selectedCountry={selectedCountry}
        title={modalTitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  // Code Box (left)
  codeBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    gap: 6,
  },
  codeFlag: {
    fontSize: 20,
  },
  codeValue: {
    ...typography.p1,
  },
  // Number Box (right)
  numberBox: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  boxLabel: {
    ...typography.p4,
    marginBottom: 2,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  numberInput: {
    ...typography.p1,
    flex: 1,
    padding: 0,
    margin: 0,
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
