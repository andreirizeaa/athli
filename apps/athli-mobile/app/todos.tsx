import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableOpacity, PressableScale } from 'pressto';
import { ArrowLeft, Plus, Check } from 'lucide-react-native';
import { PlatformIcon } from '@/components/ui/platform-icon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Separator } from '@/components/ui/separator';
import { haptics } from '@/utils/haptics';
import { useCoachOwnTodos, useCoachAutoTodos } from '@/hooks/useCoachTodo';
import type { YourListTask, AthliAssistantTask } from '@/services/coach/coach-todo-service';

const HEADER_HEIGHT = 52;

type TabKey = 'yourList' | 'aiAssistant';

// Animated task row with completion animation
type AnimatedTaskRowProps = {
  isCompleting: boolean;
  onComplete: () => void;
  onAnimationEnd: () => void;
  primaryColor: string;
  borderColor: string;
  checkColor: string;
  children: React.ReactNode;
};

const AnimatedTaskRow = ({ isCompleting, onComplete, onAnimationEnd, primaryColor, borderColor, checkColor, children }: AnimatedTaskRowProps) => {
  const checkboxScale = useSharedValue(1);
  const rowOpacity = useSharedValue(1);
  const hasAnimated = useRef(false);
  const onAnimationEndRef = useRef(onAnimationEnd);

  useEffect(() => {
    onAnimationEndRef.current = onAnimationEnd;
  }, [onAnimationEnd]);

  const triggerAnimationEnd = useCallback(() => {
    onAnimationEndRef.current();
  }, []);

  useEffect(() => {
    if (isCompleting && !hasAnimated.current) {
      hasAnimated.current = true;
      // Checkbox: pop up with spring
      checkboxScale.value = withSpring(1.25, { damping: 12, stiffness: 400 });

      // Row: fade out after checkbox animation, then trigger removal
      rowOpacity.value = withDelay(
        350,
        withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished) {
            runOnJS(triggerAnimationEnd)();
          }
        })
      );
    }
  }, [isCompleting, triggerAnimationEnd]);

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
  }));

  return (
    <Animated.View style={rowAnimatedStyle}>
      <View style={styles.taskRow}>
        <PressableScale onPress={onComplete} style={styles.checkboxContainer}>
          <Animated.View style={checkboxAnimatedStyle}>
            <View
              style={[
                styles.checkbox,
                { borderColor: isCompleting ? primaryColor : borderColor },
                isCompleting && { backgroundColor: primaryColor },
              ]}
            >
              {isCompleting && (
                <PlatformIcon sf="checkmark" IconComponent={Check} size={18} color={checkColor} />
              )}
            </View>
          </Animated.View>
        </PressableScale>
        {children}
      </View>
    </Animated.View>
  );
};

