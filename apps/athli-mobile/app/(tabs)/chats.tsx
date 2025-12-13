import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Ellipsis, MailCheck, CheckCircle2, Archive, Trash2 } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { SearchBar } from '@/components/search-bar';
import { ChatListItem } from '@/components/chats/chat-list-item';
import { ArchivedItem } from '@/components/chats/archived-item';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { PlatformIcon } from '@/components/platform-icon';
import {
  getChats,
  readAllChats,
  archiveChat,
  deleteChat,
  markChatAsRead,
  getChatMessages,
  type Chat,
} from '@/services/chats-service';

export default function ChatsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const ellipsisButtonRef = useRef<View>(null);

  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;

  useEffect(() => {
    const loadChats = async () => {
      setIsLoading(true);
      try {
        const fetchedChats = await getChats();
        setChats(fetchedChats);
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();
  }, []);

  const totalUnreadCount = useMemo(() => {
    return chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  }, [chats]);

  const filteredChats = useMemo(() => {
    let filtered = chats;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.clientName.toLowerCase().includes(query) ||
          chat.lastMessage.toLowerCase().includes(query),
      );
    }

    // Sort by last message time (most recent first)
    return filtered.sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
    );
  }, [chats, searchQuery]);

  const handleArchivedPress = () => {
    router.push({
      pathname: '/chats/archived',
      params: { unreadCount: totalUnreadCount.toString() },
    });
  };

  const handleChatPress = async (chatId: string) => {
    if (isEditMode) {
      const newSelected = new Set(selectedChatIds);
      if (newSelected.has(chatId)) {
        newSelected.delete(chatId);
      } else {
        newSelected.add(chatId);
      }
      setSelectedChatIds(newSelected);
    } else {
      // Find the chat object
      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        // Load messages before navigating
        const messages = await getChatMessages(chatId);
        router.push({
          pathname: '/chats/[id]',
          params: {
            id: chatId,
            chat: JSON.stringify(chat),
            messages: JSON.stringify(messages),
          },
        });
      } else {
        // Fallback to just id if chat not found
        router.push({
          pathname: '/chats/[id]',
          params: { id: chatId },
        });
      }
    }
  };

  const handleEllipsisPress = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setSelectedChatIds(new Set());
    } else {
      ellipsisButtonRef.current?.measureInWindow((x, y, width, height) => {
        setButtonPosition({ x, y, width, height });
        setDropdownVisible(true);
      });
    }
  };

  const handleReadAllPress = async () => {
    await readAllChats();
    // Reload chats to update unread counts
    const fetchedChats = await getChats();
    setChats(fetchedChats);
  };

  const handleSelectChatsPress = () => {
    setIsEditMode(true);
    setDropdownVisible(false);
  };

  const handleArchivePress = async () => {
    for (const chatId of selectedChatIds) {
      await archiveChat(chatId);
    }
    setIsEditMode(false);
    setSelectedChatIds(new Set());
    // Reload chats
    const fetchedChats = await getChats();
    setChats(fetchedChats);
  };

  const handleDeletePress = async () => {
    for (const chatId of selectedChatIds) {
      await deleteChat(chatId);
    }
    setIsEditMode(false);
    setSelectedChatIds(new Set());
    // Reload chats
    const fetchedChats = await getChats();
    setChats(fetchedChats);
  };

  const handleChatArchive = async (chatId: string) => {
    await archiveChat(chatId);
    const fetchedChats = await getChats();
    setChats(fetchedChats);
  };

  const handleChatDelete = async (chatId: string) => {
    await deleteChat(chatId);
    const fetchedChats = await getChats();
    setChats(fetchedChats);
  };

  const handleChatMarkAsRead = async (chatId: string) => {
    await markChatAsRead(chatId);
    const fetchedChats = await getChats();
    setChats(fetchedChats);
  };

  const dropdownOptions: DropdownMenuOption[] = isEditMode
    ? [
        {
          label: t('chats.archive'),
          icon: {
            sf: 'archivebox',
            IconComponent: Archive,
          },
          onPress: handleArchivePress,
        },
        {
          label: t('chats.delete'),
          icon: {
            sf: 'trash',
            IconComponent: Trash2,
          },
          onPress: handleDeletePress,
        },
      ]
    : [
        {
          label: t('chats.selectChats'),
          icon: {
            sf: 'checkmark.circle',
            IconComponent: CheckCircle2,
          },
          onPress: handleSelectChatsPress,
        },
        {
          label: t('chats.readAll'),
          icon: {
            sf: 'checkmark.message',
            IconComponent: MailCheck,
          },
          onPress: handleReadAllPress,
        },
        
      ];

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.background];

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('chats.title')}</Text>
              <View
                ref={ellipsisButtonRef}
                collapsable={false}
                style={styles.headerButtonContainer}
              >
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: '#FFFFFF' }]}
                  activeOpacity={0.7}
                  onPress={handleEllipsisPress}
                >
                  {isEditMode ? (
                    <PlatformIcon
                      sf="checkmark"
                      IconComponent={Check}
                      size={iconSizes.navigationChevrons}
                      color="#000000"
                    />
                  ) : (
                    <PlatformIcon
                      sf="ellipsis"
                      IconComponent={Ellipsis}
                      size={iconSizes.navigationChevrons}
                      color="#000000"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('chats.searchPlaceholder')}
            />
          </View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
              </View>
            ) : filteredChats.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                  {searchQuery.trim()
                    ? t('chats.empty.noChatsFound')
                    : t('chats.empty.noChatsYet')}
                </Text>
              </View>
            ) : (
              <View style={styles.chatListContainer}>
                {!searchQuery.trim() && (
                  <ArchivedItem onPress={handleArchivedPress} />
                )}
                {filteredChats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    onPress={handleChatPress}
                    isEditMode={isEditMode}
                    isSelected={selectedChatIds.has(chat.id)}
                    onArchive={handleChatArchive}
                    onDelete={handleChatDelete}
                    onMarkAsRead={handleChatMarkAsRead}
                  />
                ))}
              </View>
            )}
          </View>
          </ScrollView>

        {isEditMode && (
          <View
            style={[
              styles.bottomActions,
              {
                paddingBottom: insets.bottom + 60, // Tab bar height (49px) + safe area
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FFFFFF' }]}
              activeOpacity={0.7}
              onPress={handleArchivePress}
            >
              <Text style={[styles.actionButtonText, { color: '#000000' }]}>
                {t('chats.archive')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FFFFFF' }]}
              activeOpacity={0.7}
              onPress={handleDeletePress}
            >
              <Text style={[styles.actionButtonText, { color: '#000000' }]}>
                {t('chats.delete')}
              </Text>
            </TouchableOpacity>
        </View>
        )}

        {!isEditMode && (
          <DropdownMenu
            visible={dropdownVisible}
            onClose={() => setDropdownVisible(false)}
            options={dropdownOptions}
            anchorPosition={buttonPosition}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  container: {
    paddingTop: 16,
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleRow: {
    position: 'relative',
    marginBottom: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingRight: 52, // Space for the button (44px width + 8px margin)
  },
  headerButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chatListContainer: {
  },
  loadingContainer: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.p2,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.p2,
    fontWeight: '500',
  },
});


