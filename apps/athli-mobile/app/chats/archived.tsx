import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { ChatListItem } from '@/components/chats/chat-list-item';
import { Separator } from '@/components/separator';
import {
  getArchivedChats,
  unarchiveChat,
  deleteChat,
  getChatMessages,
  type Chat,
} from '@/services/chats-service';

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { unreadCount } = useLocalSearchParams<{ unreadCount?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [archivedChats, setArchivedChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());

  const unreadCountNum = unreadCount ? parseInt(unreadCount, 10) : 0;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;

  useEffect(() => {
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
  }, []);

  const handleBackPress = () => {
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
  };

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
          style={[styles.backButton, { backgroundColor: themeColors.iconButton }]}
          activeOpacity={0.7}
          onPress={handleBackPress}
        >
          <PlatformIcon
            sf="chevron.left"
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
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} pointerEvents="none">
          {t('chats.archived.title')}
        </Text>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: themeColors.iconButton }]}
          activeOpacity={0.7}
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
        </TouchableOpacity>
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

      <View style={[styles.content, { backgroundColor: themeColors.pageBackground }]}>
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
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollViewContent,
              isEditMode && styles.scrollViewContentEdit,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {archivedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onPress={handleChatPress}
                isEditMode={isEditMode}
                isSelected={selectedChatIds.has(chat.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {isEditMode && (
        <View
          style={[
            styles.bottomActions,
            {
              backgroundColor: themeColors.pageBackground,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
            activeOpacity={0.7}
            onPress={handleUnarchivePress}
          >
            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
              {t('chats.archived.unarchive')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
            activeOpacity={0.7}
            onPress={handleDeletePress}
          >
            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
              {t('chats.archived.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  scrollViewContentEdit: {
    paddingBottom: 100, // Extra space for bottom buttons
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
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
