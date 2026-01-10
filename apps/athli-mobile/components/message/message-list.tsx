import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import {
  Animated as RNAnimated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import {
  GiftedChat,
  Bubble,
  Time,
  Message,
  IMessage,
  MessageProps,
} from 'react-native-gifted-chat';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// Utility functions for message grouping (replaces react-native-gifted-chat/lib/utils)
const isSameUser = (currentMessage: IMessage | null, diffMessage: IMessage | null): boolean => {
  return !!(
    diffMessage &&
    diffMessage.user &&
    currentMessage &&
    currentMessage.user &&
    diffMessage.user._id === currentMessage.user._id
  );
};

const isSameDay = (currentMessage: IMessage | null, diffMessage: IMessage | null): boolean => {
  if (!diffMessage || !diffMessage.createdAt || !currentMessage || !currentMessage.createdAt) {
    return false;
  }
  const currentCreatedAt = currentMessage.createdAt instanceof Date
    ? currentMessage.createdAt
    : new Date(currentMessage.createdAt);
  const diffCreatedAt = diffMessage.createdAt instanceof Date
    ? diffMessage.createdAt
    : new Date(diffMessage.createdAt);

  return (
    currentCreatedAt.getFullYear() === diffCreatedAt.getFullYear() &&
    currentCreatedAt.getMonth() === diffCreatedAt.getMonth() &&
    currentCreatedAt.getDate() === diffCreatedAt.getDate()
  );
};
import { PressableOpacity } from 'pressto';
import { Reply, Copy, Pencil, Trash2, Send, CheckCircle } from 'lucide-react-native';
import * as ContextMenu from 'zeego/context-menu';
import * as Clipboard from 'expo-clipboard';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage, reactTo } from '@/services/chats-service';
import { type DropdownMenuOption } from '@/components/dropdown-menu';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { MessageReplyPreview } from '@/components/message/message-reply-preview';
import { MessageDocumentPreview } from '@/components/message/message-document-preview';
import { MessageImagePreview } from '@/components/message/message-image-preview';
import { MessageVideoPreview } from '@/components/message/message-video-preview';
import { MessageAudioPreview } from '@/components/message/message-audio-preview';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';

interface MessageListProps {
  messages: ChatMessage[];
  backgroundColor: string;
  themeColors: ThemeColors;
  clientName: string;
  headerHeight?: number;
  bottomOffset?: number;
  keyboardHeight?: SharedValue<number>;
  text?: string;
  onInputTextChanged?: (text: string) => void;
  renderChatFooter?: () => React.ReactElement | null;
  renderInputToolbar?: (props: any) => React.ReactElement | null;
  renderSend?: (props: any) => React.ReactElement | null;
  renderActions?: (props: any) => React.ReactElement | null;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onReactionPress?: (message: ChatMessage) => void;
  onDocumentPress?: (document: import('@/services/chats-service').DocumentAttachment) => void;
  onImagePress?: (images: import('@/services/chats-service').ImageAttachment[], senderName: string, isSent: boolean, messageTimestamp?: Date) => void;
  onVideoPress?: (video: import('@/services/chats-service').VideoAttachment, senderName: string, isSent: boolean, messageTimestamp?: Date) => void;
  disableKeyboardOffset?: boolean;
}

// Extended IMessage interface for custom fields
// Note: We use 'videoAttachment' instead of 'video' to avoid conflict with GiftedChat's built-in video string type
interface ExtendedMessage extends IMessage {
  isSent: boolean;
  isRead: boolean;
  senderReaction?: string;
  recipientReaction?: string;
  replyTo?: ChatMessage;
  document?: import('@/services/chats-service').DocumentAttachment;
  images?: import('@/services/chats-service').ImageAttachment[];
  videoAttachment?: import('@/services/chats-service').VideoAttachment;
  audioAttachment?: import('@/services/chats-service').AudioAttachment;
  originalMessage: ChatMessage;
}

// Convert ChatMessage to GiftedChat's IMessage format
const chatMessageToGiftedMessage = (msg: ChatMessage, clientName: string): ExtendedMessage => ({
  _id: msg.id,
  text: msg.text,
  createdAt: msg.timestamp,
  user: {
    _id: msg.isSent ? 1 : 2,
    name: msg.isSent ? 'You' : clientName,
  },
  isSent: msg.isSent,
  isRead: msg.isRead,
  senderReaction: msg.senderReaction,
  recipientReaction: msg.recipientReaction,
  replyTo: msg.replyTo,
  document: msg.document,
  images: msg.images,
  videoAttachment: msg.video,
  audioAttachment: msg.audio,
  originalMessage: msg,
});

