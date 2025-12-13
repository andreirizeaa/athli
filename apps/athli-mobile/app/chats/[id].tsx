import React, { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Ellipsis, Archive, Trash2, User, Plus, Camera, Mic, Send } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { MessageInputBar } from '@/components/message-input-bar';
import { MessageList } from '@/components/chats/message-list';
import { MessageReactionsSheet } from '@/components/chats/message-reactions-sheet';
import { ReplyPreviewRow } from '@/components/chats/reply-preview-row';
import {
  getChats,
  getArchivedChats,
  archiveChat,
  deleteChat,
  getChatMessages,
  type Chat,
  type ChatMessage,
} from '@/services/chats-service';
import { KeyboardAwareToolbar } from '@/components/keyboard-aware-toolbar';

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id, chat: chatParam, messages: messagesParam } = useLocalSearchParams<{
    id: string;
    chat?: string;
    messages?: string;
  }>();

  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const [chat, setChat] = useState<Chat | null>(() => {
    if (chatParam) {
      try {
        return JSON.parse(chatParam) as Chat;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (messagesParam) {
      try {
        const parsed = JSON.parse(messagesParam) as ChatMessage[];
        return parsed.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(!chatParam || !messagesParam);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const actionButtonRef = useRef<View>(null);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [selectedMessageForReactions, setSelectedMessageForReactions] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const headerBackgroundColor = themeColors.headerBackground;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const hasText = searchQuery.trim().length > 0;

  useEffect(() => {
    // Only load if not provided via params
    if (chatParam && messagesParam) return;

    let mounted = true;

    const loadChat = async () => {
      setIsLoading(true);
      try {
        const chats = await getChats();
        let foundChat = chats.find((c) => c.id === id);

        if (!foundChat) {
          const archivedChats = await getArchivedChats();
          foundChat = archivedChats.find((c) => c.id === id);
        }

        if (!foundChat) return;

        const chatMessages = await getChatMessages(foundChat.id);
        if (!mounted) return;

        setChat(foundChat);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (id) loadChat();

    return () => {
      mounted = false;
    };
  }, [id, chatParam, messagesParam]);

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

  const handleMessageReply = (message: ChatMessage) => {
    setReplyingToMessage(message);
    // Focus the input to open keyboard
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
    Keyboard.dismiss();
  };

  // Helper function to find the original message in a reply chain
  const findOriginalMessage = (message: ChatMessage): ChatMessage => {
    if (!message.replyTo) {
      return message;
    }
    // Traverse the reply chain to find the original message
    return findOriginalMessage(message.replyTo);
  };

  const handleSendMessage = () => {
    const text = searchQuery.trim();
    if (!text) return;

    // If replying, find the original message (not the immediate reply)
    const originalMessage = replyingToMessage
      ? findOriginalMessage(replyingToMessage)
      : null;

    // Create new message
    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      text: text,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
      ...(originalMessage && { replyTo: originalMessage }),
    };

    // Add message to the list
    setMessages((prev) => [...prev, newMessage]);

    // Clear input and exit reply mode
    setSearchQuery('');
    setReplyingToMessage(null);
    Keyboard.dismiss();
  };

  const handleMessageEdit = (message: ChatMessage) => {
    // TODO: Implement edit functionality
    // This could set the message to edit mode and populate the input with the message text
    console.log('Edit message:', message);
    setSearchQuery(message.text);
  };

  const handleMessageDelete = async (message: ChatMessage) => {
    // TODO: Implement delete message functionality
    // This should remove the message from the messages array
    console.log('Delete message:', message);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  const handleReactionPress = (message: ChatMessage) => {
    setSelectedMessageForReactions(message);
    setReactionsSheetVisible(true);
  };

  const handleReactionRemoved = (messageId: string, isSender: boolean) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            ...(isSender ? { senderReaction: undefined } : { recipientReaction: undefined }),
          };
        }
        return msg;
      })
    );
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

  if (isLoading) {
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

  if (!chat) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.pageBackground }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
              {t('chats.chatNotFound')}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: headerBackgroundColor }]}>
      {/* ROW 1: HEADER */}
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

      {/* ROW 2: SCROLL WINDOW (ONLY between header + toolbar) */}
      <View style={{ flex: 1, backgroundColor: themeColors.pageBackground }}>
        <MessageList
          messages={messages}
          backgroundColor={themeColors.pageBackground}
          themeColors={themeColors}
          clientName={chat.clientName}
          onReply={handleMessageReply}
          onEdit={handleMessageEdit}
          onDelete={handleMessageDelete}
          onReactionPress={handleReactionPress}
        />
      </View>

      {/* ROW 3: TOOLBAR — EXACT original wrapper context (no extra safe-area / KAV wrappers) */}
      <KeyboardAwareToolbar
        backgroundColor={headerBackgroundColor}
        replyPreview={
          replyingToMessage ? (
            <ReplyPreviewRow
              message={replyingToMessage}
              clientName={chat.clientName}
              onClose={handleCancelReply}
              backgroundColor={headerBackgroundColor}
            />
          ) : undefined
        }
      >
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <PlatformIcon
            sf="plus"
            IconComponent={Plus}
            size={iconSizes.tabBarIcons - 2}
            color={iconColor}
          />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <MessageInputBar ref={inputRef} value={searchQuery} onChangeText={setSearchQuery} placeholder="" />
        </View>

        {hasText ? (
          <TouchableOpacity style={styles.sendButton} activeOpacity={0.7} onPress={handleSendMessage}>
            <PlatformIcon
              sf="paperplane.circle.fill"
              IconComponent={Send}
              size={iconSizes.tabBarIconsIOS + 2}
              color={themeColors.primary}
            />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <PlatformIcon
                sf="camera"
                IconComponent={Camera}
                size={iconSizes.tabBarIcons - 2}
                color={iconColor}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <PlatformIcon
                sf="mic"
                IconComponent={Mic}
                size={iconSizes.tabBarIcons - 2}
                color={iconColor}
              />
            </TouchableOpacity>
          </>
        )}
      </KeyboardAwareToolbar>

      <MessageReactionsSheet
        visible={reactionsSheetVisible}
        onClose={() => {
          setReactionsSheetVisible(false);
          setSelectedMessageForReactions(null);
        }}
        message={selectedMessageForReactions}
        onReactionRemoved={handleReactionRemoved}
      />
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
