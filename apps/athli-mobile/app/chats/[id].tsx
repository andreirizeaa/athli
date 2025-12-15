import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Trash2 } from 'lucide-react-native';

import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { MessageList } from '@/components/message/message-list';
import { MessageReactionsSheet } from '@/components/message/message-reactions-sheet';
import { ReplyPreviewRow } from '@/components/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';
import { VoiceNoteRecordingContainer } from '@/components/chats/voice-note-recording-container';
import { ChatHeader } from '@/components/chats/chat-header';
import { ChatToolbar } from '@/components/chats/chat-toolbar';
import { ChatLoadingState } from '@/components/chats/chat-loading-state';
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
  const [isMicrophoneMode, setIsMicrophoneMode] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
      onEnd: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    []
  );

  const scrollWindowAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          translateY: -keyboardHeight.value,
        },
      ],
    };
  });

  useEffect(() => {
    const handleKeyboardHide = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowAttachmentPicker(false);
    };

    const willHideSub = Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    const didHideSub = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      willHideSub.remove();
      didHideSub.remove();
    };
  }, []);

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
        
        // Clear draft text in input bar
        setSearchQuery('');
        
        // Close attachment picker
        setShowAttachmentPicker(false);
        
        // Clear the params
        router.setParams({
          documentSent: '',
          sentDocument: '',
        });
      } catch (error) {
        console.error('Error parsing sent document:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({
          documentSent: '',
          sentDocument: '',
        });
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
        
        // Clear draft text in input bar
        setSearchQuery('');
        
        // Close attachment picker
        setShowAttachmentPicker(false);
        
        // Clear the params
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });
      } catch (error) {
        console.error('Error parsing sent images:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });
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
        
        // Clear draft text in input bar
        setSearchQuery('');
        
        // Close attachment picker
        setShowAttachmentPicker(false);
        
        // Clear the params
        router.setParams({
          videoSent: '',
          sentVideo: '',
        });
      } catch (error) {
        console.error('Error parsing sent video:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({
          videoSent: '',
          sentVideo: '',
        });
      }
    }
  }, [videoSent, sentVideo, router]);

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReplyingToMessage(message);
    // Focus the input to open keyboard
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReplyingToMessage(null);
    Keyboard.dismiss();
  };

  const handlePlusPress = () => {
    if (showAttachmentPicker) {
      // Close attachment picker (keep current keyboard state)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowAttachmentPicker(false);
      return;
    }

    // Open attachment picker row without changing keyboard state
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAttachmentPicker(true);
  };

  const handleCloseAttachmentPicker = () => {
    setShowAttachmentPicker(false);
  };

  const handleMicrophonePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMicrophoneMode(true);
  };

  const handleTrashPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMicrophoneMode(false);
  };

  const handleSendPress = () => {
    handleSendMessage();
  };

  const handlePauseToggle = () => {
    setIsRecordingPaused((prev) => !prev);
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
  };

  const handleMessageEdit = (message: ChatMessage) => {
    // TODO: Implement edit functionality
    // This could set the message to edit mode and populate the input with the message text
    console.log('Edit message:', message);
    setSearchQuery(message.text);
  };

  const handleMessageDelete = async (message: ChatMessage) => {
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
    return <ChatLoadingState />;
  }

  if (!chat) {
    return <ChatLoadingState message={t('chats.chatNotFound')} />;
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
      <ChatHeader
        chat={chat}
        onBackPress={handleBackPress}
        onUserProfilePress={handleUserProfilePress}
        onEllipsisPress={handleEllipsisPress}
        actionButtonRef={actionButtonRef}
      />

      <DropdownMenu
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        options={dropdownOptions}
        anchorPosition={buttonPosition}
      />

      {/* ROW 2: SCROLL WINDOW - Content scrolls through header and toolbar */}
      <Animated.View
        style={[{ flex: 1, backgroundColor: 'transparent' }, scrollWindowAnimatedStyle]}
      >
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
            (isMicrophoneMode ? 52 : 0) + // Microphone mode height
            40 + // closedBaseHeight
            insets.bottom // Safe area bottom
          }
        />
      </Animated.View>

      {/* ROW 3: TOOLBAR — Absolutely positioned with blur */}
      <ChatToolbar
        chat={chat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        inputRef={inputRef}
        hasText={hasText}
        isMicrophoneMode={isMicrophoneMode}
        isRecordingPaused={isRecordingPaused}
        showAttachmentPicker={showAttachmentPicker}
        replyingToMessage={replyingToMessage}
        onPlusPress={handlePlusPress}
        onMicrophonePress={handleMicrophonePress}
        onSendMessage={handleSendMessage}
        onTrashPress={handleTrashPress}
        onPauseToggle={handlePauseToggle}
        onSendPress={handleSendPress}
        onCancelReply={handleCancelReply}
      />

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
  fullScreenBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