// Helper function to find the original message in a reply chain
const findOriginalMessage = (message: ChatMessage): ChatMessage => {
  if (!message.replyTo) {
    return message;
  }
  // Traverse the reply chain to find the original message
  return findOriginalMessage(message.replyTo);
};

export const MessageList = ({
  messages,
  backgroundColor,
  themeColors,
  clientName,
  headerHeight = 0,
  bottomOffset = 0,
  keyboardHeight,
  text = '',
  onInputTextChanged,
  renderChatFooter,
  renderInputToolbar,
  renderSend,
  renderActions,
  onReply,
  onEdit,
  onDelete,
  onReactionPress,
  onDocumentPress,
  onImagePress,
  onVideoPress,
  disableKeyboardOffset = false,
}: MessageListProps) => {
  const { t } = useTranslations();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiPickerMessage, setEmojiPickerMessage] = useState<ChatMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState<ExtendedMessage | null>(null);
  const colorScheme = useColorScheme();
  const isLightMode = colorScheme === 'light';
  const recipientBackgroundColor = isLightMode ? '#FFFFFF' : themeColors.surfaceSecondary;
  const { colors: fullThemeColors } = useThemePreference();
  const containerRef = useRef<View>(null);
  const flashAnimations = useRef<Record<string, RNAnimated.Value>>({});
  const allSwipeablesRef = useRef<Map<string, Swipeable>>(new Map());

  // Convert messages to GiftedChat format (newest first, GiftedChat expects this order)
  const giftedMessages = useMemo(() =>
    [...localMessages]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((msg) => chatMessageToGiftedMessage(msg, clientName)),
    [localMessages, clientName]
  );

  // Update local messages when prop changes
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Update swipeable row ref for managing swipeable instances
  const updateRowRef = useCallback((messageId: string, ref: Swipeable | null) => {
    if (ref) {
      allSwipeablesRef.current.set(messageId, ref);
    } else {
      allSwipeablesRef.current.delete(messageId);
    }
  }, []);

  // Handle swipe to reply
  const handleSwipeReply = useCallback((message: ExtendedMessage, swipeableRef: Swipeable | null) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Close the swipeable immediately
    if (swipeableRef) {
      swipeableRef.close();
    }

    // Set reply message
    setReplyMessage(message);
    if (onReply) {
      onReply(message.originalMessage);
    }
  }, [onReply]);

  const handleReactionUpdate = (messageId: string, emoji: string | undefined, isSender: boolean) => {
    console.log('handleReactionUpdate called:', { messageId, emoji, isSender });
    setLocalMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const updated = {
            ...msg,
            ...(isSender ? { senderReaction: emoji } : { recipientReaction: emoji }),
          };
          console.log('Updated message:', updated);
          return updated;
        }
        return msg;
      })
    );
  };

  const handleEmojiSelected = async (emojiObject: EmojiType) => {
    console.log('Emoji selected in MessageList:', emojiObject, 'emojiPickerMessage:', emojiPickerMessage);
    if (!emojiPickerMessage) return;

    const emoji = emojiObject.emoji;
    const isSender = emojiPickerMessage.isSent;

    // Get current user's reaction
    const currentReaction = isSender
      ? emojiPickerMessage.senderReaction
      : emojiPickerMessage.recipientReaction;

    // If clicking the same emoji, remove reaction
    const isRemoving = emoji === currentReaction;

    if (isRemoving) {
      // Remove reaction
      await reactTo(emojiPickerMessage.id, '', isSender);
      handleReactionUpdate(emojiPickerMessage.id, undefined, isSender);
    } else {
      // Add or update reaction
      await reactTo(emojiPickerMessage.id, emoji, isSender);
      handleReactionUpdate(emojiPickerMessage.id, emoji, isSender);
    }

    setEmojiPickerVisible(false);
    setEmojiPickerMessage(null);
  };

  const handleEmojiPickerClose = useCallback(() => {
    setEmojiPickerVisible(false);
    setEmojiPickerMessage(null);
  }, []);

  const handleReactionPress = (message: ChatMessage) => {
    onReactionPress?.(message);
  };

  const handleReplyPreviewPress = (messageId: string) => {
    // Find the message index in the giftedMessages array
    const messageIndex = giftedMessages.findIndex((m) => m._id === messageId);
    if (messageIndex === -1) return;

    // GiftedChat uses scrollToIndex internally via its ref
    // We'll use a flash animation to highlight the message
    // Note: GiftedChat doesn't expose scrollToIndex directly, so we rely on the flash animation

    // Flash the message by briefly changing its text color
    if (!flashAnimations.current[messageId]) {
      flashAnimations.current[messageId] = new RNAnimated.Value(0);
    }

    const flashAnim = flashAnimations.current[messageId];

    RNAnimated.sequence([
      RNAnimated.timing(flashAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: false,
      }),
      RNAnimated.timing(flashAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const getDatePillLabel = (d: Date) => {
    const now = new Date();
    const diffDays = Math.round(
      (startOfDay(now).getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return t?.('general.today') ?? 'Today';
    if (diffDays === 1) return t?.('general.yesterday') ?? 'Yesterday';

    // "Fri 28 Dec"
    return d
      .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace(',', '');
  };

  // Animated style that adjusts container based on keyboard height
  const animatedContainerStyle = useAnimatedStyle(() => {
    if (!keyboardHeight) return {};

    return {
      marginBottom: keyboardHeight.value,
    };
  }, [keyboardHeight]);

  const isMessageWithinOneHour = (message: ChatMessage): boolean => {
    const now = new Date();
    const messageTime = message.timestamp;
    const diffInMs = now.getTime() - messageTime.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 1;
  };

  const handleReply = (message: ChatMessage) => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleCopy = async (message: ChatMessage) => {
    await Clipboard.setStringAsync(message.text);
  };

  const handleEdit = (message: ChatMessage) => {
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = (message: ChatMessage) => {
    if (onDelete) {
      onDelete(message);
    }
  };

  // Quick reaction emojis for context menu
  const quickReactionEmojis = ['👍', '❤️', '😂', '😢', '🔥', '👏'];

  // Handle quick reaction from context menu
  const handleQuickReaction = useCallback(async (message: ChatMessage, emoji: string) => {
    const isSender = message.isSent;
    const currentReaction = isSender ? message.senderReaction : message.recipientReaction;

    // If clicking the same emoji, remove reaction
    if (emoji === currentReaction) {
      await reactTo(message.id, '', isSender);
      handleReactionUpdate(message.id, undefined, isSender);
    } else {
      await reactTo(message.id, emoji, isSender);
      handleReactionUpdate(message.id, emoji, isSender);
    }
  }, [handleReactionUpdate]);

  // Handle opening the emoji picker for more reactions
  const handleOpenReactionPicker = useCallback((message: ChatMessage) => {
    setEmojiPickerMessage(message);
    setEmojiPickerVisible(true);
  }, []);

  const getDropdownOptions = (message: ChatMessage): DropdownMenuOption[] => {
    const options: DropdownMenuOption[] = [
      {
        label: t('general.reply'),
        icon: { sf: 'arrowshape.turn.up.left', IconComponent: Reply },
        onPress: () => handleReply(message),
      },
      {
        label: t('general.copy'),
        icon: { sf: 'doc.on.doc', IconComponent: Copy },
        onPress: () => handleCopy(message),
      },
    ];

    if (message.isSent) {
      if (isMessageWithinOneHour(message)) {
        options.push({
          label: t('general.edit'),
          icon: { sf: 'pencil', IconComponent: Pencil },
          onPress: () => handleEdit(message),
        });
      }
      options.push({
        label: t('general.delete'),
        icon: { sf: 'trash', IconComponent: Trash2 },
        onPress: () => handleDelete(message),
        destructive: true,
      });
    }

    return options;
  };

  // Custom view for reply preview, documents, images, videos, audio above the message text
  const renderCustomView = useCallback((props: any) => {
    const { currentMessage, position } = props;
    if (!currentMessage) return null;

    const extMessage = currentMessage as ExtendedMessage;
    const item = extMessage.originalMessage;
    const isSent = position === 'right';
    const bubbleBgColor = isSent ? themeColors.primary : recipientBackgroundColor;
    const replyToMessage = item.replyTo ? findOriginalMessage(item.replyTo) : null;

    const hasCustomContent = replyToMessage || item.images?.length || item.video || item.document || item.audio;
    if (!hasCustomContent) return null;

    return (
      <View style={styles.customViewContainer}>
        {/* Reply preview */}
        {replyToMessage && (
          <MessageReplyPreview
            replyTo={replyToMessage}
            clientName={clientName}
            themeColors={themeColors}
            parentBackgroundColor={bubbleBgColor}
            isParentSent={isSent}
            onPress={() => handleReplyPreviewPress(replyToMessage.id)}
          />
        )}

        {/* Image preview */}
        {item.images && item.images.length > 0 && onImagePress && (
          <MessageImagePreview
            images={item.images}
            themeColors={themeColors}
            parentBackgroundColor={bubbleBgColor}
            isParentSent={isSent}
            onPress={() => {
              if (item.images) {
                onImagePress(item.images, clientName, isSent, item.timestamp);
              }
            }}
          />
        )}

        {/* Video preview */}
        {item.video && onVideoPress && (
          <MessageVideoPreview
            video={item.video}
            themeColors={themeColors}
            parentBackgroundColor={bubbleBgColor}
            isParentSent={isSent}
            onPress={() => {
              if (item.video) {
                onVideoPress(item.video, clientName, isSent, item.timestamp);
              }
            }}
          />
        )}

        {/* Document preview */}
        {item.document && onDocumentPress && (
          <MessageDocumentPreview
            document={item.document}
            themeColors={themeColors}
            parentBackgroundColor={bubbleBgColor}
            isParentSent={isSent}
            onPress={() => {
              if (item.document) {
                onDocumentPress(item.document);
              }
            }}
          />
        )}

        {/* Audio preview */}
        {item.audio && (
          <MessageAudioPreview
            audio={item.audio}
            themeColors={themeColors}
            parentBackgroundColor={bubbleBgColor}
            isParentSent={isSent}
          />
        )}
      </View>
    );
  }, [themeColors, recipientBackgroundColor, clientName, onImagePress, onVideoPress, onDocumentPress, handleReplyPreviewPress]);

  // Custom time with read receipts
  const renderTime = useCallback((props: any) => {
    const { currentMessage, position } = props;
    if (!currentMessage) return null;

    const extMessage = currentMessage as ExtendedMessage;
    const item = extMessage.originalMessage;
    const isSent = position === 'right';

    return (
      <View style={styles.timeContainer}>
        <Time
          {...props}
          timeTextStyle={{
            left: { color: themeColors.mutedText, ...typography.p7 },
            right: { color: themeColors.primaryForeground, opacity: 0.7, ...typography.p7 },
          }}
        />
        {isSent && (
          <View style={styles.readReceiptIcon}>
            {item.isRead ? (
              <PlatformIcon
                sf="checkmark.circle"
                IconComponent={CheckCircle}
                size={11}
                color={themeColors.primaryForeground}
              />
            ) : (
              <PlatformIcon
                sf="paperplane"
                IconComponent={Send}
                size={11}
                color={themeColors.primaryForeground}
              />
            )}
          </View>
        )}
      </View>
    );
  }, [themeColors]);

  // Custom bubble with context menu wrapper
  const renderBubble = useCallback((props: any) => {
    const { currentMessage, position } = props;
    if (!currentMessage) return null;

    const extMessage = currentMessage as ExtendedMessage;
    const item = extMessage.originalMessage;
    const messageId = String(currentMessage._id);

    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <View>
            <Bubble
              {...props}
              renderCustomView={renderCustomView}
              renderTime={renderTime}
              containerStyle={{
                left: { flex: 0, marginRight: 'auto' },
                right: { flex: 0, marginLeft: 'auto' },
              }}
              wrapperStyle={{
                left: {
                  backgroundColor: recipientBackgroundColor,
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                },
                right: {
                  backgroundColor: themeColors.primary,
                  borderRadius: 16,
                  borderBottomRightRadius: 4,
                },
              }}
              textStyle={{
                left: { color: themeColors.text, ...typography.p3 },
                right: { color: themeColors.primaryForeground, ...typography.p3 },
              }}
            />
          </View>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          {/* Quick emoji reactions as submenu */}
          <ContextMenu.Sub key={`react-sub-${messageId}`}>
            <ContextMenu.SubTrigger key={`react-trigger-${messageId}`}>
              <ContextMenu.ItemTitle>{t('general.react')}</ContextMenu.ItemTitle>
              <ContextMenu.ItemIcon
                ios={{
                  name: 'face.smiling',
                }}
              />
            </ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
              {quickReactionEmojis.map((emoji, emojiIndex) => (
                <ContextMenu.Item
                  key={`emoji-${messageId}-${emojiIndex}`}
                  onSelect={() => handleQuickReaction(item, emoji)}
                >
                  <ContextMenu.ItemTitle>{emoji}</ContextMenu.ItemTitle>
                </ContextMenu.Item>
              ))}
              <ContextMenu.Item
                key={`emoji-more-${messageId}`}
                onSelect={() => handleOpenReactionPicker(item)}
              >
                <ContextMenu.ItemTitle>{t('general.more')}</ContextMenu.ItemTitle>
                <ContextMenu.ItemIcon
                  ios={{
                    name: 'ellipsis.circle',
                  }}
                />
              </ContextMenu.Item>
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
          {/* Regular menu options */}
          {getDropdownOptions(item).map((option, optionIndex) => (
            <ContextMenu.Item
              key={`ctx-${messageId}-${optionIndex}`}
              onSelect={option.onPress}
              destructive={option.destructive}
            >
              <ContextMenu.ItemTitle>{option.label}</ContextMenu.ItemTitle>
              {option.icon && (
                <ContextMenu.ItemIcon
                  ios={{
                    name: option.icon.sf,
                  }}
                />
              )}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Root>
    );
  }, [themeColors, recipientBackgroundColor, renderCustomView, renderTime, getDropdownOptions, quickReactionEmojis, handleQuickReaction, handleOpenReactionPicker, t]);

  // Render left action (swipe reply indicator)
  const renderLeftAction = useCallback((
    progressAnimatedValue: RNAnimated.AnimatedInterpolation<number>,
    isNextMyMessage: boolean,
    position: 'left' | 'right'
  ) => {
    const size = progressAnimatedValue.interpolate({
      inputRange: [0, 1, 100],
      outputRange: [0, 1, 1],
    });
    const trans = progressAnimatedValue.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, 12, 20],
    });

    return (
      <RNAnimated.View
        style={[
          styles.swipeActionContainer,
          { transform: [{ scale: size }, { translateX: trans }] },
          isNextMyMessage ? styles.defaultBottomOffset : styles.bottomOffsetNext,
          position === 'right' && styles.leftOffsetValue,
        ]}
      >
        <View style={styles.replyImageWrapper}>
          <PlatformIcon
            sf="arrowshape.turn.up.left.circle"
            IconComponent={Reply}
            size={26}
            color={themeColors.mutedText}
          />
        </View>
      </RNAnimated.View>
    );
  }, [themeColors]);

  // Custom message with swipe-to-reply and reactions
  const renderMessage = useCallback((props: MessageProps<ExtendedMessage>) => {
    const { currentMessage, nextMessage, position } = props;
    if (!currentMessage) return <View />;

    const extMessage = currentMessage as ExtendedMessage;
    const item = extMessage.originalMessage;
    const isSent = position === 'right';
    const messageId = String(currentMessage._id);

    const isNextMyMessage =
      currentMessage &&
      nextMessage &&
      isSameUser(currentMessage, nextMessage) &&
      isSameDay(currentMessage, nextMessage);

    let swipeableInstance: Swipeable | null = null;

    const handleSwipeOpen = () => {
      handleSwipeReply(extMessage, swipeableInstance);
    };

    return (
      <GestureHandlerRootView>
        <Swipeable
          ref={(ref) => {
            swipeableInstance = ref;
            updateRowRef(messageId, ref);
          }}
          friction={2}
          rightThreshold={40}
          renderLeftActions={(progress) => renderLeftAction(progress, !!isNextMyMessage, position || 'left')}
          onSwipeableWillOpen={handleSwipeOpen}
        >
          <View style={isSent ? styles.messageContainerRight : styles.messageContainerLeft}>
            <Message
              {...props}
              renderBubble={renderBubble}
              containerStyle={{
                left: { justifyContent: 'flex-start', marginRight: 'auto', marginLeft: 0, paddingLeft: 0 },
                right: { justifyContent: 'flex-end', marginLeft: 'auto', marginRight: 0 },
              }}
            />
            {/* Reactions container */}
            {(item.senderReaction || item.recipientReaction) && (
              <PressableOpacity
                style={[
                  styles.reactionsContainer,
                  item.isSent ? styles.reactionsContainerRight : styles.reactionsContainerLeft,
                ]}
                onPress={() => handleReactionPress(item)}
              >
                <View
                  style={[
                    styles.reactionsInner,
                    {
                      backgroundColor: themeColors.surface,
                      shadowColor: themeColors.shadowColor,
                      ...(item.isSent ? { marginRight: 6 } : { marginLeft: 6 }),
                    },
                  ]}
                >
                  {item.senderReaction && item.recipientReaction && item.senderReaction === item.recipientReaction ? (
                    <>
                      <Text style={styles.reactionEmoji}>{item.senderReaction}</Text>
                      <Text style={[styles.reactionCount, { color: themeColors.mutedText }]}>2</Text>
                    </>
                  ) : (
                    <>
                      {item.senderReaction && (
                        <View style={styles.reactionItem}>
                          <Text style={styles.reactionEmoji}>{item.senderReaction}</Text>
                        </View>
                      )}
                      {item.recipientReaction && (
                        <View style={styles.reactionItem}>
                          <Text style={styles.reactionEmoji}>{item.recipientReaction}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </PressableOpacity>
            )}
          </View>
        </Swipeable>
      </GestureHandlerRootView>
    );
  }, [renderBubble, renderLeftAction, themeColors, handleReactionPress, handleSwipeReply, updateRowRef]);

  // Custom day renderer
  const renderDay = useCallback((props: any) => {
    const { currentMessage } = props;
    if (!currentMessage) return null;

    const date = new Date(currentMessage.createdAt);

    return (
      <View style={styles.datePillRow}>
        <View style={[styles.datePill, { backgroundColor: themeColors.surfaceSecondary }]}>
          <Text style={[styles.datePillText, { color: themeColors.text }]}>
            {getDatePillLabel(date)}
          </Text>
        </View>
      </View>
    );
  }, [themeColors, getDatePillLabel]);

  return (
    <>
      <Animated.View
        ref={containerRef}
        style={[
          styles.fill,
          { backgroundColor },
          keyboardHeight && !disableKeyboardOffset ? animatedContainerStyle : undefined,
        ]}
      >
        <GiftedChat
          messages={giftedMessages as IMessage[]}
          text={text}
          onInputTextChanged={onInputTextChanged}
          user={{ _id: 1 }}
          renderMessage={renderMessage}
          renderDay={renderDay}
          renderInputToolbar={renderInputToolbar || (() => null)}
          renderChatFooter={renderChatFooter}
          renderSend={renderSend}
          renderActions={renderActions}
          renderAvatar={null}
          bottomOffset={bottomOffset}
          maxComposerHeight={100}
          minInputToolbarHeight={0}
          listProps={{
            showsVerticalScrollIndicator: false,
            keyboardShouldPersistTaps: 'handled' as const,
            maintainVisibleContentPosition: {
              minIndexForVisible: 0,
            },
            keyboardDismissMode: 'interactive' as const,
            automaticallyAdjustsScrollIndicatorInsets: false,
            contentContainerStyle: {
              paddingHorizontal: 8,
              paddingBottom: (headerHeight ?? 0) + 16,
            },
          }}
        />
      </Animated.View>
      {/* Standalone EmojiPicker for full emoji selection (opened from plus button) */}
      <EmojiPicker
        open={emojiPickerVisible && emojiPickerMessage !== null}
        onClose={handleEmojiPickerClose}
        onEmojiSelected={handleEmojiSelected}
        enableSearchBar
        theme={{
          backdrop: '#00000055',
          container: fullThemeColors.surface,
          header: fullThemeColors.text,
          skinTonesContainer: colorScheme === 'dark' ? '#2a2a2a' : '#e3dbcd',
          category: {
            icon: fullThemeColors.mutedText || fullThemeColors.text,
            iconActive: fullThemeColors.primary,
            container: colorScheme === 'dark' ? '#2a2a2a' : '#e3dbcd',
            containerActive: fullThemeColors.surface,
          },
          search: {
            text: fullThemeColors.text,
            placeholder: fullThemeColors.mutedText || '#00000055',
            icon: fullThemeColors.mutedText || '#00000055',
            background: colorScheme === 'dark' ? '#2a2a2a' : '#00000011',
          },
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  messageContainerLeft: {
    width: '100%',
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    width: '100%',
    alignItems: 'flex-end',
  },
  customViewContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readReceiptIcon: {
    marginLeft: 4,
    opacity: 0.7,
  },
  datePillRow: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  datePillText: {
    ...typography.p3,
    fontWeight: '600',
  },
  reactionsContainer: {
    marginTop: -16,
    marginBottom: 4,
    zIndex: 15,
  },
  reactionsContainerRight: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  reactionsContainerLeft: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  reactionsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 3,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 15,
  },
  reactionCount: {
    ...typography.p7,
    fontSize: 12,
    marginLeft: 2,
  },
  swipeActionContainer: {
    width: 40,
  },
  replyImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultBottomOffset: {
    marginBottom: 2,
  },
  bottomOffsetNext: {
    marginBottom: 10,
  },
  leftOffsetValue: {
    marginLeft: 16,
  },
});
