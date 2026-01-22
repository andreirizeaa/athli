import React, { useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight, Heart } from 'lucide-react-native';

import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SearchBar } from '@/components/ui/search-bar';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { saveAthleteInjuries } from '@/services/client/client-service';
import type { AthleteInjury } from '@/services/client/client-service';

// Simple fuzzy search - checks if all characters appear in order
const fuzzyMatch = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
};

export default function ClientInjuriesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Get injuries from store (already loaded by parent screen)
  const injuries = useClientDetailStore((state) => state.injuries);
  const isLoading = useClientDetailStore((state) => state.isLoading);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Swipe row management
  const openRowRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowRef.current) {
      openRowRef.current();
      openRowRef.current = null;
    }
  }, []);

  const registerOpenRow = useCallback((closeRow: () => void) => {
    if (openRowRef.current && openRowRef.current !== closeRow) {
      openRowRef.current();
    }
    openRowRef.current = closeRow;
  }, []);

  // Filter injuries based on search query
  const filteredInjuries = useMemo(() => {
    if (!searchQuery.trim()) return injuries;
    return injuries.filter((injury) => {
      const matchesInjury = fuzzyMatch(injury.injury, searchQuery);
      const matchesDate = injury.date ? fuzzyMatch(injury.date, searchQuery) : false;
      return matchesInjury || matchesDate;
    });
  }, [injuries, searchQuery]);

  const handleDeleteInjury = async (injuryId: string) => {
    if (!coachProfile?.id || !id) return;

    try {
      const remainingInjuries = injuries.filter((i) => i.id !== injuryId);
      await saveAthleteInjuries(id, coachProfile.id, remainingInjuries);
      haptics.success();
      refreshSection('injuries');
    } catch (error) {
      haptics.error();
      Alert.alert(t('general.error'), t('general.errorDeleting'));
    }
  };

  const iconColor = themeColors.text;

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleAddInjury = () => {
    haptics.medium();
    router.push({
      pathname: '/modals/client/add-client-injury-modal',
      params: { id },
    } as any);
  };

  const handleInjuryPress = useCallback((injuryId: string) => {
    // If a row was just closed, prevent navigation
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    // If a row is open, just close it and prevent navigation
    if (openRowRef.current) {
      closeOpenRow();
      return;
    }
    haptics.medium();
    router.push({
      pathname: '/modals/client/edit-client-injury-modal',
      params: { id, injuryId },
    } as any);
  }, [closeOpenRow, router, id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderInjury = useCallback(({ item, index, isLastItem }: { item: AthleteInjury; index: number; isLastItem: boolean }) => (
    <View>
      <SwipeableRow
        onDelete={() => handleDeleteInjury(item.id)}
        onOpen={registerOpenRow}
        deleteConfirmTitle={`${t('general.delete')}?`}
      >
        <PressableScale onPress={() => handleInjuryPress(item.id)}>
          <View style={[styles.injuryItem, { backgroundColor: themeColors.backgroundPrimary }]}>
            <View style={[styles.injuryIconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
              <PlatformIcon
                sf="heart"
                IconComponent={Heart}
                size={24}
                color={themeColors.error}
              />
            </View>
            <View style={styles.injuryContent}>
              <Text style={[styles.injuryTitle, { color: themeColors.text }]} numberOfLines={2}>
                {item.injury}
              </Text>
              <View style={styles.injuryMeta}>
                {item.date && (
                  <Text style={[styles.injuryDate, { color: themeColors.mutedText }]}>
                    {formatDate(item.date)}
                  </Text>
                )}
              </View>
            </View>
            <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
          </View>
        </PressableScale>
      </SwipeableRow>
      {!isLastItem && (
        <View style={styles.separatorContainer}>
          <View
            style={[
              styles.separator,
              { backgroundColor: themeColors.mutedText, opacity: 0.2 },
            ]}
          />
        </View>
      )}
      {isLastItem && <View style={{ height: 24 }} />}
    </View>
  ), [themeColors, handleInjuryPress, handleDeleteInjury, registerOpenRow, formatDate, t]);

  // Loading state
  if (isLoading && injuries.length === 0) {
    return (
      <ScreenWrapper>
        <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.overview.injuries')}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.overview.injuries')}
          </Text>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={handleAddInjury}
            size="md"
            color={iconColor}
          />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        {/* Injuries List */}
        <Pressable
          style={styles.contentContainer}
          onPressIn={() => {
            if (openRowRef.current) {
              hadOpenRowRef.current = true;
              closeOpenRow();
            } else {
              hadOpenRowRef.current = false;
            }
          }}
        >
          {filteredInjuries.length === 0 && searchQuery.trim() ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                {t('general.noResults')}
              </Text>
            </View>
          ) : filteredInjuries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState message={t('clientDetail.overview.noInjuries')} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              bounces={false}
            >
              {filteredInjuries.map((item, index) => (
                <View key={item.id}>
                  {renderInjury({ item, index, isLastItem: index === filteredInjuries.length - 1 })}
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  injuryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  injuryIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  injuryContent: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  injuryTitle: {
    ...typography.p2,
    fontWeight: '500',
  },
  injuryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  injurySeverity: {
    ...typography.p4,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  injuryDate: {
    ...typography.p4,
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
