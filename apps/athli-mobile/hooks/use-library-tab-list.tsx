import React, { useMemo, useState, useCallback, useRef } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useLibraryTab } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';

type UseLibraryTabListParams = {
  searchPlaceholderKey: string;
  refetch: () => Promise<any>;
};

export const useLibraryTabList = ({
  searchPlaceholderKey,
  refetch,
}: UseLibraryTabListParams) => {
  const { primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, setSearchQuery, closeOpenRow, openRowCloseFn } = useLibraryTab();

  const isRowOpen = openRowCloseFn !== null;

  // Track manual pull-to-refresh separately from programmatic refetches
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Use ref for refetch to keep handlePullRefresh stable
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetchRef.current();
    } finally {
      setIsPullRefreshing(false);
    }
  }, []);

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
      refreshing={isPullRefreshing}
      onRefresh={handlePullRefresh}
      tintColor={primaryColor}
      colors={[primaryColor]}
    />
  ), [isPullRefreshing, handlePullRefresh, primaryColor]);

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
