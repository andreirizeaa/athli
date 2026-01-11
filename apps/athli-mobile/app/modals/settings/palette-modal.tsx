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
import { THEMES, type PresetValue } from '@/constants/theme';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { Separator } from '@/components/separator';
import { SearchBar } from '@/components/search-bar';
import { hexToRgba } from '@/utils/colorUtils';

type ThemeItem = {
  name: string;
  value: PresetValue;
  colors: string[];
};

export default function PaletteModal() {
  const router = useRouter();
  const { colors: themeColors, preset, setPreset } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);

  // Scroll to top when search query changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  // Filter and sort themes - selected at top, then alphabetical, filtered by search
  const filteredThemes = useMemo(() => {
    let filtered = THEMES;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = THEMES.filter((theme) =>
        theme.name.toLowerCase().includes(query)
      );
    }

    // Sort with selected theme at top
    if (preset) {
      const selected = filtered.find((t) => t.value === preset);
      const others = filtered.filter((t) => t.value !== preset);
      if (selected) {
        return [selected, ...others];
      }
    }

    return filtered;
  }, [searchQuery, preset]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelectPalette = useCallback((value: PresetValue) => {
    setPreset(value);
    router.back();
  }, [setPreset, router]);

  const renderItem = useCallback(({ item }: { item: ThemeItem }) => {
    const isSelected = item.value === preset;
    const accentColor = item.colors[0];

    return (
      <PressableOpacity
        style={styles.paletteItem}
        onPress={() => handleSelectPalette(item.value)}
      >
        <View
          style={[
            styles.paletteCircle,
            { backgroundColor: accentColor, borderColor: themeColors.border },
          ]}
        />
        <Text style={[styles.paletteName, { color: themeColors.text }]} numberOfLines={1}>
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
  }, [preset, themeColors, handleSelectPalette]);

  const renderSeparator = useCallback(() => (
    <Separator style={styles.separator} />
  ), []);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
      {/* Palette List */}
      <View style={styles.listContainer}>
        <FlashList
          ref={listRef as any}
          data={filteredThemes}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={
            <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('preferences.searchPalettes')}
              />
            </View>
          }
          // @ts-ignore - estimatedItemSize is a valid FlashList prop but types may be outdated
          estimatedItemSize={52}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* Fixed Header with blur effect */}
      <View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={[
            hexToRgba(themeColors.background, 1),
            hexToRgba(themeColors.background, 0.85),
            hexToRgba(themeColors.background, 0.5),
            hexToRgba(themeColors.background, 0),
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
            {t('preferences.colorPalette')}
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
  paletteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paletteCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
  },
  paletteName: {
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
