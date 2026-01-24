import React, { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Megaphone, Archive } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';


import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useAuth, useChatsStore } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';
import { IconButton } from '@/components/ui/icon-button';
import { ChatListItem } from '@/components/features/chats/chat-list-item';
import { ArchivedItem } from '@/components/features/chats/archived-item';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  getArchivedChats,
  getChatMessages,
  type Chat,
} from '@/services/chats-service';
import { useRealtimeConversations } from '@/hooks/use-realtime-messaging';

export default function ChatsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [openRowCloseFn, setOpenRowCloseFn] = useState<(() => void) | null>(null);
  const isRowOpen = openRowCloseFn !== null;

  // Use unified auth hook - waits for BOTH session AND profile
  const { userId } = useAuth();

  // Use chats store
  const chats = useChatsStore((state) => state.chats);
  const isLoading = useChatsStore((state) => state.isLoading);
  const updateChat = useChatsStore((state) => state.updateChat);
  const storArchiveChat = useChatsStore((state) => state.archiveChat);
  const storeMarkAsRead = useChatsStore((state) => state.markAsRead);
  const storeMarkAllAsRead = useChatsStore((state) => state.markAllAsRead);
  const getCachedMessages = useChatsStore((state) => state.getCachedMessages);
  const prefetchMessages = useChatsStore((state) => state.prefetchMessages);
  const invalidateMessagesCache = useChatsStore((state) => state.invalidateMessagesCache);

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

  const mutedSurfaceColor = themeColors.backgroundTertiary;
  const iconColor = themeColors.text;

  // Realtime conversation updates - only subscribe when authenticated
  // IMPORTANT: The realtime hook sends RAW data - we must merge with existing chats
  const { conversations: realtimeConversations } = useRealtimeConversations({
    userId: userId || '',
    onConversationUpdated: (realtimeConversation) => {
      // CRITICAL: Invalidate the messages cache so clicking into chat loads fresh messages
      invalidateMessagesCache(realtimeConversation.id);

      // Get FRESH chats from store (not stale reference from render)
      const currentChats = useChatsStore.getState().chats;
      const existingChat = currentChats.find((c) => c.id === realtimeConversation.id);
      
      if (existingChat) {
        // MERGE: Preserve existing joined fields, update realtime fields
        const mergedChat = {
          ...existingChat, // Keep existing data (name, avatar, etc.)
          ...realtimeConversation, // Override with realtime updates (unread_count, last_message_at, etc.)
          // Explicitly preserve joined fields that don't come from realtime
          other_user_name: existingChat.other_user_name,
          other_user_avatar: existingChat.other_user_avatar,
        };
        console.log('[Chats Realtime] Merged update:', mergedChat.id, 'name:', mergedChat.other_user_name, 'preview:', mergedChat.last_message_preview);
        updateChat(mergedChat);
      } else {
        // New conversation - add as-is (next refresh will fill in missing data)
        console.log('[Chats Realtime] New conversation:', realtimeConversation.id);
        updateChat(realtimeConversation);
      }
    },
  });

  // Pre-fetch messages for top chats when list loads
  React.useEffect(() => {
    if (chats.length === 0 || isLoading) return;

    // Pre-fetch messages for the first 5 chats (most recent)
    const sortedChats = [...chats].sort((a, b) => {
      const aTime = a.last_message_at?.getTime() || 0;
      const bTime = b.last_message_at?.getTime() || 0;
      return bTime - aTime;
    });

    const topChats = sortedChats.slice(0, 10);

    // Pre-fetch in background (don't await) for faster navigation
    topChats.forEach((chat) => {
      prefetchMessages(chat.id);
    });
  }, [chats, isLoading, prefetchMessages]);

  const totalUnreadCount = useMemo(() => {
    return chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
  }, [chats]);

  const filteredChats = useMemo(() => {
    let filtered = chats;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          (chat.other_user_name && chat.other_user_name.toLowerCase().includes(query)) ||
          (chat.last_message_preview && chat.last_message_preview.toLowerCase().includes(query)),
      );
    }

    // Sort by last message time (most recent first)
    return filtered.sort(
      (a, b) => {
        const aTime = a.last_message_at?.getTime() || 0;
        const bTime = b.last_message_at?.getTime() || 0;
        return bTime - aTime;
      },
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

  // Start prefetching when finger touches down (before press completes)
  // This gives us ~100-300ms head start on loading messages
  const handleChatPressIn = useCallback((chatId: string) => {
    // Don't prefetch in edit mode or if row is open
    if (isEditMode || isRowOpen) return;
    // Start prefetching immediately - by the time press completes, messages may be cached
    prefetchMessages(chatId);
  }, [isEditMode, isRowOpen, prefetchMessages]);

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
        // Try to get cached messages first (may have been prefetched on press-in)
        const cachedMessages = getCachedMessages(chatId);
        if (cachedMessages) {
          // Navigate immediately with cached messages
          router.push({
            pathname: '/chats/[id]',
            params: {
              id: chatId,
              chat: JSON.stringify(chat),
              messages: JSON.stringify(cachedMessages),
            },
          });
        } else {
          // No cache - load messages before navigating
          const messages = await getChatMessages(chatId);
          router.push({
            pathname: '/chats/[id]',
            params: {
              id: chatId,
              chat: JSON.stringify(chat),
              messages: JSON.stringify(messages),
            },
          });
        }
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
    await storeMarkAllAsRead();
  };


  const handleSelectChatsPress = () => {
    setIsEditMode(true);
  };

  const handleArchivePress = async () => {
    for (const chatId of selectedChatIds) {
      await storArchiveChat(chatId);
    }
    setIsEditMode(false);
    setSelectedChatIds(new Set());
  };

  const handleChatArchive = async (chatId: string) => {
    await storArchiveChat(chatId);
  };

  const handleChatMarkAsRead = async (chatId: string) => {
    await storeMarkAsRead(chatId);
  };

  const handleViewProfile = (clientId: string) => {
    router.push({ pathname: '/client/[id]', params: { id: clientId } });
  };


  const renderChatItem = useCallback(({ item }: { item: Chat }) => (
    <ChatListItem
      chat={item}
      onPress={handleChatPress}
      onPressIn={handleChatPressIn}
      isEditMode={isEditMode}
      isSelected={selectedChatIds.has(item.id)}
      onViewProfile={handleViewProfile}
      onArchive={handleChatArchive}
      onMarkAsRead={handleChatMarkAsRead}
      onOpen={registerOpenRow}
    />
  ), [isEditMode, selectedChatIds, handleChatPress, handleChatPressIn, handleViewProfile, handleChatArchive, handleChatMarkAsRead, registerOpenRow]);

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
                style={[styles.actionButton, { backgroundColor: themeColors.backgroundSecondary }]}
                onPress={handleArchivePress}
              >
                <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                  {t('chats.archive')}
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
                <IconButton
                  icon={{ sf: 'checkmark', IconComponent: Check }}
                  onPress={handleEllipsisPress}
                  size="md"
                  color={themeColors.text}
                />
              ) : (
                <IconButton
                  icon={{ sf: 'megaphone', IconComponent: Megaphone }}
                  onPress={() => router.push('/modals/message/broadcast-modal')}
                  size="md"
                  color={themeColors.text}
                />
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


