import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Ellipsis, Archive, Trash2, User, Plus, Camera, Mic, Send, X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton, DoubleIconButton } from '@/components/icon-button';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { MessageInputBar } from '@/components/chats/message-input-bar';
import { MessageList } from '@/components/chats/message-list';
import { MessageReactionsSheet } from '@/components/chats/message-reactions-sheet';
import { ReplyPreviewRow } from '@/components/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';
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
  const { id, chat: chatParam, messages: messagesParam, documentSent, sentDocument, imagesSent, sentImages, sentImagesCaption, videoSent, sentVideo } = useLocalSearchParams<{
    id: string;
    chat?: string;
    messages?: string;
    documentSent?: string;
    sentDocument?: string;
    imagesSent?: string;
    sentImages?: string;
    sentImagesCaption?: string;
    videoSent?: string;
    sentVideo?: string;
  }>();

  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

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
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Handle document sent - add to message list and close attachment picker
  useEffect(() => {
    if (documentSent === 'true' && sentDocument) {
      try {
        const documentData = JSON.parse(sentDocument);
        
        // Create new message with document attachment
        const newMessage: ChatMessage = {
          id: `m-${Date.now()}`,
          text: documentData.caption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          document: {
            uri: documentData.uri,
            name: documentData.name,
            mimeType: documentData.mimeType,
            size: documentData.size ? parseInt(documentData.size) : undefined,
          },
        };

        // Add message to the list
        setMessages((prev) => [...prev, newMessage]);
        
        // Close attachment picker
        setShowAttachmentPicker(false);
        
        // Clear the params
        router.setParams({ documentSent: undefined, sentDocument: undefined } as any);
      } catch (error) {
        console.error('Error parsing sent document:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({ documentSent: undefined, sentDocument: undefined } as any);
      }
    }
  }, [documentSent, sentDocument, router]);

  // Handle images sent - add to message list and close attachment picker
  useEffect(() => {
    if (imagesSent === 'true' && sentImages) {
      try {
        const imageAttachments = JSON.parse(sentImages);
        
        // Create new message with image attachments
        const newMessage: ChatMessage = {
          id: `m-${Date.now()}`,
          text: sentImagesCaption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          images: imageAttachments,
        };

        // Add message to the list
        setMessages((prev) => [...prev, newMessage]);
        
        // Close attachment picker
        setShowAttachmentPicker(false);
        
        // Clear the params
        router.setParams({ imagesSent: undefined, sentImages: undefined, sentImagesCaption: undefined } as any);
      } catch (error) {
        console.error('Error parsing sent images:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({ imagesSent: undefined, sentImages: undefined, sentImagesCaption: undefined } as any);
      }
    }
  }, [imagesSent, sentImages, sentImagesCaption, router]);

  // Handle video sent - add to message list and close attachment picker
  useEffect(() => {
    if (videoSent === 'true' && sentVideo) {
      try {
        const videoData = JSON.parse(sentVideo);
        
        // Create new message with video attachment
        const newMessage: ChatMessage = {
          id: `m-${Date.now()}`,
          text: videoData.caption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          video: {
            uri: videoData.uri,
            duration: videoData.duration,
            orientation: videoData.orientation,
          },
        };

        // Add message to the list
        setMessages((prev) => [...prev, newMessage]);
        
        // Close attachment picker
        setShowAttachmentPicker(false);
        
        // Clear the params
        router.setParams({ videoSent: undefined, sentVideo: undefined } as any);
      } catch (error) {
        console.error('Error parsing sent video:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({ videoSent: undefined, sentVideo: undefined } as any);
      }
    }
  }, [videoSent, sentVideo, router]);

  const headerBackgroundColor = themeColors.headerBackground;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const hasText = searchQuery.trim().length > 0;
  
  // Create translucent background color for frosted glass effect (60% opacity)
  const translucentHeaderBg = hexToRgba(headerBackgroundColor, 0.6);

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

  const handleCloseAttachmentPicker = () => {
    setShowAttachmentPicker(false);
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

  const handleDocumentPress = (document: import('@/services/chats-service').DocumentAttachment) => {
    router.push({
      pathname: '/document-preview',
      params: {
        uri: document.uri,
        name: document.name,
        mimeType: document.mimeType,
        size: document.size?.toString() || '',
        chatId: chat?.id || '',
        clientId: chat?.clientId || '',
        clientName: chat?.clientName || '',
        fromMessage: 'true', // Flag to show download icon
      },
    });
  };

  const handleImagePress = (
    images: import('@/services/chats-service').ImageAttachment[],
    senderName: string,
    isSent: boolean,
    messageTimestamp?: Date
  ) => {
    router.push({
      pathname: '/message-image-preview',
      params: {
        images: JSON.stringify(images),
        senderName: senderName,
        isSent: isSent.toString(),
        messageTimestamp: messageTimestamp?.toISOString() || '',
      },
    });
  };

  const handleVideoPress = (
    video: import('@/services/chats-service').VideoAttachment,
    senderName: string,
    isSent: boolean,
    messageTimestamp?: Date
  ) => {
    router.push({
      pathname: '/video-preview',
      params: {
        uri: video.uri,
        duration: video.duration.toString(),
        orientation: video.orientation,
        fromMessage: 'true',
        senderName: senderName,
        isSent: isSent.toString(),
        messageTimestamp: messageTimestamp?.toISOString() || '',
      },
    });
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
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            },
          ]}
        >
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
              {t('general.loading')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.pageBackground }]}>
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            },
          ]}
        >
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
              {t('chats.chatNotFound')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      
      {/* Background image covering entire screen */}
      <Image
        source={isDark ? require('@/assets/chat/bg-dark.png') : require('@/assets/chat/bg-light.png')}
        style={styles.fullScreenBackgroundImage}
        contentFit="cover"
      />
      
      {/* ROW 1: HEADER - Absolutely positioned with blur (extends into status bar area) */}
      <View style={[styles.headerSafeArea, { paddingTop: 0 }]} pointerEvents="box-none">
        <BlurView
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.headerBlur, { paddingTop: insets.top, backgroundColor: translucentHeaderBg }]}
        >
          <View style={styles.header}>
          <IconButton
            icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
            backgroundColor={mutedSurfaceColor}
          />

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

          <DoubleIconButton
            ref={actionButtonRef}
            leftIcon={{ sf: 'person', IconComponent: User }}
            rightIcon={{ sf: 'ellipsis', IconComponent: Ellipsis }}
            onLeftPress={handleUserProfilePress}
            onRightPress={handleEllipsisPress}
            size="md"
            color={iconColor}
            backgroundColor={mutedSurfaceColor}
          />
        </View>
        </BlurView>
      </View>

      <DropdownMenu
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        options={dropdownOptions}
        anchorPosition={buttonPosition}
      />

      {/* ROW 2: SCROLL WINDOW - Content scrolls through header and toolbar */}
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <MessageList
          messages={messages}
          backgroundColor="transparent"
          themeColors={themeColors}
          clientName={chat.clientName}
          onReply={handleMessageReply}
          onEdit={handleMessageEdit}
          onDelete={handleMessageDelete}
          onReactionPress={handleReactionPress}
          onDocumentPress={handleDocumentPress}
          onImagePress={handleImagePress}
          onVideoPress={handleVideoPress}
          headerHeight={insets.top + 60} // Safe area + header content (~60px)
          toolbarHeight={
            (replyingToMessage ? 54 : 0) + // Reply preview height
            (showAttachmentPicker ? 112 : 0) + // Attachment picker height
            40 + // closedBaseHeight
            insets.bottom // Safe area bottom
          }
        />
      </View>

      {/* ROW 3: TOOLBAR — Absolutely positioned with blur */}
      <View style={styles.toolbarContainer} pointerEvents="box-none">
        <BlurView
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.toolbarBlur, { backgroundColor: translucentHeaderBg }]}
        >
          <KeyboardAwareToolbar
            backgroundColor="transparent"
        contentStyle={{ paddingHorizontal: 16 }}
        replyPreview={
          replyingToMessage ? (
            <ReplyPreviewRow
              message={replyingToMessage}
              clientName={chat.clientName}
              onClose={handleCancelReply}
              backgroundColor={translucentHeaderBg}
            />
          ) : undefined
        }
        attachmentPicker={
          showAttachmentPicker ? (
            <AttachmentPickerRow
              backgroundColor={translucentHeaderBg}
              chatId={chat?.id}
              clientId={chat?.clientId}
              clientName={chat?.clientName}
            />
          ) : undefined
        }
      >
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={handlePlusPress}>
          <PlatformIcon
            sf={showAttachmentPicker ? "xmark.circle" : "plus"}
            IconComponent={showAttachmentPicker ? X : Plus}
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
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/camera',
                  params: {
                    chatId: chat.id,
                    clientId: chat.clientId,
                    clientName: chat.clientName,
                  },
                })
              }
            >
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
        </BlurView>
      </View>

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
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    width: '100%',
  },
  toolbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  toolbarBlur: {
    width: '100%',
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
    paddingHorizontal: 16,
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
  fullScreenBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
