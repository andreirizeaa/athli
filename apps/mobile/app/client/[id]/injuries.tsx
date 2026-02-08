import React, { useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Heart, Calendar } from 'lucide-react-native';

import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
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
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
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

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);

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
      setShowErrorDialog(true);
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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const renderInjury = useCallback(({ item, index, isLastItem }: { item: AthleteInjury; index: number; isLastItem: boolean }) => (
    <View>
      <SwipeableRow
        onDelete={() => handleDeleteInjury(item.id)}
        onOpen={registerOpenRow}
        deleteConfirmTitle={t('general.deleteInjury')}
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
              <View style={styles.injuryHeader}>
                <Text style={[styles.injuryTitle, { color: themeColors.text }]} numberOfLines={2}>
                  {item.injury}
                </Text>
                {item.date && (
                  <View style={[styles.datePill, { borderColor: themeColors.mutedText }]}>
                    <PlatformIcon
                      sf="calendar"
                      IconComponent={Calendar}
                      size={12}
                      color={themeColors.mutedText}
                    />
                    <Text style={[styles.dateText, { color: themeColors.mutedText }]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
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
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        </ScrollView>

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
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
            <View>
              {filteredInjuries.map((item, index) => (
                <View key={item.id}>
                  {renderInjury({ item, index, isLastItem: index === filteredInjuries.length - 1 })}
                </View>
              ))}
            </View>
          )}
        </Pressable>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={t('general.errorDeleting')}
        showCloseIcon={false}
        buttons={[
          {
            label: t('general.ok'),
            onPress: () => setShowErrorDialog(false),
            variant: 'primary',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
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
  injuryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  injuryIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  injuryContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  injuryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  injuryTitle: {
    ...typography.h7,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    flexShrink: 0,
  },
  dateText: {
    ...typography.p4,
    fontWeight: '500',
  },
  separatorContainer: {
    paddingLeft: 82,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
