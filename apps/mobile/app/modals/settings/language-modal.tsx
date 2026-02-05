import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { LANGUAGES } from '@/constants/languages';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';

type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

export default function LanguageModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('en');
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);

  // Scroll to top when search query changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  // Filter and sort languages - selected at top, then alphabetical, filtered by search
  const filteredLanguages = useMemo(() => {
    let filtered = LANGUAGES;

    // Filter by search query (name, nativeName)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = LANGUAGES.filter((language) =>
        language.name.toLowerCase().includes(query) ||
        language.nativeName.toLowerCase().includes(query)
      );
    }

    // Sort with selected language at top
    if (selectedLanguageCode) {
      const selected = filtered.find((l) => l.code === selectedLanguageCode);
      const others = filtered.filter((l) => l.code !== selectedLanguageCode);
      if (selected) {
        return [selected, ...others];
      }
    }

    return filtered;
  }, [searchQuery, selectedLanguageCode]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelectLanguage = useCallback((code: string) => {
    setSelectedLanguageCode(code);
    // TODO: Implement language change logic
    router.back();
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Language }) => {
    const isSelected = item.code === selectedLanguageCode;

    return (
      <PressableOpacity
        style={styles.languageItem}
        onPress={() => handleSelectLanguage(item.code)}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <Text style={[styles.languageName, { color: themeColors.text }]} numberOfLines={1}>
          {item.nativeName}
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
  }, [selectedLanguageCode, themeColors, handleSelectLanguage]);

  const renderSeparator = useCallback(() => (
    <Separator style={styles.separator} />
  ), []);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <View style={[styles.modalContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Language List */}
      <View style={styles.listContainer}>
        <FlashList
          ref={listRef as any}
          data={filteredLanguages}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={
            <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('preferences.searchLanguages')}
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
            hexToRgba(themeColors.backgroundSecondary, 1),
            hexToRgba(themeColors.backgroundSecondary, 0.85),
            hexToRgba(themeColors.backgroundSecondary, 0.5),
            hexToRgba(themeColors.backgroundSecondary, 0),
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
            {t('preferences.selectLanguage')}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
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
