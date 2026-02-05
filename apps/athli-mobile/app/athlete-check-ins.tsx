import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableOpacity } from 'pressto';
import { ArrowLeft, ClipboardCheck } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { haptics } from '@/utils/haptics';

const HEADER_HEIGHT = 52;

type TabKey = 'outstanding' | 'historic';

// Placeholder types - replace with actual types when service is ready
type AthleteCheckIn = {
  id: string;
  name: string;
  dueDate?: string;
  completedAt?: string;
};

export default function AthleteCheckInsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const [selectedTab, setSelectedTab] = useState<TabKey>('outstanding');
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

  // TODO: Replace with actual data from athlete check-ins hook
  const [isLoading] = useState(false);
  const outstandingCheckIns: AthleteCheckIn[] = [];
  const historicCheckIns: AthleteCheckIn[] = [];

  const UNDERLINE_EXTRA_WIDTH = 8;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'outstanding', label: t('athlete.checkIns.tabs.outstanding') },
    { key: 'historic', label: t('athlete.checkIns.tabs.historic') },
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

  const renderItem = ({ item }: { item: AthleteCheckIn }) => {
    return (
      <View style={styles.taskRow}>
        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.dueDate && (
            <Text style={[styles.taskInfo, { color: themeColors.mutedText }]}>
              {item.dueDate}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = (isHistoric: boolean) => (
    <View style={styles.emptyState}>
      <PlatformIcon
        sf="checkmark.circle"
        IconComponent={ClipboardCheck}
        size={48}
        color={themeColors.mutedText}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {isHistoric ? t('athlete.checkIns.emptyHistoricTitle') : t('athlete.checkIns.emptyOutstandingTitle')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.mutedText }]}>
        {isHistoric ? t('athlete.checkIns.emptyHistoricSubtitle') : t('athlete.checkIns.emptyOutstandingSubtitle')}
      </Text>
    </View>
  );

  const currentData = selectedTab === 'outstanding' ? outstandingCheckIns : historicCheckIns;

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
      ) : (
        <FlashList<AthleteCheckIn>
          data={currentData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Separator style={styles.separator} />}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => renderEmptyState(selectedTab === 'historic')}
          showsVerticalScrollIndicator={false}
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
          {t('athlete.checkIns.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
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
  headerPlaceholder: {
    width: 44,
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
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    ...typography.p1,
  },
  taskInfo: {
    ...typography.p3,
    marginTop: 2,
  },
  separator: {
    marginLeft: 16,
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
  emptySubtitle: {
    ...typography.p2,
    textAlign: 'center',
  },
});
