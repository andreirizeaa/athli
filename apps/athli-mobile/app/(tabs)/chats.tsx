import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Ellipsis, MailCheck, CheckCircle2, Archive, Trash2 } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';


import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';
import { ChatListItem } from '@/components/features/chats/chat-list-item';
import { ArchivedItem } from '@/components/features/chats/archived-item';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  getChats,
  getArchivedChats,
  readAllChats,
  archiveChat,
  deleteChat,
  markChatAsRead,
  getChatMessages,
  type Chat,
} from '@/services/chats-service';

export default function ChatsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [openRowCloseFn, setOpenRowCloseFn] = useState<(() => void) | null>(null);
  const isRowOpen = openRowCloseFn !== null;

  const registerOpenRow = useCallback((closeFn: () => void) => {
    if (openRowCloseFn && openRowCloseFn !== closeFn) {
      openRowCloseFn();
    }
    setOpenRowCloseFn(() => closeFn);
  }, [openRowCloseFn]);

  const closeOpenRow = useCallback(() => {
    if (openRowCloseFn) {
      openRowCloseFn();
      setOpenRowCloseFn(null);
    }
  }, [openRowCloseFn]);

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
          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query)),
      );
    }

    // Sort by last message time (most recent first)
    return filtered.sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
    );
  }, [chats, searchQuery]);

  const handleArchivedPress = async () => {
    // If a row is open, just close it and prevent navigation/action
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    // Pre-fetch archived chats to prevent empty flash on navigation
    const archivedChats = await getArchivedChats();
    router.push({
      pathname: '/chats/archived',
      params: {
        unreadCount: totalUnreadCount.toString(),
        archivedChats: JSON.stringify(archivedChats),
      },
    });
  };

  const handleChatPress = async (chatId: string) => {
    // If a row is open, just close it and prevent navigation/action
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

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
        router.push({ pathname: '/chats/[id]', params: { id: chatId } });
      }
    }
  };

  const handleEllipsisPress = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setSelectedChatIds(new Set());
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

  const renderChatItem = useCallback(({ item }: { item: Chat }) => (
    <ChatListItem
      chat={item}
      onPress={handleChatPress}
      isEditMode={isEditMode}
      isSelected={selectedChatIds.has(item.id)}
      onArchive={handleChatArchive}
      onDelete={handleChatDelete}
      onMarkAsRead={handleChatMarkAsRead}
      onOpen={registerOpenRow}
    />
  ), [isEditMode, selectedChatIds, handleChatPress, handleChatArchive, handleChatDelete, handleChatMarkAsRead, registerOpenRow]);

  const renderListHeader = useCallback(() => {
    if (!searchQuery.trim()) {
      return <ArchivedItem onPress={handleArchivedPress} />;
    }
    return null;
  }, [searchQuery, handleArchivedPress, isRowOpen, closeOpenRow]);

  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
        {searchQuery.trim()
          ? t('chats.empty.noChatsFound')
          : t('chats.empty.noChatsYet')}
      </Text>
    </View>
  ), [searchQuery, themeColors.mutedText, t]);

  return (
    <ScreenWrapper
      contentContainerStyle={styles.scrollViewContent}
      overlay={
        <>
          {isEditMode && (
            <View
              style={[
                styles.bottomActions,
                {
                  paddingBottom: insets.bottom + 60,
                },
              ]}
            >
              <PressableOpacity
                style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                onPress={handleArchivePress}
              >
                <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                  {t('chats.archive')}
                </Text>
              </PressableOpacity>
              <PressableOpacity
                style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                onPress={handleDeletePress}
              >
                <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                  {t('chats.delete')}
                </Text>
              </PressableOpacity>
            </View>
          )}
        </>
      }
    >
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>{t('chats.title')}</Text>
            <View style={styles.headerButtonContainer}>

              {isEditMode ? (
                <PressableOpacity
                  style={[styles.headerButton, { backgroundColor: themeColors.iconButton }]}
                  onPress={handleEllipsisPress}
                >
                  <PlatformIcon
                    sf="checkmark"
                    IconComponent={Check}
                    size={iconSizes.navigationChevrons}
                    color={themeColors.text}
                  />
                </PressableOpacity>
              ) : (
                <DropdownMenuWrapper options={dropdownOptions}>
                  <PressableOpacity
                    style={[styles.headerButton, { backgroundColor: themeColors.iconButton }]}
                  >
                    <PlatformIcon
                      sf="ellipsis"
                      IconComponent={Ellipsis}
                      size={iconSizes.navigationChevrons}
                      color={themeColors.text}
                    />
                  </PressableOpacity>
                </DropdownMenuWrapper>
              )}
            </View>
          </View>
          <SearchBar
            value={searchQuery}
            onChangeText={(text) => {
              if (isRowOpen) {
                closeOpenRow();
                return;
              }
              setSearchQuery(text);
            }}
            placeholder={t('chats.searchPlaceholder')}
          />
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : (
          <View style={styles.chatListContainer}>
            <FlashList
              data={filteredChats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={renderEmptyComponent}
              scrollEnabled={!isRowOpen}
            />
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  container: {
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    position: 'relative',
    marginBottom: 12,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingRight: 52, // Space for one button (44 + padding)
  },
  headerButtonContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -22 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 16,
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


