import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableOpacity, PressableScale } from 'pressto';
import { ArrowLeft, HelpCircle, ClipboardList, ChevronRight } from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';
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
import { PlatformIcon } from '@/components/ui/platform-icon';
import { haptics } from '@/utils/haptics';
import { useAthleteQuestionnaires, type AthleteQuestionnaire } from '@/hooks/useAthleteQuestionnaires';

const HEADER_HEIGHT = 52;

type TabKey = 'outstanding' | 'historic';

export default function AthleteQuestionnairesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const [selectedTab, setSelectedTab] = useState<TabKey>('outstanding');
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

  // Fetch questionnaires from API
  const {
    outstandingQuestionnaires,
    historicQuestionnaires,
    isLoading,
  } = useAthleteQuestionnaires();

  const UNDERLINE_EXTRA_WIDTH = 8;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'outstanding', label: t('athlete.questionnaires.tabs.outstanding') },
    { key: 'historic', label: t('athlete.questionnaires.tabs.historic') },
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

  const handleQuestionnairePress = useCallback((item: AthleteQuestionnaire) => {
    haptics.medium();
    if (item.status === 'pending') {
      // Open form response session modal
      router.push({
        pathname: '/modals/athlete/form-response-session-modal',
        params: {
          questionnaireId: item.id,
          questionnaireName: item.name,
          questionsJson: JSON.stringify(item.questions),
        },
      });
    } else {
      // Open form review modal for completed questionnaires
      router.push({
        pathname: '/modals/athlete/form-review-modal',
        params: {
          questionnaireId: item.id,
          questionnaireName: item.name,
          questionsJson: JSON.stringify(item.questions),
          answersJson: JSON.stringify(item.answers || []),
        },
      });
    }
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: AthleteQuestionnaire; index: number }) => {
    const questionCount = item.questions?.length ?? 0;
    const data = selectedTab === 'outstanding' ? outstandingQuestionnaires : historicQuestionnaires;
    const isLastItem = index === data.length - 1;

    return (
      <View>
        <PressableScale
          style={styles.rowWrapper}
          onPress={() => handleQuestionnairePress(item)}
        >
          <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
            <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
              <PlatformIcon
                sf="list.bullet.rectangle.portrait.fill"
                IconComponent={ClipboardList}
                size={24}
                color={themeColors.text}
              />
            </SquircleView>
            <View style={styles.textContent}>
              <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.metaRow}>
                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                  <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                    {questionCount} {questionCount === 1 ? t('general.question') : t('general.questions')}
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
          </View>
        </PressableScale>

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
  }, [selectedTab, outstandingQuestionnaires, historicQuestionnaires, themeColors, t, handleQuestionnairePress]);

  const renderEmptyState = (isHistoric: boolean) => (
    <View style={styles.emptyState}>
      <PlatformIcon
        sf="questionmark.circle"
        IconComponent={HelpCircle}
        size={48}
        color={themeColors.mutedText}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {isHistoric ? t('athlete.questionnaires.emptyHistoricTitle') : t('athlete.questionnaires.emptyOutstandingTitle')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.mutedText }]}>
        {isHistoric ? t('athlete.questionnaires.emptyHistoricSubtitle') : t('athlete.questionnaires.emptyOutstandingSubtitle')}
      </Text>
    </View>
  );

  const currentData = selectedTab === 'outstanding' ? outstandingQuestionnaires : historicQuestionnaires;

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
        <FlashList<AthleteQuestionnaire>
          data={currentData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => renderEmptyState(selectedTab === 'historic')}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={80}
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
          {t('athlete.questionnaires.title')}
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
  rowWrapper: {
    width: '100%',
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