export default function TodosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const [selectedTab, setSelectedTab] = useState<TabKey>('yourList');
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

  // Fetch data for both tabs
  const { ownTodos, isLoading: isLoadingOwn, deleteOwnTodo } = useCoachOwnTodos();
  const { autoTodos, isLoading: isLoadingAuto, completeAutoTodo } = useCoachAutoTodos();

  const UNDERLINE_EXTRA_WIDTH = 8;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'yourList', label: t('todos.tabs.yourList') },
    { key: 'aiAssistant', label: t('todos.tabs.aiAssistant') },
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

  const handleAddTask = () => {
    router.push('/modals/todo/add-todo-modal');
  };

  const handleCompleteOwnTodo = useCallback((id: string) => {
    if (completingIds.has(id)) return;
    haptics.success();
    setCompletingIds(prev => new Set(prev).add(id));
  }, [completingIds]);

  const handleOwnTodoAnimationEnd = useCallback(async (id: string) => {
    try {
      await deleteOwnTodo(id);
    } catch (error) {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [deleteOwnTodo]);

  const handleCompleteAutoTodo = useCallback((id: string) => {
    if (completingIds.has(id)) return;
    haptics.success();
    setCompletingIds(prev => new Set(prev).add(id));
  }, [completingIds]);

  const handleAutoTodoAnimationEnd = useCallback(async (id: string) => {
    try {
      await completeAutoTodo(id);
    } catch (error) {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [completeAutoTodo]);

  const handleEditTodo = useCallback((item: YourListTask) => {
    router.push({
      pathname: '/modals/todo/edit-todo-modal',
      params: {
        todoId: item.id,
        initialTitle: item.title,
        initialDescription: item.information || '',
        initialType: item.type,
        initialDueDate: item.dueDate,
        initialClientId: item.clientId || '',
        initialClientName: item.clientName || '',
        initialClientAvatar: item.clientAvatar || '',
      },
    });
  }, [router]);

  const formatDueDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    return `${day} ${month}`;
  };

  const isOverdue = (dateString?: string): boolean => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const renderYourListItem = useCallback(({ item }: { item: YourListTask }) => {
    const overdue = item.dueDate ? isOverdue(item.dueDate) : false;
    const isCompleting = completingIds.has(item.id);
    const hasAvatar = item.type === 'client' && item.clientAvatar;
    const pillColor = overdue && !isCompleting ? primaryColor : themeColors.mutedText;

    return (
      <AnimatedTaskRow
        isCompleting={isCompleting}
        onComplete={() => handleCompleteOwnTodo(item.id)}
        onAnimationEnd={() => handleOwnTodoAnimationEnd(item.id)}
        primaryColor={primaryColor}
        borderColor={themeColors.border}
        checkColor={themeColors.primaryForeground}
      >
        <PressableOpacity
          style={styles.taskPressable}
          onPress={() => handleEditTodo(item)}
          enabled={!isCompleting}
        >
          {hasAvatar && (
            <Image
              source={{ uri: item.clientAvatar }}
              style={styles.clientAvatar}
              contentFit="cover"
            />
          )}

          <View style={styles.taskContent}>
            <View style={styles.taskTitleRow}>
              <Text
                style={[
                  styles.taskTitle,
                  { color: themeColors.text },
                  isCompleting && styles.taskCompleted,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.dueDate && (
                <View style={[styles.dueDatePill, { borderColor: pillColor }]}>
                  <Text
                    style={[
                      styles.dueDateText,
                      { color: pillColor },
                      isCompleting && styles.taskCompleted,
                    ]}
                  >
                    {formatDueDate(item.dueDate)}
                  </Text>
                </View>
              )}
            </View>
            {item.information && (
              <Text
                style={[
                  styles.taskInfo,
                  { color: themeColors.mutedText },
                  isCompleting && styles.taskCompleted,
                ]}
                numberOfLines={1}
              >
                {item.information}
              </Text>
            )}
          </View>
        </PressableOpacity>
      </AnimatedTaskRow>
    );
  }, [completingIds, handleCompleteOwnTodo, handleOwnTodoAnimationEnd, handleEditTodo, primaryColor, themeColors]);

  const renderAutoItem = useCallback(({ item }: { item: AthliAssistantTask }) => {
    const isCompleting = completingIds.has(item.id);
    const hasAvatar = item.clientAvatar;

    return (
      <AnimatedTaskRow
        isCompleting={isCompleting}
        onComplete={() => handleCompleteAutoTodo(item.id)}
        onAnimationEnd={() => handleAutoTodoAnimationEnd(item.id)}
        primaryColor={primaryColor}
        borderColor={themeColors.border}
        checkColor={themeColors.primaryForeground}
      >
        <View style={styles.taskPressable}>
          {hasAvatar && (
            <Image
              source={{ uri: item.clientAvatar }}
              style={styles.clientAvatar}
              contentFit="cover"
            />
          )}

          <View style={styles.taskContent}>
            <Text
              style={[
                styles.taskTitle,
                { color: themeColors.text },
                isCompleting && styles.taskCompleted,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.clientName && (
              <View style={styles.taskMeta}>
                <Text
                  style={[
                    styles.taskInfo,
                    { color: themeColors.mutedText },
                    isCompleting && styles.taskCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {item.clientName}
                </Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedTaskRow>
    );
  }, [completingIds, handleCompleteAutoTodo, handleAutoTodoAnimationEnd, primaryColor, themeColors]);

  const renderEmptyState = (isAiTab: boolean) => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {isAiTab ? t('todos.emptyAiTitle') : t('todos.emptyOwnTitle')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.mutedText }]}>
        {isAiTab ? t('todos.emptyAiSubtitle') : t('todos.emptyOwnSubtitle')}
      </Text>
    </View>
  );

  const isLoading = selectedTab === 'yourList' ? isLoadingOwn : isLoadingAuto;

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
      ) : selectedTab === 'yourList' ? (
        <FlashList<YourListTask>
          data={ownTodos}
          renderItem={renderYourListItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Separator style={styles.separator} />}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => renderEmptyState(false)}
          showsVerticalScrollIndicator={false}
          extraData={completingIds}
        />
      ) : (
        <FlashList<AthliAssistantTask>
          data={autoTodos}
          renderItem={renderAutoItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Separator style={styles.separator} />}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => renderEmptyState(true)}
          showsVerticalScrollIndicator={false}
          extraData={completingIds}
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
          {t('todos.title')}
        </Text>
        <IconButton
          icon={{ sf: 'plus', IconComponent: Plus }}
          onPress={handleAddTask}
          size="md"
          color={themeColors.text}
        />
      </View>
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
    marginBottom: 8,
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
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitle: {
    ...typography.p1,
    flex: 1,
  },
  dueDatePill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dueDateText: {
    ...typography.p4,
    fontWeight: '500',
  },
  taskInfo: {
    ...typography.p3,
    marginTop: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  separator: {
    marginLeft: 52,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    ...typography.h5,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.p2,
    textAlign: 'center',
  },
});
