import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableOpacity, PressableScale } from 'pressto';
import { ArrowLeft, Plus, Target, Heart, Calendar } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useAuth, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { Dialog } from '@/components/ui/dialog';
import { haptics } from '@/utils/haptics';
import {
  getAthleteGoals,
  getAthleteInjuries,
  deleteAthleteGoal,
  deleteAthleteInjury,
  type AthleteGoal,
  type AthleteInjury,
} from '@/services/client/client-service';

const HEADER_HEIGHT = 52;

type TabKey = 'goals' | 'injuries';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function AthleteGoalsInjuriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { clientProfile } = useAuth();

  const [selectedTab, setSelectedTab] = useState<TabKey>('goals');
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

  // Data state
  const [goals, setGoals] = useState<AthleteGoal[]>([]);
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isLoadingInjuries, setIsLoadingInjuries] = useState(true);

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Store setters
  const setStoreGoals = useClientDetailStore((state) => state.setGoals);
  const setStoreInjuries = useClientDetailStore((state) => state.setInjuries);
  const setStoreClientId = useClientDetailStore((state) => state.setClientId);
  const setStoreCoachId = useClientDetailStore((state) => state.setCoachId);

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

  // Fetch data
  useFocusEffect(
    useCallback(() => {
      if (!clientProfile?.client_id || !clientProfile?.coach_id) return;

      // Set IDs in store for modals
      setStoreClientId(clientProfile.client_id);
      setStoreCoachId(clientProfile.coach_id);

      const fetchGoals = async () => {
        try {
          const data = await getAthleteGoals(clientProfile.client_id, clientProfile.coach_id);
          setGoals(data);
          setStoreGoals(data);
        } catch (error) {
          console.error('[AthleteGoalsInjuries] Error fetching goals:', error);
        } finally {
          setIsLoadingGoals(false);
        }
      };

      const fetchInjuries = async () => {
        try {
          const data = await getAthleteInjuries(clientProfile.client_id, clientProfile.coach_id);
          setInjuries(data);
          setStoreInjuries(data);
        } catch (error) {
          console.error('[AthleteGoalsInjuries] Error fetching injuries:', error);
        } finally {
          setIsLoadingInjuries(false);
        }
      };

      fetchGoals();
      fetchInjuries();
    }, [clientProfile?.client_id, clientProfile?.coach_id])
  );

  const UNDERLINE_EXTRA_WIDTH = 8;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'goals', label: t('athlete.goalsInjuries.tabs.goals') },
    { key: 'injuries', label: t('athlete.goalsInjuries.tabs.injuries') },
  ];

  const animateUnderline = (tabKey: TabKey) => {
    const layout = tabLayoutsRef.current[tabKey];
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

  const handleTabPress = (tabKey: TabKey) => {
    if (selectedTab !== tabKey) {
      haptics.medium();
      setSelectedTab(tabKey);
      // Close any open swipe rows when switching tabs
      closeOpenRow();
    }
  };

  useEffect(() => {
    if (selectedTab) {
      animateUnderline(selectedTab);
    }
  }, [selectedTab]);

  const handleTabLayout = (tabKey: TabKey, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    tabLayoutsRef.current[tabKey] = { x, width };

    if (tabKey === selectedTab && underlineWidth.value === 0) {
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleAddGoal = () => {
    if (!clientProfile?.client_id) return;
    haptics.medium();
    router.push({
      pathname: '/modals/client/add-client-goal-modal',
      params: { id: clientProfile.client_id },
    });
  };

  const handleAddInjury = () => {
    if (!clientProfile?.client_id) return;
    haptics.medium();
    router.push({
      pathname: '/modals/client/add-client-injury-modal',
      params: { id: clientProfile.client_id },
    });
  };

  const handleGoalPress = useCallback((goalId: string) => {
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    if (openRowRef.current) {
      closeOpenRow();
      return;
    }
    if (!clientProfile?.client_id) return;
    haptics.medium();
    router.push({
      pathname: '/modals/client/edit-client-goal-modal',
      params: { id: clientProfile.client_id, goalId },
    });
  }, [closeOpenRow, router, clientProfile?.client_id]);

  const handleInjuryPress = useCallback((injuryId: string) => {
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    if (openRowRef.current) {
      closeOpenRow();
      return;
    }
    if (!clientProfile?.client_id) return;
    haptics.medium();
    router.push({
      pathname: '/modals/client/edit-client-injury-modal',
      params: { id: clientProfile.client_id, injuryId },
    });
  }, [closeOpenRow, router, clientProfile?.client_id]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!clientProfile?.client_id || !clientProfile?.coach_id) return;

    try {
      await deleteAthleteGoal(clientProfile.client_id, clientProfile.coach_id, goalId);
      const remainingGoals = goals.filter((g) => g.id !== goalId);
      setGoals(remainingGoals);
      setStoreGoals(remainingGoals);
      haptics.success();
    } catch (error) {
      haptics.error();
      setShowErrorDialog(true);
    }
  }, [goals, clientProfile?.client_id, clientProfile?.coach_id, setStoreGoals]);

  const handleDeleteInjury = useCallback(async (injuryId: string) => {
    if (!clientProfile?.client_id || !clientProfile?.coach_id) return;

    try {
      await deleteAthleteInjury(clientProfile.client_id, clientProfile.coach_id, injuryId);
      const remainingInjuries = injuries.filter((i) => i.id !== injuryId);
      setInjuries(remainingInjuries);
      setStoreInjuries(remainingInjuries);
      haptics.success();
    } catch (error) {
      haptics.error();
      setShowErrorDialog(true);
    }
  }, [injuries, clientProfile?.client_id, clientProfile?.coach_id, setStoreInjuries]);

  const dropdownOptions = [
    {
      label: t('athlete.goalsInjuries.addGoal'),
      icon: { sf: 'target', IconComponent: Target },
      onPress: handleAddGoal,
    },
    {
      label: t('athlete.goalsInjuries.addInjury'),
      icon: { sf: 'heart', IconComponent: Heart },
      onPress: handleAddInjury,
    },
  ];

  const renderGoalItem = useCallback(({ item, index }: { item: AthleteGoal; index: number }) => {
    const isLastItem = index === goals.length - 1;

    return (
      <View>
        <SwipeableRow
          onDelete={() => handleDeleteGoal(item.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={t('general.deleteGoal')}
        >
          <PressableScale onPress={() => handleGoalPress(item.id)}>
            <View style={[styles.itemRow, { backgroundColor: themeColors.backgroundPrimary }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                <PlatformIcon
                  sf="target"
                  IconComponent={Target}
                  size={24}
                  color={item.achieved ? themeColors.success : themeColors.text}
                />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: themeColors.text },
                      item.achieved && styles.itemTitleAchieved,
                    ]}
                    numberOfLines={2}
                  >
                    {item.goal}
                  </Text>
                  {item.target_date && (
                    <View style={[styles.datePill, { borderColor: themeColors.mutedText }]}>
                      <PlatformIcon
                        sf="scope"
                        IconComponent={Target}
                        size={12}
                        color={themeColors.mutedText}
                      />
                      <Text style={[styles.dateText, { color: themeColors.mutedText }]}>
                        {formatDate(item.target_date)}
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
    );
  }, [goals, themeColors, handleGoalPress, handleDeleteGoal, registerOpenRow, t]);

  const renderInjuryItem = useCallback(({ item, index }: { item: AthleteInjury; index: number }) => {
    const isLastItem = index === injuries.length - 1;

    return (
      <View>
        <SwipeableRow
          onDelete={() => handleDeleteInjury(item.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={t('general.deleteInjury')}
        >
          <PressableScale onPress={() => handleInjuryPress(item.id)}>
            <View style={[styles.itemRow, { backgroundColor: themeColors.backgroundPrimary }]}>
              <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                <PlatformIcon
                  sf="heart"
                  IconComponent={Heart}
                  size={24}
                  color={themeColors.error}
                />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: themeColors.text }]} numberOfLines={2}>
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
    );
  }, [injuries, themeColors, handleInjuryPress, handleDeleteInjury, registerOpenRow, t]);

  const renderEmptyState = (isGoals: boolean) => (
    <View style={styles.emptyState}>
      <PlatformIcon
        sf={isGoals ? 'target' : 'heart'}
        IconComponent={isGoals ? Target : Heart}
        size={48}
        color={themeColors.mutedText}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {isGoals ? t('athlete.goalsInjuries.emptyGoals') : t('athlete.goalsInjuries.emptyInjuries')}
      </Text>
    </View>
  );

  const isLoading = selectedTab === 'goals' ? isLoadingGoals : isLoadingInjuries;

  const ListHeader = () => (
    <View style={[styles.tabsWrapper, { borderBottomColor: themeColors.border }]}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isSelected = selectedTab === tab.key;
          return (
            <View
              key={tab.key}
              style={styles.tabContainer}
              onLayout={(event) => handleTabLayout(tab.key, event)}
            >
              <PressableOpacity
                style={styles.tab}
                onPress={() => handleTabPress(tab.key)}
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
                  {tab.label}
                </Text>
              </PressableOpacity>
            </View>
          );
        })}

        <Animated.View
          style={[
            styles.animatedUnderline,
            { backgroundColor: primaryColor },
            animatedUnderlineStyle,
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      {isLoading ? (
        <>
          <View style={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT }]}>
            <ListHeader />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        </>
      ) : selectedTab === 'goals' ? (
        <FlashList<AthleteGoal>
          data={goals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => renderEmptyState(true)}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={70}
        />
      ) : (
        <FlashList<AthleteInjury>
          data={injuries}
          renderItem={renderInjuryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => renderEmptyState(false)}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={70}
        />
      )}

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ArrowLeft }}
          onPress={handleBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('athlete.goalsInjuries.title')}
        </Text>
        <DropdownMenuWrapper options={dropdownOptions}>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={themeColors.text}
          />
        </DropdownMenuWrapper>
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
  container: {
    flex: 1,
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
  title: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tabContainer: {
    flex: 1,
  },
  tab: {
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabText: {
    ...typography.p1,
  },
  animatedUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    ...typography.h7,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  itemTitleAchieved: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h5,
    textAlign: 'center',
    marginTop: 8,
  },
});
