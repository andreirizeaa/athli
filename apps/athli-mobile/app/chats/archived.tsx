import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ChatListItem } from '@/components/features/chats/chat-list-item';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  getArchivedChats,
  unarchiveChat,
  deleteChat,
  getChatMessages,
  markChatAsRead,
  type Chat,
} from '@/services/chats-service';

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { unreadCount, archivedChats: archivedChatsParam } = useLocalSearchParams<{
    unreadCount?: string;
    archivedChats?: string;
  }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  // Parse initial chats from params to prevent flash
  const initialChats = React.useMemo(() => {
    if (archivedChatsParam) {
      try {
        const parsed = JSON.parse(archivedChatsParam);
        // Convert date strings back to Date objects
        return parsed.map((chat: any) => ({
          ...chat,
          lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date(),
        })) as Chat[];
      } catch {
        return [];
      }
    }
    return [];
  }, [archivedChatsParam]);

  const [archivedChats, setArchivedChats] = useState<Chat[]>(initialChats);
  const [isLoading, setIsLoading] = useState(!archivedChatsParam); // Only show loading if no initial data
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

  const unreadCountNum = unreadCount ? parseInt(unreadCount, 10) : 0;
  const mutedSurfaceColor = themeColors.backgroundTertiary;
  const iconColor = themeColors.text;

  // Only fetch if no initial data was provided
  useEffect(() => {
    if (!archivedChatsParam) {
      const loadArchivedChats = async () => {
        setIsLoading(true);
        try {
          const fetchedChats = await getArchivedChats();
          setArchivedChats(fetchedChats);
        } catch (error) {
          console.error('Failed to load archived chats:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadArchivedChats();
    }
  }, [archivedChatsParam]);

  const handleBackPress = () => {
    // If a row is open, just close it and prevent navigation/action
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.back();
  };

  const handleEditPress = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setSelectedChatIds(new Set());
    } else {
      setIsEditMode(true);
    }
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
      const chat = archivedChats.find((c) => c.id === chatId);
      if (chat) {
        // Load messages before navigating
        const messages = await getChatMessages(chatId);
        router.push({
          pathname: `/chats/[id]`,
          params: {
            id: chatId,
            chat: JSON.stringify(chat),
            messages: JSON.stringify(messages),
          },
        });
      } else {
        // Fallback to just id if chat not found
        router.push(`/chats/${chatId}`);
      }
    }
  };

  const handleUnarchivePress = async () => {
    for (const chatId of selectedChatIds) {
      await unarchiveChat(chatId);
    }
    setIsEditMode(false);
    setSelectedChatIds(new Set());
  };

  const handleDeletePress = async () => {
    for (const chatId of selectedChatIds) {
      await deleteChat(chatId);
    }
    setIsEditMode(false);
    setSelectedChatIds(new Set());
    const fetchedChats = await getArchivedChats();
    setArchivedChats(fetchedChats);
  };

  const handleChatUnarchive = async (chatId: string) => {
    await unarchiveChat(chatId);
    const fetchedChats = await getArchivedChats();
    setArchivedChats(fetchedChats);
  };

  const handleChatDelete = async (chatId: string) => {
    await deleteChat(chatId);
    const fetchedChats = await getArchivedChats();
    setArchivedChats(fetchedChats);
  };

  const handleChatMarkAsRead = async (chatId: string) => {
    await markChatAsRead(chatId);
    const fetchedChats = await getArchivedChats();
    setArchivedChats(fetchedChats);
  };

  return (
    <ScreenWrapper
      contentContainerStyle={isEditMode ? styles.scrollViewContentEdit : styles.scrollViewContent}
      scrollEnabled={!isRowOpen}
      overlay={
        isEditMode ? (
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
              onPress={handleUnarchivePress}
            >
              <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                {t('chats.archived.unarchive')}
              </Text>
            </PressableOpacity>
            <PressableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.backgroundSecondary }]}
              onPress={handleDeletePress}
            >
              <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                {t('chats.archived.delete')}
              </Text>
            </PressableOpacity>
          </View>
        ) : undefined
      }
    >
      <View style={styles.header}>
        <PressableOpacity
          style={[styles.backButton, { backgroundColor: themeColors.backgroundSecondary }]}
          onPress={handleBackPress}
        >
          <PlatformIcon
            sf="arrow.left"
            IconComponent={ChevronLeft}
            size={iconSizes.navigationChevrons}
            color={iconColor}
          />
          {unreadCountNum > 0 && (
            <Text
              style={[
                styles.unreadCount,
                { color: themeColors.text },
              ]}
            >
              {unreadCountNum > 99 ? '99+' : unreadCountNum}
            </Text>
          )}
        </PressableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} pointerEvents="none">
          {t('chats.archived.title')}
        </Text>
        <PressableOpacity
          style={[styles.editButton, { backgroundColor: themeColors.backgroundSecondary }]}
          onPress={handleEditPress}
        >
          {isEditMode ? (
            <PlatformIcon
              sf="checkmark"
              IconComponent={Check}
              size={iconSizes.navigationChevrons}
              color={iconColor}
            />
          ) : (
            <Text style={[styles.editButtonText, { color: iconColor }]}>
              {t('chats.archived.edit')}
            </Text>
          )}
        </PressableOpacity>
      </View>

      <View style={styles.dividerContainer}>
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
          {t('chats.archived.description')}
        </Text>
      </View>

      <View style={styles.dividerContainer}>
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : archivedChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
            No archived chats
          </Text>
        </View>
      ) : (
        <View>
          {archivedChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              onPress={handleChatPress}
              isEditMode={isEditMode}
              isSelected={selectedChatIds.has(chat.id)}
              onMarkAsRead={handleChatMarkAsRead}
              onUnarchive={handleChatUnarchive}
              onDelete={handleChatDelete}
              onOpen={registerOpenRow}
            />
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingLeft: 8,
    borderRadius: 22,
    gap: 6,
  },
  unreadCount: {
    marginHorizontal: 8,
    ...typography.p2,
    fontWeight: '500',
  },
  headerTitle: {
    ...typography.h5,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  editButtonText: {
    ...typography.p2,
    fontWeight: '500',
  },
  dividerContainer: {
    width: '100%',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  descriptionText: {
    ...typography.p5,
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  scrollViewContentEdit: {
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
