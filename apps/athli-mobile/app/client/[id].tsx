import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreVertical, Pencil, Archive, Activity, BarChart3, Calendar, Target, Plus, Camera, Mic, Send, MessageCircle, X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { getClients, type Client } from '@/services/client-service';
import {
  getChats,
  createNewChat,
  getChatMessages,
  type Chat,
} from '@/services/chats-service';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { SettingsOption } from '@/components/settings-option';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { PlatformIcon } from '@/components/platform-icon';
import { MessageInputBar } from '@/components/message-input-bar';
import { KeyboardAwareToolbar } from '@/components/keyboard-aware-toolbar';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assistant' | 'overview' | 'more'>('assistant');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const actionButtonRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);

  const iconColor = themeColors.text;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const headerBackgroundColor = themeColors.headerBackground;
  const hasText = searchQuery.trim().length > 0;

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

  const handleTabPress = (tab: 'assistant' | 'overview' | 'more') => {
    setActiveTab(tab);
  };

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

  const handleEllipsisPress = () => {
    actionButtonRef.current?.measureInWindow((x, y, width, height) => {
      setButtonPosition({ x, y, width, height });
      setDropdownVisible(true);
    });
  };

  const handleEditDetails = () => {
    router.push(`/client/edit-client-details-modal`);
  };

  const handleArchiveClient = () => {
    // TODO: Implement archive client action
  };

  const handlePlusPress = () => {
    if (showAttachmentPicker) {
      // Close attachment picker (keep keyboard open)
      setShowAttachmentPicker(false);
    } else {
      // Open keyboard if not already open
      inputRef.current?.focus();
      // Show attachment picker
      setShowAttachmentPicker(true);
    }
  };


  const dropdownOptions: DropdownMenuOption[] = [
    {
      label: 'Edit details',
      icon: {
        sf: 'pencil',
        IconComponent: Pencil,
      },
      onPress: handleEditDetails,
    },
    {
      label: 'Archive user',
      icon: {
        sf: 'archivebox',
        IconComponent: Archive,
      },
      onPress: handleArchiveClient,
    },
  ];

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
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: themeColors.border },
              ]}
            />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Loading...</Text>
          <View
            ref={actionButtonRef}
            collapsable={false}
            style={[styles.actionButtonContainer, { backgroundColor: mutedSurfaceColor }]}
          >
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleChatPress}
            >
              <PlatformIcon
                sf="message"
                IconComponent={MessageCircle}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleEllipsisPress}
            >
              <PlatformIcon
                sf="ellipsis"
                IconComponent={MoreVertical}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!client) {
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
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: themeColors.border },
              ]}
            />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Client Not Found</Text>
          <View
            ref={actionButtonRef}
            collapsable={false}
            style={[styles.actionButtonContainer, { backgroundColor: mutedSurfaceColor }]}
          >
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleChatPress}
            >
              <PlatformIcon
                sf="message"
                IconComponent={MessageCircle}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleEllipsisPress}
            >
              <PlatformIcon
                sf="ellipsis"
                IconComponent={MoreVertical}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.pageBackground }]}>
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: themeColors.pageBackground,
            paddingTop: insets.top,
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleBackPress}
          >
            <PlatformIcon
              sf="chevron.left"
              IconComponent={ChevronLeft}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            {client.avatar ? (
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
            {client.fullName}
          </Text>
          <View
            ref={actionButtonRef}
            collapsable={false}
            style={[styles.actionButtonContainer, { backgroundColor: mutedSurfaceColor }]}
          >
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleChatPress}
            >
              <PlatformIcon
                sf="message"
                IconComponent={MessageCircle}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleEllipsisPress}
            >
              <PlatformIcon
                sf="ellipsis"
                IconComponent={MoreVertical}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DropdownMenu
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        options={dropdownOptions}
        anchorPosition={buttonPosition}
      />

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: themeColors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'assistant' && styles.tabActive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleTabPress('assistant')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'assistant' && styles.tabTextActive,
              { color: activeTab === 'assistant' ? themeColors.text : themeColors.mutedText },
            ]}
          >
            Assistant
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'overview' && styles.tabActive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleTabPress('overview')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.tabTextActive,
              { color: activeTab === 'overview' ? themeColors.text : themeColors.mutedText },
            ]}
          >
            Overview
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tab,
            activeTab === 'more' && styles.tabActive,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => handleTabPress('more')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'more' && styles.tabTextActive,
              { color: activeTab === 'more' ? themeColors.text : themeColors.mutedText },
            ]}
          >
            More
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'assistant' ? (
        <View style={{ flex: 1, backgroundColor: themeColors.pageBackground }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Assistant content will go here */}
          </ScrollView>

          {/* Bottom bar – anchored to screen bottom, grows upward */}
          <KeyboardAwareToolbar
            backgroundColor={headerBackgroundColor}
            contentStyle={{ paddingHorizontal: 16 }}
            attachmentPicker={
              showAttachmentPicker ? (
                <AttachmentPickerRow backgroundColor={headerBackgroundColor} hideVideos hideCamera />
              ) : undefined
            }
          >
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={handlePlusPress}
            >
              <PlatformIcon
                sf={showAttachmentPicker ? "xmark.circle" : "plus"}
                IconComponent={showAttachmentPicker ? X : Plus}
                size={iconSizes.tabBarIcons - 2}
                color={iconColor}
              />
            </TouchableOpacity>
            <View style={styles.searchBarContainer}>
              <MessageInputBar
                ref={inputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder=""
              />
            </View>
            {hasText ? (
              <TouchableOpacity
                style={styles.sendButton}
                activeOpacity={0.7}
              >
                <PlatformIcon
                  sf="paperplane.circle.fill"
                  IconComponent={Send}
                  size={iconSizes.tabBarIconsIOS + 2}
                  color={themeColors.primary}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <PlatformIcon
                  sf="mic"
                  IconComponent={Mic}
                  size={iconSizes.tabBarIcons - 2}
                  color={iconColor}
                />
              </TouchableOpacity>
            )}
          </KeyboardAwareToolbar>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' && (
            <View>
              {/* Overview content will go here */}
            </View>
          )}

          {activeTab === 'more' && (
            <View style={styles.optionsContainer}>
              <Card>
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="figure.run"
                      IconComponent={Activity}
                      size={iconSizes.listIcons}
                      color={iconColor}
                    />
                  }
                  title="Activity"
                  showChevron
                  onPress={() => router.push(`/client/${id}/activity`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="chart.bar.fill"
                      IconComponent={BarChart3}
                      size={iconSizes.listIcons}
                      color={iconColor}
                    />
                  }
                  title="Metrics"
                  showChevron
                  onPress={() => router.push(`/client/${id}/metrics`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="calendar"
                      IconComponent={Calendar}
                      size={iconSizes.listIcons}
                      color={iconColor}
                    />
                  }
                  title="Training Calendar"
                  showChevron
                  onPress={() => router.push(`/client/${id}/training-calendar`)}
                />
                <Separator />
                <SettingsOption
                  icon={
                    <PlatformIcon
                      sf="target"
                      IconComponent={Target}
                      size={iconSizes.listIcons}
                      color={iconColor}
                    />
                  }
                  title="Goals & Injuries"
                  showChevron
                  onPress={() => router.push(`/client/${id}/goals-injuries`)}
                />
              </Card>
            </View>
          )}
        </ScrollView>
      )}
    </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 0,
    borderBottomWidth: 1,
    marginVertical: 16,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // Removed borderBottomColor to eliminate underscore highlight
  },
  tabText: {
    ...typography.h7,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 0,
  },
  optionsContainer: {
    flex: 1,
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



