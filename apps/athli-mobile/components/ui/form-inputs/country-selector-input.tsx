import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronDown, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { COUNTRIES, type Country } from './countries-data';

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
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);

  // Scroll to top when search query changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  // Filter and sort countries - selected at top, then alphabetical, filtered by search
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
    if (value) {
      const selected = filtered.find((c) => c.code === value.code);
      const others = filtered.filter((c) => c.code !== value.code);
      if (selected) {
        return [selected, ...others];
      }
    }

    return filtered;
  }, [searchQuery, value]);

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

  const renderItem = useCallback(({ item }: { item: Country }) => {
    const isSelected = value?.code === item.code;

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
  }, [value, themeColors, handleSelectCountry]);

  const renderSeparator = useCallback(() => (
    <Separator style={styles.separator} />
  ), []);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

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

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.surfacePrimary }]}>
          {/* Country List */}
          <View style={styles.listContainer}>
            <FlashList
              ref={listRef as any}
              data={filteredCountries}
              renderItem={renderItem}
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
                onPress={handleClose}
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
