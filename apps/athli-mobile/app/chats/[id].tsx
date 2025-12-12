import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Ellipsis, Archive, Trash2, User, Plus, Camera, Mic, Send } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { MessageInputBar } from '@/components/message-input-bar';
import { getChats, getArchivedChats, archiveChat, deleteChat, type Chat } from '@/services/chats-service';

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const ellipsisButtonRef = useRef<View>(null);
  const actionButtonRef = useRef<View>(null);

  const headerBackgroundColor = themeColors.headerBackground;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const hasText = searchQuery.trim().length > 0;

  useEffect(() => {
    const loadChat = async () => {
      setIsLoading(true);
      try {
        // Try to find chat in regular chats first
        const chats = await getChats();
        let foundChat = chats.find((c) => c.id === id);

        // If not found, try archived chats
        if (!foundChat) {
          const archivedChats = await getArchivedChats();
          foundChat = archivedChats.find((c) => c.id === id);
        }

        setChat(foundChat || null);
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadChat();
    }
  }, [id]);

  const handleBackPress = () => {
    router.back();
  };

  const handleUserProfilePress = () => {
    if (chat?.clientId) {
      router.push(`/client/${chat.clientId}`);
    }
  };

  const handleEllipsisPress = () => {
    actionButtonRef.current?.measureInWindow((x, y, width, height) => {
      setButtonPosition({ x, y, width, height });
      setDropdownVisible(true);
    });
  };

  const handleArchivePress = async () => {
    if (chat?.id) {
      await archiveChat(chat.id);
      setDropdownVisible(false);
      router.back();
    }
  };

  const handleDeletePress = async () => {
    if (chat?.id) {
      await deleteChat(chat.id);
      setDropdownVisible(false);
      router.back();
    }
  };

  const dropdownOptions: DropdownMenuOption[] = [
    {
      label: t('chats.archive'),
      icon: { sf: 'archivebox', IconComponent: Archive },
      onPress: handleArchivePress,
    },
    {
      label: t('chats.delete'),
      icon: { sf: 'trash', IconComponent: Trash2 },
      onPress: handleDeletePress,
    },
  ];

  if (isLoading || !chat) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.pageBackground }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
              {t('general.loading')}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: headerBackgroundColor }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: headerBackgroundColor }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
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
            {chat.clientAvatar ? (
              <Image source={{ uri: chat.clientAvatar }} style={styles.avatar} />
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

          <Text style={[styles.clientName, { color: themeColors.text }]} numberOfLines={1}>
            {chat.clientName}
          </Text>

          <View
            ref={actionButtonRef}
            collapsable={false}
            style={[styles.actionButtonContainer, { backgroundColor: mutedSurfaceColor }]}
          >
            <TouchableOpacity
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleUserProfilePress}
            >
              <PlatformIcon
                sf="person"
                IconComponent={User}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
            <TouchableOpacity
              ref={ellipsisButtonRef}
              style={styles.nestedButton}
              activeOpacity={0.7}
              onPress={handleEllipsisPress}
            >
              <PlatformIcon
                sf="ellipsis"
                IconComponent={Ellipsis}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <DropdownMenu
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        options={dropdownOptions}
        anchorPosition={buttonPosition}
      />
      <ScrollView
        style={[styles.content, { backgroundColor: themeColors.pageBackground }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chat content will go here */}
      </ScrollView>
      <KeyboardAvoidingView
        behavior="translate-with-padding"
        keyboardVerticalOffset={0}
      >
        <View style={[styles.bottomSection, { backgroundColor: headerBackgroundColor, paddingBottom: insets.bottom }]}>
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <PlatformIcon
                sf="plus"
                IconComponent={Plus}
                size={iconSizes.tabBarIcons - 2}
                color={iconColor}
              />
            </TouchableOpacity>
            <View style={styles.searchBarContainer}>
              <MessageInputBar
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
              <>
                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.7}
                >
                  <PlatformIcon
                    sf="camera"
                    IconComponent={Camera}
                    size={iconSizes.tabBarIcons - 2}
                    color={iconColor}
                  />
                </TouchableOpacity>
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
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.p2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    width: 44,
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
  clientName: {
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
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

