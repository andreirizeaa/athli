import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, LayoutChangeEvent, Pressable } from 'react-native';
import { PressableOpacity } from 'pressto';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  WorkoutsTab,
  SectionsTab,
  ExercisesTab,
  CheckInsTab,
  QuestionnairesTab,
  MetricsTab,
  HabitsTab,
  FilesTab,
} from '@/components/features/library';
import { useLibraryTab, type LibraryTab } from '@/stores';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TabComponent = {
  key: string;
  component: React.ComponentType;
};

export default function LibraryScreen() {
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { setCurrentLibraryTab, setSearchQuery, closeOpenRow, openRowCloseFn } = useLibraryTab();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const tabBarScrollRef = useRef<ScrollView>(null);
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const tabLayoutsRef = useRef<{ [key: number]: { x: number; width: number } }>({});
  const isProgrammaticChange = useRef(false);
  const queryClient = useQueryClient();

  // Track if a row is currently open
  const isRowOpen = openRowCloseFn !== null;

  // Prefetch clients data when screen comes into focus
  // This ensures the "Assign to Clients" modal opens instantly
  useFocusEffect(
    React.useCallback(() => {
      console.log('[LibraryScreen] 🚀 Prefetching clients on focus...');
      queryClient.prefetchQuery({
        queryKey: ['clients'],
        queryFn: async () => {
          console.log('[LibraryScreen] 📡 Executing prefetch queryFn...');
          const { getClients } = await import('@/services/coach/coach-client-service');
          const data = await getClients();
          console.log('[LibraryScreen] ✅ Prefetch complete:', data.length, 'clients cached');
          return data;
        },
      });
    }, [queryClient])
  );

  const tabs: LibraryTab[] = [
    'workouts',
    'sections',
    'exercises',
    'checkIns',
    'questionnaires',
    'metrics',
    'habits',
    'files',
  ];

  const tabComponents = useMemo(() => [
    { key: 'workouts', component: WorkoutsTab },
    { key: 'sections', component: SectionsTab },
    { key: 'exercises', component: ExercisesTab },
    { key: 'checkIns', component: CheckInsTab },
    { key: 'questionnaires', component: QuestionnairesTab },
    { key: 'metrics', component: MetricsTab },
    { key: 'habits', component: HabitsTab },
    { key: 'files', component: FilesTab },
  ], []);

  // Extra padding for the underline to make it slightly wider than the tab text
  const UNDERLINE_EXTRA_WIDTH = 8;

  const animateUnderline = (index: number) => {
    const layout = tabLayoutsRef.current[index];
    if (layout) {
      underlinePosition.value = withTiming(layout.x - UNDERLINE_EXTRA_WIDTH / 2, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
      underlineWidth.value = withTiming(layout.width + UNDERLINE_EXTRA_WIDTH, {
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
    }
  };

  const handleTabPress = (index: number) => {
    // If a row is open, just close it and prevent tab change
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();
    isProgrammaticChange.current = true; // Mark as programmatic to prevent handlePageSelected from animating
    setSelectedIndex(index);
    animateUnderline(index);
    setCurrentLibraryTab(tabs[index]);
    setSearchQuery('');

    pagerRef.current?.setPage(index);

    // Scroll tab bar to keep selected tab visible
    const layout = tabLayoutsRef.current[index];
    if (layout) {
      tabBarScrollRef.current?.scrollTo({
        x: layout.x - SCREEN_WIDTH / 2 + layout.width / 2,
        animated: true,
      });
    }
  };

  const handlePageSelected = (event: PagerViewOnPageSelectedEvent) => {
    const index = event.nativeEvent.position;

    // Skip if this is a programmatic change (tab press handles animation)
    if (isProgrammaticChange.current) {
      if (index === selectedIndex) {
        // Final page reached, reset flag
        isProgrammaticChange.current = false;
      }
      return;
    }

    // User swipe - handle normally
    if (index !== selectedIndex) {
      // If a row is open, just close it and prevent page change
      if (isRowOpen) {
        closeOpenRow();
        return;
      }

      haptics.medium();
      closeOpenRow();
      setSelectedIndex(index);
      animateUnderline(index);
      setCurrentLibraryTab(tabs[index]);
      setSearchQuery('');

      // Scroll tab bar to keep selected tab visible
      const layout = tabLayoutsRef.current[index];
      if (layout) {
        tabBarScrollRef.current?.scrollTo({
          x: layout.x - SCREEN_WIDTH / 2 + layout.width / 2,
          animated: true,
        });
      }
    }
  };

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    tabLayoutsRef.current[index] = { x, width };

    // Initialize underline position on first layout
    if (index === selectedIndex && underlineWidth.value === 0) {
      underlinePosition.value = x - UNDERLINE_EXTRA_WIDTH / 2;
      underlineWidth.value = width + UNDERLINE_EXTRA_WIDTH;
    }
  };

  const animatedUnderlineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: underlinePosition.value }],
      width: underlineWidth.value,
    };
  });

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        {/* Title */}
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('library.title')}
        </Text>

        {/* Horizontal Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            ref={tabBarScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBarContainer}
            contentContainerStyle={styles.tabBarContent}
          >
            <View style={styles.tabsRow}>
              {tabs.map((tab, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <View
                    key={tab}
                    onLayout={(event) => handleTabLayout(index, event)}
                  >
                    <PressableOpacity
                      style={styles.tab}
                      onPress={() => handleTabPress(index)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          {
                            color: isSelected ? themeColors.text : themeColors.mutedText,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {t(`library.tabs.${tab}`)}
                      </Text>
                    </PressableOpacity>
                  </View>
                );
              })}

              {/* Animated underline - inside ScrollView to scroll with tabs */}
              <Animated.View
                style={[
                  styles.animatedUnderline,
                  { backgroundColor: primaryColor },
                  animatedUnderlineStyle,
                ]}
              />
            </View>
          </ScrollView>

          {/* Full-width divider - extends beyond container padding */}
          <View style={[styles.divider, { backgroundColor: themeColors.mutedText }]} />
        </View>

        {/* Tab Content with PagerView */}
        <PagerView
          ref={pagerRef}
          style={styles.contentWrapper}
          initialPage={0}
          onPageSelected={handlePageSelected}
          scrollEnabled={!isRowOpen}
        >
          {tabComponents.map(({ key, component: Component }) => (
            <View key={key} style={styles.tabContentItem}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  if (isRowOpen) {
                    closeOpenRow();
                  }
                }}
              >
                <Component />
              </Pressable>
            </View>
          ))}
        </PagerView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tabBarWrapper: {
    position: 'relative',
  },
  tabBarContainer: {
    flexGrow: 0,
  },
  tabBarContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 24,
    position: 'relative',
  },
  tab: {
    paddingVertical: 8,
  },
  tabText: {
    ...typography.p1,
  },
  divider: {
    width: '100%',
    height: 1,
    opacity: 0.3,
    marginTop: 0,
    marginBottom: 0,
  },
  animatedUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
    zIndex: 10,
  },
  contentWrapper: {
    flex: 1,
  },
  tabContentItem: {
    flex: 1,
  },
});
