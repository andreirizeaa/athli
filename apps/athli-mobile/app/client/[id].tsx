import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreVertical, Pencil, Archive, BarChart3, MessageCircle, Notebook, Dumbbell, Repeat, Image as ImageIcon, File, ClipboardCheck, HelpCircle, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { getClients, type Client } from '@/services/client-service';
import {
  getChats,
  createNewChat,
  getChatMessages,
} from '@/services/chats-service';
import { ListRowItem } from '@/components/list-row-item';
import { Separator } from '@/components/separator';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Tabs State */
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabLayoutsRef = useRef<{ [key: number]: { x: number; width: number } }>({});
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);

  const iconColor = themeColors.text;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const headerBackgroundColor = themeColors.headerBackground;

  useEffect(() => {
    const loadClient = async () => {
      try {
        const clients = await getClients();
        const foundClient = clients.find((c) => c.id === id);
        setClient(foundClient || null);
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadClient();
    }
  }, [id]);

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

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    let newIndex: number;

    if (direction === 'left') {
      newIndex = Math.min(selectedIndex + 1, tabs.length - 1);
    } else {
      newIndex = Math.max(selectedIndex - 1, 0);
    }

    if (newIndex !== selectedIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIndex(newIndex);
      animateUnderline(newIndex);
    }
  }, [selectedIndex, tabs.length]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((event) => {
      if (Math.abs(event.velocityX) > 500 || Math.abs(event.translationX) > 50) {
        if (event.translationX < 0) {
          runOnJS(handleSwipe)('left');
        } else {
          runOnJS(handleSwipe)('right');
        }
      }
    });

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
          clientName: client.fullName,
          clientAvatar: client.avatar,
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
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: themeColors.border },
              ]}
            />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.loading')}</Text>
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
      </View>
    );
  }

  if (!client) {
    return (
      <ScreenWrapper scrollable={false}>
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
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: themeColors.border },
              ]}
            />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.notFound')}</Text>
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
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper contentContainerStyle={{ paddingHorizontal: 0 }}>
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <IconButton
          icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
          style={{ marginRight: 12 }}
        />

        <View style={styles.avatarContainer}>
          {client?.avatar ? (
            <Image source={{ uri: client.avatar }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: themeColors.border },
              ]}
            />
          )}
        </View>

        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {client?.fullName || t('clientDetail.loading')}
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

      {/* Swipe Gesture Wrapper */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.gestureContainer}>
          {/* Tabs */}
          <View style={[styles.tabsContainer, { borderBottomColor: themeColors.border }]}>
            {tabs.map((tab, index) => {
              const isSelected = selectedIndex === index;
              return (
                <View
                  key={tab}
                  style={{ flex: 1 }}
                  onLayout={(event) => handleTabLayout(index, event)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.tab,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
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
          {selectedIndex === 0 ? (
            <View style={styles.contentContainer}>
              <Text style={{ color: themeColors.mutedText }}>{t('clientDetail.overviewPlaceholder')}</Text>
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="sparkles"
                    IconComponent={MessageCircle}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.assistant')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/assistant`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="note.text"
                    IconComponent={Notebook}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.notes')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/notes`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="figure.run"
                    IconComponent={Dumbbell}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.training')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/training`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="chart.bar.fill"
                    IconComponent={BarChart3}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.metrics')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/metrics`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="repeat"
                    IconComponent={Repeat}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.habits')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/habits`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="photo"
                    IconComponent={ImageIcon}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.photos')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/photos`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="doc"
                    IconComponent={File}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.files')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/files`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="checklist"
                    IconComponent={ClipboardCheck}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.checkIns')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/check-ins`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="questionmark.circle"
                    IconComponent={HelpCircle}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.questionnaires')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/questionaires`)}
              />
              <Separator style={styles.separator} />
              <ListRowItem
                style={styles.optionRow}
                icon={
                  <PlatformIcon
                    sf="gear"
                    IconComponent={Settings}
                    size={iconSizes.listIcons}
                    color={iconColor}
                  />
                }
                title={t('clientDetail.sections.settings')}
                showChevron
                chevronSize={12}
                onPress={() => router.push(`/client/${id}/settings`)}
              />
              <Separator style={styles.separator} />
            </View>
          )}
        </View>
      </GestureDetector>
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
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
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
  actionButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 44,
  },
  nestedButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
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
  contentContainer: {
    padding: 20,
  },
  optionsContainer: {
    paddingBottom: 20,
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    marginVertical: 0,
    marginLeft: 0,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 44,
    borderRadius: 22,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flex: 1,
  },
});



