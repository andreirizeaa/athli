import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useLibraryTab } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';

type UseLibraryTabListParams = {
  searchPlaceholderKey: string;
  isRefetching: boolean;
  refetch: () => Promise<any>;
};

export const useLibraryTabList = ({
  searchPlaceholderKey,
  isRefetching,
  refetch,
}: UseLibraryTabListParams) => {
  const { primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, setSearchQuery, closeOpenRow, openRowCloseFn } = useLibraryTab();

  const isRowOpen = openRowCloseFn !== null;

  const handleSearchChange = (text: string) => {
    if (isRowOpen) {
      closeOpenRow();
      return;
    }
    setSearchQuery(text);
  };

  const ListHeaderComponent = useMemo(() => (
    <View style={styles.searchBarContainer}>
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder={t(searchPlaceholderKey)}
      />
    </View>
  ), [searchQuery, searchPlaceholderKey, t, isRowOpen]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={refetch}
      tintColor={primaryColor}
      colors={[primaryColor]}
    />
  ), [isRefetching, refetch, primaryColor]);

  return {
    ListHeaderComponent,
    refreshControl,
    searchQuery,
    isRowOpen,
    closeOpenRow,
  };
};

const styles = StyleSheet.create({
  searchBarContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
});
