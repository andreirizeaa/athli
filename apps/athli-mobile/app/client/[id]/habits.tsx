import React, { useRef, useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, CheckCircle, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { SearchBar } from '@/components/ui/search-bar';
import { deleteClientHabits } from '@/services/client/client-habit-service';
import { haptics } from '@/utils/haptics';

export default function ClientHabitsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get habits from store (already loaded by parent screen)
  const habits = useClientDetailStore((state) => state.habits);
  const isLoadingHabits = useClientDetailStore((state) => state.isLoadingHabits);
  const coachId = useClientDetailStore((state) => state.coachId);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  // Filter habits based on search query
  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) return habits;
    const query = searchQuery.toLowerCase();
    return habits.filter((habit) =>
      habit.name.toLowerCase().includes(query)
    );
  }, [habits, searchQuery]);

  // Track currently open swipeable row
  const openRowCloseRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowCloseRef.current) {
      openRowCloseRef.current();
      openRowCloseRef.current = null;
    }
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    // Close any previously open row
    if (openRowCloseRef.current && openRowCloseRef.current !== close) {
      openRowCloseRef.current();
    }
    openRowCloseRef.current = close;
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignHabit = () => {
    router.push(`/modals/client/assign-habit-to-client-modal?clientId=${id}` as any);
  };

  const handleAddHabit = () => {
    router.push(`/modals/library/add-habit-modal?clientId=${id}&coachId=${coachId}` as any);
  };

  const handleLogHabit = () => {
    router.push(`/modals/client/log-habit-for-client-modal?clientId=${id}` as any);
  };

  const handleHabitPress = useCallback((habitId: string) => {
    // If a row was just closed, prevent navigation
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    // If a row is open, just close it and prevent navigation
    if (openRowCloseRef.current) {
      closeOpenRow();
      return;
    }
    router.push(`/client/${id}/habit-detail?habitId=${habitId}` as any);
  }, [closeOpenRow, router, id]);

  const handleDeleteHabit = async (habit: typeof habits[0]) => {
    if (!coachId) return;
    await deleteClientHabits({
      habitIds: [habit.assignment_id],
      clientId: id,
      coachId,
    });
    haptics.success();
    refreshSection('habits');
  };

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.habits')}
        </Text>
        <DropdownMenuWrapper
          options={[
            {
              label: t('clientDetail.actions.assignHabit'),
              icon: { sf: 'checklist', IconComponent: ClipboardCheck },
              onPress: handleAssignHabit,
            },
            {
              label: t('clientDetail.actions.addHabit'),
              icon: { sf: 'plus', IconComponent: Plus },
              onPress: handleAddHabit,
            },
            {
              label: t('clientDetail.actions.logHabit'),
              icon: { sf: 'checkmark.circle', IconComponent: CheckCircle },
              onPress: handleLogHabit,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('general.searchPlaceholder')}
        />
      </View>

      <Pressable
        style={styles.contentContainer}
        onPressIn={() => {
          if (openRowCloseRef.current) {
            hadOpenRowRef.current = true;
            closeOpenRow();
          } else {
            hadOpenRowRef.current = false;
          }
        }}
      >
        {/* Loading state */}
        {isLoadingHabits && habits.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : filteredHabits.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyContainer}>
            <PlatformIcon sf="checkmark.circle.fill" IconComponent={CheckCircle} size={48} color={themeColors.mutedText} />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              {searchQuery.trim()
                ? t('general.noResults')
                : t('clientDetail.habits.emptyTitle')}
            </Text>
            {!searchQuery.trim() && (
              <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                {t('clientDetail.habits.emptyDescription')}
              </Text>
            )}
          </View>
        ) : (
          /* Habits list */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            bounces={false}
          >
            {filteredHabits.map((habit, index) => {
              const isLastItem = index === filteredHabits.length - 1;
              return (
                <View key={habit.id || habit.assignment_id}>
                  <SwipeableRow
                    onDelete={() => handleDeleteHabit(habit)}
                    deleteConfirmTitle={`${t('general.delete')} ${habit.name}?`}
                    onOpen={handleRowOpen}
                  >
                    <PressableScale onPress={() => handleHabitPress(habit.assignment_id || habit.id)}>
                      <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                        <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                          <PlatformIcon
                            sf="checkmark.circle.fill"
                            IconComponent={CheckCircle}
                            size={24}
                            color={themeColors.text}
                          />
                        </View>
                        <View style={styles.textContent}>
                          <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                            {habit.name}
                          </Text>
                          <View style={styles.metaRow}>
                            <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                              {habit.amount} {habit.unit}
                            </Text>
                            <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                            <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                              {habit.period === 'daily' ? t('general.daily') : t('general.weekly')}
                            </Text>
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
              );
            })}
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
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
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
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.p3,
  },
  metaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
