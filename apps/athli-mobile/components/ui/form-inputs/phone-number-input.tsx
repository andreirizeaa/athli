import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { AsYouType } from 'libphonenumber-js';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from './countries-data';

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
    const formatter = new AsYouType(countryCode);
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
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize with default country if no value
  const selectedCountry = value?.country || DEFAULT_COUNTRY;
  const phoneNumber = value?.number || '';

  // Format the phone number for display
  const formattedPhoneNumber = useMemo(() => {
    if (!phoneNumber) return '';

    try {
      const formatter = new AsYouType(selectedCountry.code);
      return formatter.input(phoneNumber);
    } catch (error) {
      // Fallback to unformatted number if formatting fails
      return phoneNumber;
    }
  }, [phoneNumber, selectedCountry]);

  // Scroll to top when search query changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  // Filter and sort countries
  const filteredCountries = useMemo(() => {
    let filtered = COUNTRIES;

    // Filter by search query (name or dial code)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = COUNTRIES.filter((country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query)
      );
    }

    // Sort with selected country at top
    if (selectedCountry) {
      const selected = filtered.find((c) => c.code === selectedCountry.code);
      const others = filtered.filter((c) => c.code !== selectedCountry.code);
      if (selected) {
        return [selected, ...others];
      }
    }

    return filtered;
  }, [searchQuery, selectedCountry]);

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

  const renderCountryItem = useCallback(({ item }: { item: Country }) => {
    const isSelected = selectedCountry?.code === item.code;

    return (
      <PressableOpacity
        style={styles.countryItem}
        onPress={() => handleSelectCountry(item)}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <Text style={[styles.countryName, { color: themeColors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[
          styles.radioOuter,
          { borderColor: isSelected ? themeColors.primary : themeColors.border },
          isSelected && { backgroundColor: themeColors.primary },
        ]}>
          {isSelected && (
            <Check {...({ size: 12, color: themeColors.primaryForeground, strokeWidth: 3 } as any)} />
          )}
        </View>
      </PressableOpacity>
    );
  }, [selectedCountry, themeColors, handleSelectCountry]);

  const renderSeparator = useCallback(() => (
    <Separator style={styles.separator} />
  ), []);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

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

      {/* Country Picker Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCountryPicker}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.surfacePrimary }]}>
          {/* Country List */}
          <View style={styles.listContainer}>
            <FlashList
              ref={listRef as any}
              data={filteredCountries}
              renderItem={renderCountryItem}
              ItemSeparatorComponent={renderSeparator}
              ListHeaderComponent={
                <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]}>
                  <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search countries..."
                  />
                </View>
              }
              // @ts-ignore - estimatedItemSize is a valid FlashList prop but types may be outdated
              estimatedItemSize={52}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          </View>

          {/* Fixed Header with blur effect */}
          <View style={[styles.fixedHeader, { height: headerHeight }]}>
            <LinearGradient
              colors={[
                hexToRgba(themeColors.surfacePrimary, 1),
                hexToRgba(themeColors.surfacePrimary, 0.85),
                hexToRgba(themeColors.surfacePrimary, 0.5),
                hexToRgba(themeColors.surfacePrimary, 0),
              ]}
              locations={[0, 0.5, 0.8, 1]}
              style={[styles.headerGradient, { height: gradientHeight }]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.modalHeader,
                {
                  paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                },
              ]}
            >
              <IconButton
                icon={{ sf: 'xmark', IconComponent: X }}
                onPress={handleCloseCountryPicker}
                size="md"
                color={themeColors.text}
              />
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {modalTitle}
              </Text>
              <View style={styles.headerPlaceholder} />
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  listHeader: {
    paddingBottom: 12,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    ...typography.p2,
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    marginLeft: 36,
  },
});
