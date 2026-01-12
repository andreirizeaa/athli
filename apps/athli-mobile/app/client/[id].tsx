import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, LayoutChangeEvent, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Pencil, MessageCircle, Settings, ChevronRight, Plus, BarChart3, Repeat, Image as ImageIcon, File, ClipboardCheck, HelpCircle, Dumbbell, Notebook, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import {
  getChats,
  createNewChat,
  getChatMessages,
} from '@/services/chats-service';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { PressableOpacity } from 'pressto';

// Mock client data
const MOCK_CLIENT = {
  id: '1',
  name: 'Sarah Johnson',
  firstName: 'Sarah',
  lastName: 'Johnson',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  email: 'sarah.johnson@email.com',
  age: 28,
  coachingType: 'hybrid' as const,
};

const MOCK_BIO = "Experienced marathon runner currently focused on improving 5k speed. Looking to balance high-intensity training with better recovery and nutritional consistency.";

const MOCK_GOALS = [
  { id: '1', title: 'Improve 5k Personal Best to under 20 minutes', date: '2026-03-15' },
  { id: '2', title: 'Complete consistent strength training 2x per week', date: '2026-06-01' },
  { id: '3', title: 'Increase daily water intake to 3L', date: null },
];

const MOCK_INJURIES = [
  { id: '1', title: 'Left Achilles Tendonitis (Mild)', date: '2025-11-10' },
  { id: '2', title: 'Old lower back strain (Recovered, needs warm-up)', date: '2024-05-20' },
];

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  // Use mock client data directly
  const client = MOCK_CLIENT;
  const isLoading = false;

  /* Tabs State */
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabLayoutsRef = useRef<{ [key: number]: { x: number; width: number } }>({});
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);

  const iconColor = themeColors.text;

  const handleBackPress = () => {
    router.back();
  };

  const tabs = [t('clientDetail.tabs.overview'), t('clientDetail.tabs.more')];

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndex(index);
    animateUnderline(index);
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

  const handleChatPress = async () => {
    if (!client?.id) return;

    try {
      // Check if chat already exists for this client
      const existingChats = await getChats();
      let chat = existingChats.find((c) => c.clientId === client.id);

      // If no chat exists, create a new one
      if (!chat) {
        chat = await createNewChat(client.id, {
          clientName: client.name,
          clientAvatar: client.avatarUrl,
        });
      }

      // Get messages for the chat
      const messages = await getChatMessages(chat.id);

      // Navigate to the chat detail screen
      router.push({
        pathname: '/chats/[id]',
        params: {
          id: chat.id,
          chat: JSON.stringify(chat),
          messages: JSON.stringify(messages),
        },
      });
    } catch (error) {
      console.error('Failed to open chat:', error);
    }
  };

  const handleEditDetails = () => {
    router.push({
      pathname: '/modals/client/edit-client-details-modal',
      params: { id: client?.id },
    });
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: themeColors.pageBackground,
            paddingTop: insets.top,
            paddingBottom: 0,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <IconButton
            icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
            style={{ marginRight: 12 }}
          />
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatarCircle,
                styles.avatarPlaceholder,
                { width: 42, height: 42, borderRadius: 21 },
              ]}
            />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {t('clientDetail.loading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScreenWrapper
      scrollable={true}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.pageBackground,
            paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
          },
        ]}
      >
        <IconButton
          icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
          style={{ marginRight: 4 }}
        />
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            {client?.avatarUrl ? (
              <Image
                source={{ uri: client.avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                contentPosition="center"
              />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={{ color: themeColors.mutedText }}>
                  {client?.name?.charAt(0)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {client?.name || t('clientDetail.loading')}
        </Text>
        <View style={styles.headerActions}>
          <IconButton
            icon={{ sf: 'message', IconComponent: MessageCircle }}
            onPress={handleChatPress}
            size="md"
            color={iconColor}
          />
          <IconButton
            icon={{ sf: 'pencil', IconComponent: Pencil }}
            onPress={handleEditDetails}
            size="md"
            color={iconColor}
          />
        </View>
      </View>

      {/* Tab Content Wrapper */}
      <View style={styles.gestureContainer}>
        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: themeColors.border }]}>
          {tabs.map((tab, index) => {
            const isSelected = selectedIndex === index;
            return (
              <View
                key={tab}
                onLayout={(e) => handleTabLayout(index, e)}
                style={{ flex: 1 }}
              >
                <Pressable
                  onPress={() => handleTabPress(index)}
                  style={styles.tab}
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
                    {tab}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          {/* Animated underline */}
          <Animated.View
            style={[
              styles.animatedUnderline,
              { backgroundColor: primaryColor },
              animatedUnderlineStyle,
            ]}
          />
        </View>

        {/* Tab Content */}
        <View style={{ flex: 1 }}>
          {selectedIndex === 0 ? (
            <View style={styles.overviewContainer}>
              {/* Activity Card */}
              <Card style={styles.overviewCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {t('clientDetail.overview.activity')}
                  </Text>
                </View>
                <Separator style={styles.cardSeparator} />
                <View style={styles.cardContentNoPadding}>
                  <View style={styles.rowItemStatic}>
                    <Text style={[styles.rowText, { color: themeColors.mutedText }]}>
                      {t('clientDetail.overview.lastActivity')}
                    </Text>
                    <Text style={[styles.rowValue, { color: themeColors.text }]}>24 hours ago</Text>
                  </View>
                  <Separator style={styles.rowSeparator} />
                  <View style={styles.rowItemStatic}>
                    <Text style={[styles.rowText, { color: themeColors.mutedText }]}>
                      {t('clientDetail.overview.pastWeek')}
                    </Text>
                    <Text style={[styles.rowValue, { color: themeColors.text }]}>
                      5 {t('clientDetail.overview.completed')}
                    </Text>
                  </View>
                  <Separator style={styles.rowSeparator} />
                  <View style={styles.rowItemStatic}>
                    <Text style={[styles.rowText, { color: themeColors.mutedText }]}>
                      {t('clientDetail.overview.pastMonth')}
                    </Text>
                    <Text style={[styles.rowValue, { color: themeColors.text }]}>
                      18 {t('clientDetail.overview.completed')}
                    </Text>
                  </View>
                  <Separator style={styles.rowSeparator} />
                  <View style={styles.rowItemStatic}>
                    <Text style={[styles.rowText, { color: themeColors.mutedText }]}>
                      {t('clientDetail.overview.nextWeek')}
                    </Text>
                    <Text style={[styles.rowValue, { color: themeColors.text }]}>
                      4 {t('clientDetail.overview.planned')}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Bio Card */}
              <Card style={styles.overviewCard}>
                <PressableOpacity onPress={() => router.push({ pathname: '/modals/client/edit-client-bio-modal', params: { id: client?.id } })}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                      {t('clientDetail.overview.bio')}
                    </Text>
                    <IconButton
                      icon={{ sf: 'pencil', IconComponent: Pencil }}
                      onPress={() => { }}
                      size="sm"
                      color={themeColors.text}
                      style={{ pointerEvents: 'none' }}
                    />
                  </View>
                  <Separator style={styles.cardSeparator} />
                  <View style={styles.cardContent}>
                    <Text style={[styles.bioText, { color: themeColors.text }]} numberOfLines={5}>
                      {MOCK_BIO}
                    </Text>
                  </View>
                </PressableOpacity>
              </Card>

              {/* Goals Card */}
              <Card style={styles.overviewCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {t('clientDetail.overview.goals')}
                  </Text>
                  <IconButton
                    icon={{ sf: 'plus', IconComponent: Plus }}
                    onPress={() => router.push({ pathname: '/modals/client/add-client-goal-modal', params: { id: client?.id } })}
                    size="sm"
                    color={themeColors.text}
                  />
                </View>
                <Separator style={styles.cardSeparator} />
                <View style={styles.cardContentNoPadding}>
                  {MOCK_GOALS.map((goal, index) => (
                    <React.Fragment key={goal.id}>
                      {index > 0 && <Separator style={styles.rowSeparator} />}
                      <PressableOpacity
                        style={styles.rowItem}
                        onPress={() => router.push({ pathname: '/modals/client/edit-client-goal-modal', params: { id: client?.id, goalId: goal.id } })}
                      >
                        <View style={styles.rowContent}>
                          <Text style={[styles.rowText, { color: themeColors.text }]} numberOfLines={1}>
                            {goal.title}
                          </Text>
                          {goal.date && (
                            <Text style={[styles.rowDate, { color: themeColors.mutedText }]}>
                              {new Date(goal.date).toLocaleDateString(undefined, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </Text>
                          )}
                        </View>
                        <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                      </PressableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </Card>

              {/* Injuries Card */}
              <Card style={styles.overviewCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {t('clientDetail.overview.injuries')}
                  </Text>
                  <IconButton
                    icon={{ sf: 'plus', IconComponent: Plus }}
                    onPress={() => router.push({ pathname: '/modals/client/add-client-injury-modal', params: { id: client?.id } })}
                    size="sm"
                    color={themeColors.text}
                  />
                </View>
                <Separator style={styles.cardSeparator} />
                <View style={styles.cardContentNoPadding}>
                  {MOCK_INJURIES.map((injury, index) => (
                    <React.Fragment key={injury.id}>
                      {index > 0 && <Separator style={styles.rowSeparator} />}
                      <PressableOpacity
                        style={styles.rowItem}
                        onPress={() => router.push({ pathname: '/modals/client/edit-client-injury-modal', params: { id: client?.id, injuryId: injury.id } })}
                      >
                        <View style={styles.rowContent}>
                          <Text style={[styles.rowText, { color: themeColors.text }]} numberOfLines={1}>
                            {injury.title}
                          </Text>
                          {injury.date && (
                            <Text style={[styles.rowDate, { color: themeColors.mutedText }]}>
                              {new Date(injury.date).toLocaleDateString(undefined, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </Text>
                          )}
                        </View>
                        <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                      </PressableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </Card>
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              {/* Coaching Card */}
              <Card style={{ marginTop: 2 }}>
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="sparkles"
                      IconComponent={Sparkles}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.assistant')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/assistant`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="note.text"
                      IconComponent={Notebook}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.notes')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/notes`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="figure.run"
                      IconComponent={Dumbbell}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.training')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/training`)}
                />
              </Card>

              {/* Data Card */}
              <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('clientDetail.sections.data')}</Text>
              <Card>
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="chart.bar"
                      IconComponent={BarChart3}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.metrics')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/metrics`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="repeat"
                      IconComponent={Repeat}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.habits')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/habits`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="photo"
                      IconComponent={ImageIcon}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.photos')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/photos`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="doc"
                      IconComponent={File}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.files')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/files`)}
                />
              </Card>

              {/* Forms Card */}
              <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('clientDetail.sections.forms')}</Text>
              <Card>
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="checkmark.circle"
                      IconComponent={ClipboardCheck}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.checkIns')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/check-ins`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="questionmark.circle"
                      IconComponent={HelpCircle}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.questionnaires')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/questionaires`)}
                />
              </Card>

              {/* Settings Card */}
              <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('clientDetail.sections.settingsTitle')}</Text>
              <Card>
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="gear"
                      IconComponent={Settings}
                      size={iconSizes.tabBarIcons}
                      color={iconColor}
                    />
                  }
                  title={t('clientDetail.sections.settings')}
                  showChevron
                  onPress={() => router.push(`/client/${id}/settings`)}
                />
              </Card>
            </View>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarContainer: {
    marginRight: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gestureContainer: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 0,
    borderBottomWidth: 1,
    marginTop: 16,
    backgroundColor: 'transparent',
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
  overviewContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  overviewCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  cardTitle: {
    ...typography.h7,
    fontWeight: '700',
  },
  cardSeparator: {
    marginVertical: 0,
  },
  cardContent: {
    padding: 16,
  },
  cardContentNoPadding: {
    paddingVertical: 4,
  },
  bioText: {
    ...typography.p2,
    lineHeight: 22,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowItemStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowText: {
    ...typography.p2,
    marginRight: 8,
  },
  rowValue: {
    ...typography.p2,
    fontWeight: '600',
  },
  rowDate: {
    ...typography.p4,
  },
  rowSeparator: {
    marginHorizontal: 16,
  },
  optionsContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 0,
  },
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
  separator: {
    marginVertical: 0,
    marginLeft: 0,
  },
});
