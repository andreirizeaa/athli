import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Archive, Trash2, MailCheck, CheckCircle, MailOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { PressableOpacity } from 'pressto';
import { getChatMessages, type Chat, type ChatMessage } from '@/services/chats-service';

type ChatListItemProps = {
  chat: Chat;
  onPress: (chatId: string) => void | Promise<void>;
  isEditMode?: boolean;
  isSelected?: boolean;
  onArchive?: (chatId: string) => void;
  onDelete?: (chatId: string) => void;
  onMarkAsRead?: (chatId: string) => void;
  onUnarchive?: (chatId: string) => void;
  onOpen?: (close: () => void) => void;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // If less than 24 hours, show exact time in 24-hour format
  if (diffInHours < 24) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // If more than 24 hours but less than a week, show "yesterday" or day name
  if (diffInDays < 7) {
    if (diffInDays === 1) {
      return 'Yesterday';
    }
    return DAY_NAMES[date.getDay()];
  }

  // If more than a week, show date in dd/mm/yyyy format
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const ChatListItem = ({
  chat,
  onPress,
  isEditMode = false,
  isSelected = false,
  onArchive,
  onDelete,
  onMarkAsRead,
  onUnarchive,
  onOpen,
}: ChatListItemProps) => {
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    const loadLastMessage = async () => {
      const messages = await getChatMessages(chat.id);
      if (messages.length > 0) {
        // Get the last message (most recent)
        const sortedMessages = [...messages].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        );
        setLastMessage(sortedMessages[0]);
      }
    };
    loadLastMessage();
  }, [chat.id]);

  const handlePress = () => {
    onPress(chat.id);
  };

  const handleDelete = useCallback(() => {
    if (onDelete) {
      Alert.alert(
        t('chats.delete'),
        t('library.deleteConfirmMessage'),
        [
          { text: t('general.cancel'), style: 'cancel' },
          {
            text: t('general.delete'),
            style: 'destructive',
            onPress: () => onDelete(chat.id)
          },
        ]
      );
    }
  }, [onDelete, chat.clientName, chat.id, t]);


  // Use the same color as dividers for checkbox border in light mode
  const checkboxBorderColor =
    isSelected
      ? themeColors.primary
      : colorScheme === 'dark'
        ? themeColors.border
        : themeColors.mutedText;

  const dropdownOptions: DropdownMenuOption[] = [
    ...(onMarkAsRead && chat.unreadCount > 0
      ? [
        {
          label: t('chats.markAsRead'),
          icon: {
            sf: 'checkmark.message',
            IconComponent: MailCheck,
          },
          onPress: () => {
            onMarkAsRead(chat.id);
          },
        },
      ]
      : []),
    ...(onArchive
      ? [
        {
          label: t('chats.archive'),
          icon: {
            sf: 'archivebox',
            IconComponent: Archive,
          },
          onPress: () => {
            onArchive(chat.id);
          },
        },
      ]
      : []),
    ...(onUnarchive
      ? [
        {
          label: t('chats.archived.unarchive'),
          icon: {
            sf: 'archivebox.fill',
            IconComponent: Archive,
          },
          onPress: () => {
            onUnarchive(chat.id);
          },
        },
      ]
      : []),
    ...(onDelete
      ? [
        {
          label: t('chats.delete'),
          icon: {
            sf: 'trash',
            IconComponent: Trash2,
          },
          destructive: true,
          onPress: () => {
            onDelete(chat.id);
          },
        },
      ]
      : []),
  ];

  return (
    <View style={styles.container}>
      <SwipeableRow
        onDelete={handleDelete}
        onOpen={onOpen}
        deleteConfirmTitle={t('chats.delete')}
        enabled={!isEditMode && !!onDelete}
      >
        <ContextMenuWrapper options={dropdownOptions}>
          <PressableOpacity
            onPress={handlePress}
            style={[
              styles.rowWrapper,
              { backgroundColor: themeColors.pageBackground }
            ]}
          >
            <View
              style={[
                styles.chatContent,
                isSelected && {
                  backgroundColor: themeColors.surfaceSecondary,
                },
              ]}
            >
              {isEditMode && (
                <View style={styles.checkboxContainer}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checkboxBorderColor,
                        backgroundColor: isSelected ? themeColors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.checkmark,
                          {
                            borderColor: themeColors.primaryForeground,
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
              )}
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
              <View style={styles.messageContainer}>
                <View style={styles.messageHeader}>
                  <Text
                    style={[styles.clientName, { color: themeColors.text }]}
                    numberOfLines={1}
                  >
                    {chat.clientName}
                  </Text>
                  <View style={styles.timestampContainer}>
                    <Text
                      style={[
                        styles.timestamp,
                        {
                          color: chat.unreadCount > 0 ? themeColors.primary : themeColors.mutedText,
                        },
                      ]}
                    >
                      {formatMessageTime(chat.lastMessageTime)}
                    </Text>
                  </View>
                </View>
                <View style={styles.messageFooter}>
                  <View style={styles.lastMessageContainer}>
                    {lastMessage?.isSent && (
                      <View style={styles.readReceiptContainer}>
                        <PlatformIcon
                          sf="checkmark.circle"
                          IconComponent={CheckCircle}
                          size={iconSizes.extraSmallIcons}
                          color={
                            lastMessage.isRead
                              ? themeColors.primary
                              : themeColors.mutedText
                          }
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.lastMessage,
                        { color: themeColors.mutedText },
                      ]}
                      numberOfLines={2}
                    >
                      {lastMessage?.text || chat.lastMessage}
                    </Text>
                  </View>
                  <View style={styles.rightColumn}>
                    {chat.unreadCount > 0 && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: themeColors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unreadCount,
                            { color: themeColors.primaryForeground },
                          ]}
                        >
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </PressableOpacity>
        </ContextMenuWrapper>
      </SwipeableRow>
      <View
        style={[
          styles.separatorContainer,
          isEditMode && styles.separatorContainerEdit,
        ]}
      >
        <View
          style={[
            styles.separator,
            {
              backgroundColor: themeColors.mutedText,
              opacity: 0.3,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  rowWrapper: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  checkboxContainer: {
    width: 20,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 5,
    height: 8,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    marginTop: -2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  clientName: {
    ...typography.h7,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  timestampContainer: {
    alignItems: 'flex-end',
    minWidth: 60,
    flexShrink: 0,
  },
  timestamp: {
    ...typography.p3,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lastMessageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  readReceiptContainer: {
    marginRight: 4,
    marginTop: 2,
  },
  lastMessage: {
    ...typography.p3,
    flex: 1,
  },
  rightColumn: {
    width: 60,
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    ...typography.p6,
    fontWeight: '600',
  },
  separatorContainer: {
    paddingLeft: 82, // 16 (content paddingHorizontal) + 54 (avatar) + 12 (marginRight)
    paddingRight: 16,
  },
  separatorContainerEdit: {
    paddingLeft: 114, // 16 (content paddingHorizontal) + 20 (checkbox) + 12 (marginRight) + 54 (avatar) + 12 (marginRight)
    paddingRight: 16,
  },
  separator: {
    height: 0.75,
  },
});
