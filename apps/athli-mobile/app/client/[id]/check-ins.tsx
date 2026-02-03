import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, ChevronRight, Calendar, Link2, FilePlus } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { SearchBar } from '@/components/ui/search-bar';
import { DropdownMenuWrapper, DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { deleteClientCheckIns } from '@/services/client/client-form-service';
import { getCheckIns } from '@/services/coach/coach-check-in-service';
import { haptics } from '@/utils/haptics';

// Format schedule text for display
const formatSchedule = (schedule: string): string => {
  const scheduleMap: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    manual: 'Manual',
  };
  return scheduleMap[schedule.toLowerCase()] || schedule.charAt(0).toUpperCase() + schedule.slice(1);
};

export default function ClientCheckInsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const iconColor = themeColors.text;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get check-ins from store (already loaded by parent screen)
  const checkIns = useClientDetailStore((state) => state.checkIns);
  const isLoadingForms = useClientDetailStore((state) => state.isLoadingForms);
  const coachId = useClientDetailStore((state) => state.coachId);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const queryClient = useQueryClient();

  // Prefetch coach's check-ins for faster assign modal loading
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['checkIns'],
      queryFn: getCheckIns,
    });
  }, [queryClient]);

  // Filter check-ins based on search query
  const filteredCheckIns = useMemo(() => {
    if (!searchQuery.trim()) return checkIns;
    const query = searchQuery.toLowerCase();
    return checkIns.filter((checkIn) =>
      checkIn.name.toLowerCase().includes(query) ||
      checkIn.schedule?.toLowerCase().includes(query)
    );
  }, [checkIns, searchQuery]);

  // Track currently open swipeable row
  const openRowCloseRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);
  const isClosingRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowCloseRef.current) {
      isClosingRef.current = true;
      openRowCloseRef.current();
      openRowCloseRef.current = null;
      // Reset after animation completes
      setTimeout(() => {
        isClosingRef.current = false;
      }, 300);
    }
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    // Ignore onOpen calls that happen during close animation
    if (isClosingRef.current) return;

    // Close any previously open row
    if (openRowCloseRef.current && openRowCloseRef.current !== close) {
      openRowCloseRef.current();
    }
    openRowCloseRef.current = close;
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignCheckIn = useCallback(() => {
    router.push(`/modals/client/assign-check-in-to-client-modal?clientId=${id}` as any);
  }, [router, id]);

  const handleAddCheckIn = useCallback(() => {
    router.push({
      pathname: '/modals/library/add-check-in-modal',
      params: {
        clientId: id,
        coachId: coachId,
      },
    } as any);
  }, [router, id, coachId]);

  // Dropdown menu options for add button
  const addMenuOptions: DropdownMenuOption[] = useMemo(() => [
    {
      label: t('clientDetail.checkIns.assignCheckIn'),
      icon: { sf: 'link', IconComponent: Link2 },
      onPress: handleAssignCheckIn,
    },
    {
      label: t('clientDetail.checkIns.addCheckIn'),
      icon: { sf: 'doc.badge.plus', IconComponent: FilePlus },
      onPress: handleAddCheckIn,
    },
  ], [t, handleAssignCheckIn, handleAddCheckIn]);

  const handleCheckInPress = useCallback((checkIn: typeof checkIns[0]) => {
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
    router.push({
      pathname: '/client/[id]/check-in-detail',
      params: {
        id,
        checkInId: checkIn.id,
        checkInName: checkIn.name,
      },
    } as any);
  }, [closeOpenRow, router, id]);

  const handleDeleteCheckIn = async (checkIn: typeof checkIns[0]) => {
    if (!coachId) return;
    await deleteClientCheckIns({
      checkInIds: [checkIn.id],
      clientId: id,
      coachId,
    });
    haptics.success();
    refreshSection('check-ins');
  };

  // Get status pill style based on status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'live':
        return {
          backgroundColor: themeColors.primary,
          borderColor: themeColors.primary,
          textColor: themeColors.primaryForeground,
        };
      case 'paused':
        return {
          backgroundColor: 'transparent',
          borderColor: '#EAB308',
          textColor: '#CA8A04',
        };
      case 'draft':
      default:
        return {
          backgroundColor: 'transparent',
          borderColor: themeColors.mutedText,
          textColor: themeColors.mutedText,
        };
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live':
        return t('clientDetail.checkIns.statusLive');
      case 'paused':
        return t('clientDetail.checkIns.statusPaused');
      case 'draft':
      default:
        return t('clientDetail.checkIns.statusDraft');
    }
  };

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
          {isLoadingForms && checkIns.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : filteredCheckIns.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyContainer}>
              <PlatformIcon
                sf="checkmark.circle"
                IconComponent={ClipboardCheck}
                size={48}
                color={themeColors.mutedText}
              />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {searchQuery.trim()
                  ? t('general.noResults')
                  : t('clientDetail.checkIns.emptyTitle')}
              </Text>
              {!searchQuery.trim() && (
                <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                  {t('clientDetail.checkIns.emptyDescription')}
                </Text>
              )}
            </View>
          ) : (
            /* Check-ins list */
            <View>
              {filteredCheckIns.map((checkIn, index) => {
                const isLastItem = index === filteredCheckIns.length - 1;
                const statusStyle = getStatusStyle(checkIn.status || 'draft');
                return (
                  <View key={checkIn.id}>
                    <SwipeableRow
                      onDelete={() => handleDeleteCheckIn(checkIn)}
                      deleteConfirmTitle={`${t('general.delete')} ${checkIn.name}?`}
                      onOpen={handleRowOpen}
                    >
                      <PressableScale onPress={() => handleCheckInPress(checkIn)}>
                        <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                          <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                            <PlatformIcon
                              sf="calendar.badge.clock"
                              IconComponent={Calendar}
                              size={24}
                              color={themeColors.text}
                            />
                          </SquircleView>
                          <View style={styles.textContent}>
                            <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                              {checkIn.name}
                            </Text>
                            <View style={styles.metaRow}>
                              {checkIn.schedule && (
                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                  <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                    {formatSchedule(checkIn.schedule)}
                                  </Text>
                                </View>
                              )}
                              <View
                                style={[
                                  styles.pill,
                                  {
                                    borderColor: statusStyle.borderColor,
                                    backgroundColor: statusStyle.backgroundColor,
                                  },
                                ]}
                              >
                                <Text style={[styles.pillText, { color: statusStyle.textColor }]}>
                                  {getStatusLabel(checkIn.status || 'draft')}
                                </Text>
                              </View>
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
          {t('clientDetail.sections.checkIns')}
        </Text>
        <DropdownMenuWrapper options={addMenuOptions}>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>
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
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    ...typography.p4,
    fontWeight: '500',
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
