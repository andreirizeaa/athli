import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { SearchBar } from '@/components/search-bar';

export default function FilesScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('files.title')}</Text>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('files.searchPlaceholder')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
});
