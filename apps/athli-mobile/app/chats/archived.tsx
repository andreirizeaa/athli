import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useChatsStore } from '@/stores/useChatsStore';
import { IconButton } from '@/components/ui/icon-button';
import { ChatListItem } from '@/components/features/chats/chat-list-item';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  getArchivedChats,
  getChatMessages,
  markChatAsRead,
  type Chat,
} from '@/services/chats-service';

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { archivedChats: archivedChatsParam } = useLocalSearchParams<{
    archivedChats?: string;
  }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Get store state and actions
  const storeArchivedChats = useChatsStore((state) => state.archivedChats);
  const storeUnarchiveChat = useChatsStore((state) => state.unarchiveChat);

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

  // Sync local state with store when store changes (e.g., after unarchive)
  useEffect(() => {
    if (storeArchivedChats.length > 0 || archivedChats.length > 0) {
      // Only sync if store has data or we need to reflect removals
      setArchivedChats(storeArchivedChats);
    }
  }, [storeArchivedChats]);

  const handleBackPress = () => {
    // If a row is open, just close it and prevent navigation/action
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.back();
  };

  const handleChatPress = async (chatId: string) => {
    // If a row is open, just close it and prevent navigation/action
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

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
  };

  const handleChatUnarchive = async (chatId: string) => {
    // Use store action which handles optimistic updates
    await storeUnarchiveChat(chatId);
  };

  const handleChatMarkAsRead = async (chatId: string) => {
    await markChatAsRead(chatId);
    const fetchedChats = await getArchivedChats();
    setArchivedChats(fetchedChats);
  };

  const handleViewProfile = (clientId: string) => {
    router.push({ pathname: '/client/[id]', params: { id: clientId } });
  };

  return (
    <ScreenWrapper
      contentContainerStyle={styles.scrollViewContent}
      scrollEnabled={!isRowOpen}
    >
      <View style={styles.header}>
        <View style={styles.backButtonContainer}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
        </View>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} pointerEvents="none">
          {t('chats.archived.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
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
              onViewProfile={handleViewProfile}
              onMarkAsRead={handleChatMarkAsRead}
              onUnarchive={handleChatUnarchive}
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
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    ...typography.h5,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
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
});
