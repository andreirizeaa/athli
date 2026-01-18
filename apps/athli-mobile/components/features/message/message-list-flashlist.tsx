import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Reply, Copy, Pencil, Trash2, Send, CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { type ThemeColors } from '@/constants/theme';
import { reactTo } from '@/services/chats-service';
import { type UIMessage, type MessageAttachment } from '@athli/shared-types';
import { type DropdownMenuOption, ContextMenuWrapper } from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { MessageReplyPreview } from '@/components/features/message/message-reply-preview';
import { MessageDocumentPreview } from '@/components/features/message/message-document-preview';
import { MessageImagePreview } from '@/components/features/message/message-image-preview';
import { MessageVideoPreview } from '@/components/features/message/message-video-preview';
import { MessageAudioPreview } from '@/components/features/message/message-audio-preview';
import { useColorScheme, useThemePreference } from '@/stores';

// Type for attachment with optional local_uri for optimistic messages
type AttachmentWithLocalUri = MessageAttachment & { local_uri?: string };

// Supabase storage URL base
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Get the display URI for an attachment (local_uri for optimistic, or construct from file_path)
const getAttachmentUri = (attachment: AttachmentWithLocalUri): string => {
  // For optimistic messages, use local_uri
  if (attachment.local_uri) return attachment.local_uri;
  // For real messages, construct public URL from storage
  if (attachment.file_path) {
    const bucketId = attachment.bucket_id || 'message_attachments';
    return `${SUPABASE_URL}/storage/v1/object/public/${bucketId}/${attachment.file_path}`;
  }
  return '';
};

// Helper functions to extract attachments by type with proper URI
const getImageAttachments = (msg: UIMessage): Array<AttachmentWithLocalUri & { uri: string }> =>
  (msg.attachments?.filter(a => a.mime_type?.startsWith('image/')) ?? []).map(a => ({
    ...a,
    uri: getAttachmentUri(a as AttachmentWithLocalUri),
  }));

const getVideoAttachment = (msg: UIMessage): (AttachmentWithLocalUri & { uri: string }) | undefined => {
  const attachment = msg.attachments?.find(a => a.mime_type?.startsWith('video/'));
  if (!attachment) return undefined;
  return { ...attachment, uri: getAttachmentUri(attachment as AttachmentWithLocalUri) };
};

const getAudioAttachment = (msg: UIMessage): (AttachmentWithLocalUri & { uri: string }) | undefined => {
  const attachment = msg.attachments?.find(a => a.mime_type?.startsWith('audio/'));
  if (!attachment) return undefined;
  return { ...attachment, uri: getAttachmentUri(attachment as AttachmentWithLocalUri) };
};

const getDocumentAttachment = (msg: UIMessage): (AttachmentWithLocalUri & { uri: string }) | undefined => {
  const attachment = msg.attachments?.find(a =>
    a.mime_type &&
    !a.mime_type.startsWith('image/') &&
    !a.mime_type.startsWith('video/') &&
    !a.mime_type.startsWith('audio/')
  );
  if (!attachment) return undefined;
  return { ...attachment, uri: getAttachmentUri(attachment as AttachmentWithLocalUri) };
};

// Helper to get user's reaction from reactions array
const getUserReaction = (msg: UIMessage, isSender: boolean, currentUserId?: string): string | undefined => {
  if (!msg.reactions || !currentUserId) return undefined;
  const userReaction = msg.reactions.find(r =>
    isSender ? r.user_id === msg.sender_id : r.user_id !== msg.sender_id
  );
  return userReaction?.reaction;
};

/**
 * Message type used by MessageList - uses UIMessage from shared-types
 * UIMessage has computed fields: text, isSent, isRead, replyTo
 */
type MessageListMessage = UIMessage;

interface MessageListProps {
  messages: UIMessage[];
  backgroundColor: string;
  themeColors: ThemeColors;
  clientName: string;
  headerHeight?: number;
  bottomOffset?: number;
  onReply?: (message: UIMessage) => void;
  onEdit?: (message: UIMessage) => void;
  onDelete?: (message: UIMessage) => void;
  onReactionPress?: (message: UIMessage) => void;
  onDocumentPress?: (document: any) => void;
  onImagePress?: (images: any[], senderName: string, isSent: boolean, messageTimestamp?: Date | string) => void;
  onVideoPress?: (video: any, senderName: string, isSent: boolean, messageTimestamp?: Date | string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
}

const ZWSP = '\u200B';
const NBSP = '\u00A0';

// Inserts break opportunities into long "tokens" (urls/long words)
const softWrapText = (text: string) => {
  return text
    .split(/(\s+)/) // keep whitespace tokens
    .map((token) => {
      // leave whitespace alone
      if (/^\s+$/.test(token)) return token;

      // add breaks after common URL/punctuation chars
      let t = token.replace(/([\/._\-?=&%#:])/g, `$1${ZWSP}`);

      // if still very long, insert a break every 18 chars
      if (t.replace(/\u200B/g, '').length > 24) {
        t = t.replace(/(.{18})/g, `$1${ZWSP}`);
      }

      return t;
    })
    .join('');
};

// Helper function to find the original message in a reply chain
const findOriginalMessage = (message: UIMessage): UIMessage => {
  if (!message.replyTo) {
    return message;
  }
  // Traverse the reply chain to find the original message
  return findOriginalMessage(message.replyTo);
};

const BubbleMeta = React.memo(function BubbleMeta({
  item,
  themeColors,
  recipientBackgroundColor,
  formatTime,
  softWrapText,
  registerRef,
  isLastInSenderRun,
  clientName,
  onReplyPreviewPress,
  onDocumentPress,
  onImagePress,
  onVideoPress,
  flashOpacity,
}: {
  item: UIMessage;
  themeColors: ThemeColors;
  recipientBackgroundColor: string;
  formatTime: (d: Date | string) => string;
  softWrapText: (t: string) => string;
  registerRef: (ref: View | null) => void;
  isLastInSenderRun: boolean;
  clientName: string;
  onReplyPreviewPress?: (messageId: string) => void;
  onDocumentPress?: (document: any) => void;
  onImagePress?: (images: any[], senderName: string, isSent: boolean, messageTimestamp?: Date | string) => void;
  onVideoPress?: (video: any, senderName: string, isSent: boolean, messageTimestamp?: Date | string) => void;
  flashOpacity?: Animated.Value;
}) {
  const [metaWidth, setMetaWidth] = useState(44);  // Typical meta width - prevents flicker
  const [spaceWidth, setSpaceWidth] = useState(4); // Typical NBSP width - prevents flicker

  // Find the original message if this is a reply
  const originalMessage = item.replyTo ? findOriginalMessage(item.replyTo) : null;

  const timeLabel = useMemo(() => formatTime(item.sent_at), [item.sent_at, formatTime]);

  // Measure ONE NBSP using the same typography as the timestamp
  const onMeasureSpace = (e: any) => {
    const w = e?.nativeEvent?.layout?.width ?? 0;
    if (w > 0 && w !== spaceWidth) setSpaceWidth(w);
  };

  // Measure the actual meta (time + icon) width
  const onMeasureMeta = (e: any) => {
    const w = e?.nativeEvent?.layout?.width ?? 0;
    if (w > 0 && w !== metaWidth) setMetaWidth(w);
  };

  // Build NBSP spacer to reserve exactly the meta overlay width (plus a tiny safety buffer)
  const metaSpacer = useMemo(() => {
    const effectiveMeta = Math.max(metaWidth, 44); // safe fallback until measured
    const effectiveSpace = Math.max(spaceWidth, 3); // safe fallback until measured
    const buffer = 4; // px for overlay padding/rounding
    const count = Math.ceil((effectiveMeta + buffer) / effectiveSpace);

    // prepend 1 extra NBSP so it never "sticks" to the last word
    return NBSP + NBSP.repeat(Math.max(4, count));
  }, [metaWidth, spaceWidth]);

  // Extract attachments using helper functions
  const images = getImageAttachments(item);
  const video = getVideoAttachment(item);
  const audio = getAudioAttachment(item);
  const document = getDocumentAttachment(item);

  const bubbleStyle = [
    styles.messageBubble,
    item.isSent
      ? { backgroundColor: themeColors.primary }
      : { backgroundColor: recipientBackgroundColor },
    isLastInSenderRun && item.isSent && styles.messageBubbleTailRight,
    isLastInSenderRun && !item.isSent && styles.messageBubbleTailLeft,
    // Make bubble full width when it contains a document or is a reply
    ...(document || item.replyTo || audio ? [styles.messageBubbleFullWidth] : []),
  ];

  const baseTextColor = item.isSent ? themeColors.primaryForeground : themeColors.text;

  // Use a subtle flash color based on existing palette (no extra ThemeColors field)
  const flashTextColor = item.isSent ? themeColors.backgroundSecondary: themeColors.primary;

  const animatedTextColor =
    flashOpacity &&
    flashOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [baseTextColor, flashTextColor],
    });

  const bubbleContent = (
    <View style={styles.bubbleInner}>
      {/* Hidden measurer for NBSP width (timestamp typography) */}
      <Text
        style={[styles.timeText, styles.hiddenMeasure]}
        onLayout={onMeasureSpace}
        pointerEvents="none"
      >
        {NBSP}
      </Text>

      {/* Reply preview if this message is a reply - show original message, not nested reply */}
      {originalMessage && (
        <MessageReplyPreview
          replyTo={originalMessage as any}
          clientName={clientName}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            onReplyPreviewPress?.(originalMessage.id);
          }}
        />
      )}

      {/* Image preview if this message has images */}
      {images.length > 0 && onImagePress && (
        <MessageImagePreview
          images={images as any}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            onImagePress(images, clientName, item.isSent, item.sent_at);
          }}
        />
      )}

      {/* Video preview if this message has a video */}
      {video && onVideoPress && (
        <MessageVideoPreview
          video={video as any}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            onVideoPress(video, clientName, item.isSent, item.sent_at);
          }}
        />
      )}

      {/* Document preview if this message has a document */}
      {document && onDocumentPress && (
        <MessageDocumentPreview
          document={document as any}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            onDocumentPress(document);
          }}
        />
      )}

      {/* Audio preview if this message has audio */}
      {audio && (
        <MessageAudioPreview
          audio={audio as any}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
        />
      )}

      {item.text && (
        <Animated.Text
          style={[
            styles.messageText,
            { color: (animatedTextColor as any) || baseTextColor },
          ]}
        >
          {softWrapText(item.text)}

          {/* Reserve space at the end so meta never overlaps (single-line OR multi-line) */}
          <Text style={styles.metaSpacer}>{metaSpacer}</Text>
        </Animated.Text>
      )}

      {/* Actual meta pinned bottom-right */}
      <View
        onLayout={onMeasureMeta}
        style={[
          styles.metaOverlay,
          {
            backgroundColor: item.isSent ? themeColors.primary : recipientBackgroundColor,
          },
        ]}
        pointerEvents="none"
      >
        <Text
          style={[
            styles.timeText,
            item.isSent
              ? { color: themeColors.primaryForeground, opacity: 0.7 }
              : { color: themeColors.mutedText },
          ]}
        >
          {timeLabel}
        </Text>

        {item.isSent && (
          <View style={[styles.readReceiptIcon, { opacity: 0.7 }]}>
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
    </View>
  );

  return (
    <View ref={registerRef} style={bubbleStyle}>
      {bubbleContent}
    </View>
  );
});

const SwipeToReplyBubble = React.memo(function SwipeToReplyBubble({
  children,
  themeColors,
  onCancelLongPress,
  alignRight,
  onReply,
  message,
  onHorizontalDragStart,
  onHorizontalDragEnd,
  dropdownOptions,
}: {
  children: React.ReactNode;
  themeColors: ThemeColors;
  onCancelLongPress: () => void;
  alignRight: boolean;
  onReply?: (message: UIMessage) => void;
  message: UIMessage;
  onHorizontalDragStart?: () => void;
  onHorizontalDragEnd?: () => void;
  dropdownOptions: DropdownMenuOption[];
}) {
  const MAX = 80;
  const THRESHOLD = 50;
  const translateX = useSharedValue(0);
  const hapticFiredRef = useRef(false);

  // Trigger haptic feedback - called from worklet via runOnJS
  const triggerHaptic = () => {
    haptics.medium();
  };

  // Trigger reply callback - called from worklet via runOnJS
  const triggerReply = () => {
    onReply?.(message);
  };

  // Notify drag start - called from worklet via runOnJS
  const notifyDragStart = () => {
    onCancelLongPress();
    onHorizontalDragStart?.();
  };

  // Notify drag end - called from worklet via runOnJS
  const notifyDragEnd = () => {
    onHorizontalDragEnd?.();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(alignRight ? [10, 999] : [-999, -10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      'worklet';
      hapticFiredRef.current = false;
      runOnJS(notifyDragStart)();
    })
    .onUpdate((event) => {
      'worklet';
      const rawDx = Math.abs(event.translationX);
      const clamped = Math.min(MAX, Math.max(0, rawDx));
      translateX.value = clamped;

      // Haptic feedback when crossing threshold
      if (clamped >= THRESHOLD && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        runOnJS(triggerHaptic)();
      } else if (clamped < THRESHOLD && hapticFiredRef.current) {
        hapticFiredRef.current = false;
      }
    })
    .onEnd((event) => {
      'worklet';
      const distance = Math.min(MAX, Math.abs(event.translationX));
      const shouldReply = distance >= THRESHOLD && onReply;

      if (shouldReply) {
        runOnJS(triggerReply)();
      }

      // Return with velocity preservation for smooth feel
      translateX.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
        mass: 1,
        overshootClamping: true,
        velocity: event.velocityX / 1000,
      });

      hapticFiredRef.current = false;
      runOnJS(notifyDragEnd)();
    })
    .onFinalize(() => {
      'worklet';
      // Ensure we return to 0 if gesture is cancelled
      if (translateX.value !== 0) {
        translateX.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
          overshootClamping: true,
        });
      }
      runOnJS(notifyDragEnd)();
    });

  // Animated styles using Reanimated
  const iconAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, 15, MAX],
      [0, 0.7, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, THRESHOLD, MAX],
      [0.8, 1.1, 1.15],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const tx = interpolate(
      translateX.value,
      [0, MAX],
      alignRight ? [0, MAX] : [0, -MAX],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX: tx }],
    };
  });

  return (
    <ContextMenuWrapper options={dropdownOptions}>
      <GestureDetector gesture={panGesture}>
        <Reanimated.View style={styles.swipeContainer}>
          {/* Icon - positioned based on alignRight */}
          <Reanimated.View
            pointerEvents="none"
            style={[
              styles.replyUnderlay,
              alignRight ? styles.underlayLeft : styles.underlayRight,
              iconAnimatedStyle,
            ]}
          >
            <View style={[styles.replyIconContainer, { backgroundColor: themeColors.backgroundTertiary }]}>
              <PlatformIcon
                sf="arrowshape.turn.up.left.fill"
                IconComponent={Reply}
                size={16}
                color={themeColors.primary}
              />
            </View>
          </Reanimated.View>

          {/* Bubble - aligned based on alignRight */}
          <Reanimated.View
            style={[
              styles.swipeBubbleHost,
              alignRight ? styles.bubbleAlignRight : styles.bubbleAlignLeft,
              bubbleAnimatedStyle,
            ]}
          >
            {children}
          </Reanimated.View>
        </Reanimated.View>
      </GestureDetector>
    </ContextMenuWrapper>
  );
});

/**
 * MessageList component with React.memo to prevent re-renders from parent state changes
 * (e.g., typing in the input field shouldn't re-render the message list)
 */
export const MessageList = React.memo(function MessageList({
  messages,
  backgroundColor,
  themeColors,
  clientName,
  headerHeight = 0,
  bottomOffset = 0,
  onReply,
  onEdit,
  onDelete,
  onReactionPress,
  onDocumentPress,
  onImagePress,
  onVideoPress,
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = true,
}: MessageListProps) {
  const { t } = useTranslations();
  const listRef = useRef<any>(null);
  const offsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const pinnedToBottomRef = useRef(true);

  // Init gating refs to prevent multiple scroll calls on mount
  const didInitScrollRef = useRef(false);
  const layoutReadyRef = useRef(false);
  const contentReadyRef = useRef(false);
  const prevBottomOffsetRef = useRef<number | null>(null);
  const [localMessages, setLocalMessages] = useState<UIMessage[]>(messages);
  const [isHorizontalDragActive, setIsHorizontalDragActive] = useState(false);
  const colorScheme = useColorScheme();
  const isLightMode = colorScheme === 'light';
  const recipientBackgroundColor = isLightMode ? '#FFFFFF' : themeColors.backgroundTertiary;
  const messageRefs = useRef<Record<string, View>>({});
  const containerRef = useRef<View>(null);
  const flashAnimations = useRef<Record<string, Animated.Value>>({});

  // Update local messages when prop changes
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const handleReactionPress = (message: UIMessage) => {
    onReactionPress?.(message);
  };

  const handleQuickReaction = async (message: UIMessage, emoji: string) => {
    const isSender = message.isSent;

    // Get current user's reaction from reactions array
    const currentReaction = message.reactions?.find(r =>
      isSender ? r.user_id === message.sender_id : r.user_id !== message.sender_id
    )?.reaction;

    // If clicking the same emoji, remove reaction
    const isRemoving = emoji === currentReaction;
    const newEmoji = isRemoving ? '' : emoji;

    // Update locally first for instant feedback
    setLocalMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === message.id) {
          const updatedReactions = [...(msg.reactions || [])];
          const existingIndex = updatedReactions.findIndex(r =>
            isSender ? r.user_id === msg.sender_id : r.user_id !== msg.sender_id
          );
          if (isRemoving && existingIndex >= 0) {
            updatedReactions.splice(existingIndex, 1);
          } else if (!isRemoving) {
            if (existingIndex >= 0) {
              updatedReactions[existingIndex] = { ...updatedReactions[existingIndex], reaction: emoji as any };
            } else {
              updatedReactions.push({
                id: `temp-${Date.now()}`,
                message_id: msg.id,
                conversation_id: msg.conversation_id,
                user_id: msg.sender_id, // This is a simplification - should use actual user ID
                reaction: emoji as any,
                created_at: new Date(),
              });
            }
          }
          return { ...msg, reactions: updatedReactions };
        }
        return msg;
      })
    );

    // Send to backend
    try {
      await reactTo(message.id, newEmoji, isSender);
    } catch (error) {
      console.error('Failed to react to message:', error);
      // Revert on error by restoring original message
      setLocalMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === message.id) {
            return message; // Restore original message
          }
          return msg;
        })
      );
    }
  };

  const handlePressOut = () => {
    // Empty handler for SwipeToReplyBubble - no longer needed for long press
  };

  const handleReplyPreviewPress = (messageId: string) => {
    const messageIndex = data.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);

    if (!flashAnimations.current[messageId]) {
      flashAnimations.current[messageId] = new Animated.Value(0);
    }

    const flashAnim = flashAnimations.current[messageId];

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const [stickyActive, setStickyActive] = useState(false);
  const stickyOpacity = useRef(new Animated.Value(0)).current;
  const hideStickyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSticky = () => {
    if (hideStickyTimerRef.current) {
      clearTimeout(hideStickyTimerRef.current);
      hideStickyTimerRef.current = null;
    }
    setStickyActive(true);
    Animated.timing(stickyOpacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const hideStickySoon = () => {
    // Don't hide if horizontal drag is active
    if (isHorizontalDragActive) return;

    if (hideStickyTimerRef.current) clearTimeout(hideStickyTimerRef.current);

    hideStickyTimerRef.current = setTimeout(() => {
      Animated.timing(stickyOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setStickyActive(false);
      });
    }, 600);
  };

  // Helper to convert sent_at to Date
  const toDate = (d: Date | string): Date => typeof d === 'string' ? new Date(d) : d;

  // Normal list (NOT inverted): chronological order (oldest first)
  // Index 0 (oldest) = TOP, last index (newest) = BOTTOM (above toolbar)
  const data = useMemo(() => {
    const sorted = [...localMessages].sort((a, b) => toDate(a.sent_at).getTime() - toDate(b.sent_at).getTime());
    return sorted;
  }, [localMessages]);

  // Gap sizes matching web app: mb-1 (4px) within sequence, mb-4 (16px) after last in sequence
  const GAP_WITHIN_SEQUENCE = 4;
  const GAP_AFTER_SEQUENCE = 16;

  const isSameDay = (a: Date | string, b: Date | string) => {
    const da = toDate(a);
    const db = toDate(b);
    return da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate();
  };

  const startOfDay = (d: Date | string) => {
    const date = toDate(d);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const dayKey = (d: Date | string) => {
    const date = toDate(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDatePillLabel = (d: Date | string) => {
    const date = toDate(d);
    const now = new Date();
    const diffDays = Math.round(
      (startOfDay(now).getTime() - startOfDay(date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return t?.('general.today') ?? 'Today';
    if (diffDays === 1) return t?.('general.yesterday') ?? 'Yesterday';

    return date
      .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace(',', '');
  };

  const [stickyTimestamp, setStickyTimestamp] = useState<Date | string>(() => data[0]?.sent_at ?? new Date());
  const [stickyDayKey, setStickyDayKey] = useState(() => {
    const first = data[0];
    return first ? dayKey(first.sent_at) : dayKey(new Date());
  });
  const stickyLabelOpacity = useRef(new Animated.Value(1)).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 5 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: UIMessage; index: number | null }> }) => {
      if (!viewableItems?.length) return;

      let topMost = null as { item: UIMessage; index: number | null } | null;

      for (const v of viewableItems) {
        if (!v?.item?.sent_at) continue;
        if (!topMost || (v.index ?? -1) > (topMost.index ?? -1)) {
          topMost = v;
        }
      }
      if (!topMost) return;

      const nextTs = topMost.item.sent_at;
      const nextKey = dayKey(nextTs);

      setStickyTimestamp((prevTs) => {
        const prevKey = dayKey(prevTs);
        if (prevKey === nextKey) return prevTs;

        Animated.sequence([
          Animated.timing(stickyLabelOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(stickyLabelOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();

        return nextTs;
      });

      setStickyDayKey((prev) => (prev === nextKey ? prev : nextKey));
    }
  ).current;

  const stickyDateForLabel = stickyTimestamp;

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isMessageWithinOneHour = (message: UIMessage): boolean => {
    const now = new Date();
    const messageTime = typeof message.sent_at === 'string' ? new Date(message.sent_at) : message.sent_at;
    const diffInMs = now.getTime() - messageTime.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 1;
  };

  // Check if a message can be deleted:
  // - Must be sent by the current user (isSent)
  // - Must NOT be read yet (!isRead)
  // - Must be within 5 minutes of being sent
  const canDeleteMessage = (message: UIMessage): boolean => {
    if (!message.isSent) return false;
    if (message.isRead) return false;

    const now = new Date();
    const messageTime = typeof message.sent_at === 'string' ? new Date(message.sent_at) : message.sent_at;
    const diffInMs = now.getTime() - messageTime.getTime();
    const fiveMinutesMs = 5 * 60 * 1000;

    return diffInMs <= fiveMinutesMs;
  };

  const handleReply = (message: UIMessage) => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleCopy = async (message: UIMessage) => {
    await Clipboard.setStringAsync(message.text || '');
  };

  const handleEdit = (message: UIMessage) => {
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = (message: UIMessage) => {
    if (onDelete) {
      onDelete(message);
    }
  };

  const getDropdownOptions = (message: UIMessage): DropdownMenuOption[] => {
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
      // React submenu with common emojis
      {
        label: 'React',
        icon: { sf: 'face.smiling', IconComponent: Reply },
        subActions: [
          {
            label: '👍',
            onPress: () => handleQuickReaction(message, '👍'),
          },
          {
            label: '❤️',
            onPress: () => handleQuickReaction(message, '❤️'),
          },
          {
            label: '😂',
            onPress: () => handleQuickReaction(message, '😂'),
          },
          {
            label: '😮',
            onPress: () => handleQuickReaction(message, '😮'),
          },
          {
            label: '😢',
            onPress: () => handleQuickReaction(message, '😢'),
          },
          {
            label: '🙏',
            onPress: () => handleQuickReaction(message, '🙏'),
          },
        ],
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
      // Only show delete if message is within 5 minutes and not read
      if (canDeleteMessage(message)) {
        options.push({
          label: t('general.delete'),
          icon: { sf: 'trash', IconComponent: Trash2 },
          onPress: () => handleDelete(message),
          destructive: true,
        });
      }
    }

    return options;
  };

  const scrollToBottom = (animated = false) => {
    if (data.length === 0) return;

    // Small delay to ensure FlashList has rendered
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated });
    }, 50);
  };

  // Single init gate to prevent multiple scroll calls on mount
  const maybeInitScroll = () => {
    if (didInitScrollRef.current) return;
    if (!layoutReadyRef.current || !contentReadyRef.current) return;
    if (data.length === 0) return;

    didInitScrollRef.current = true;
    pinnedToBottomRef.current = true;

    listRef.current?.scrollToEnd({ animated: false });
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    contentHeightRef.current = height;

    if (!contentReadyRef.current && height > 0) {
      contentReadyRef.current = true;
      maybeInitScroll();
      return; // Don't auto-scroll during init
    }

    if (didInitScrollRef.current && pinnedToBottomRef.current) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    layoutHeightRef.current = event.nativeEvent.layout.height;
    layoutReadyRef.current = true;
    maybeInitScroll();
  };

  useEffect(() => {
    if (data.length > 0) {
      const newTimestamp = data[0].sent_at;
      setStickyTimestamp(newTimestamp);
      setStickyDayKey(dayKey(newTimestamp));
    }
  }, [data.length]);

  // Scroll to bottom when new message is sent by user
  useEffect(() => {
    const previousLength = prevMessagesLengthRef.current;
    if (messages.length > previousLength) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.isSent) {
        pinnedToBottomRef.current = true;
        scrollToBottom(true);
      } else if (pinnedToBottomRef.current) {
        // If pinned and receiving message, scroll without animation
        scrollToBottom(false);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Handle toolbar height changes
  useEffect(() => {
    if (prevBottomOffsetRef.current === null) {
      prevBottomOffsetRef.current = bottomOffset;
      return;
    }

    const changed = prevBottomOffsetRef.current !== bottomOffset;
    prevBottomOffsetRef.current = bottomOffset;

    if (changed && pinnedToBottomRef.current) {
      scrollToBottom(false);
    }
  }, [bottomOffset]);

  const renderItem = ({ item, index }: { item: UIMessage; index: number }) => {
    // Normal list (NOT inverted): chronological order
    // Index 0 (oldest) = TOP of screen, last index (newest) = BOTTOM of screen
    const older = index > 0 ? data[index - 1] : null; // Previous index = older in time
    const newer = index + 1 < data.length ? data[index + 1] : null; // Next index = newer in time

    // Match web app logic: isLastInSequence when last message, or next is different sender, or next is different day
    const isLastInSequence =
      index === data.length - 1 ||
      (newer !== null && newer.isSent !== item.isSent) ||
      (newer !== null && !isSameDay(item.sent_at, newer.sent_at));

    // Gap ABOVE this message (marginTop creates space above in normal list)
    // Check if the PREVIOUS message was the last in its sequence
    let gap = 0;
    if (older) {
      const wasOlderLastInSequence =
        older.isSent !== item.isSent ||
        !isSameDay(older.sent_at, item.sent_at);

      gap = wasOlderLastInSequence ? GAP_AFTER_SEQUENCE : GAP_WITHIN_SEQUENCE;
    }

    // Show tail (reduced border radius) only on last message in sequence
    const isLastInSenderRun = isLastInSequence;

    const showDatePill = !older || !isSameDay(older.sent_at, item.sent_at);

    // Extract reactions from reactions array
    const senderReaction = item.reactions?.find(r => r.user_id === item.sender_id)?.reaction;
    const recipientReaction = item.reactions?.find(r => r.user_id !== item.sender_id)?.reaction;
    const hasReactions = senderReaction || recipientReaction;

    return (
      <View>
        {showDatePill && (
          <View style={styles.datePillRow}>
            <View
              style={[
                styles.datePill,
                { backgroundColor: themeColors.backgroundTertiary },
              ]}
            >
              <Text
                style={[
                  styles.datePillText,
                  { color: themeColors.text },
                ]}
              >
                {getDatePillLabel(item.sent_at)}
              </Text>
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageWrapper,
            item.isSent ? styles.messageWrapperRight : styles.messageWrapperLeft,
            { marginTop: gap },
          ]}
        >
          <SwipeToReplyBubble
            themeColors={themeColors}
            onCancelLongPress={handlePressOut}
            alignRight={item.isSent}
            onReply={onReply}
            message={item}
            onHorizontalDragStart={() => setIsHorizontalDragActive(true)}
            onHorizontalDragEnd={() => setIsHorizontalDragActive(false)}
            dropdownOptions={getDropdownOptions(item)}
          >
            <BubbleMeta
              item={item}
              themeColors={themeColors}
              recipientBackgroundColor={recipientBackgroundColor}
              formatTime={formatTime}
              softWrapText={softWrapText}
              registerRef={(ref) => {
                if (ref) messageRefs.current[item.id] = ref;
              }}
              isLastInSenderRun={isLastInSenderRun}
              clientName={clientName}
              onReplyPreviewPress={handleReplyPreviewPress}
              onDocumentPress={onDocumentPress}
              onImagePress={onImagePress}
              onVideoPress={onVideoPress}
              flashOpacity={flashAnimations.current[item.id]}
            />
          </SwipeToReplyBubble>

          {/* Reactions container */}
          {hasReactions && (
            <TouchableOpacity
              style={[
                styles.reactionsContainer,
                item.isSent ? styles.reactionsContainerRight : styles.reactionsContainerLeft,
              ]}
              activeOpacity={0.7}
              onPress={() => handleReactionPress(item)}
            >
              <View
                style={[
                  styles.reactionsInner,
                  {
                    backgroundColor: themeColors.backgroundSecondary,
                    shadowColor: themeColors.shadowColor,
                    ...(item.isSent ? { marginRight: 6 } : { marginLeft: 6 }),
                  },
                ]}
              >
                {senderReaction && recipientReaction && senderReaction === recipientReaction ? (
                  <>
                    <Text style={styles.reactionEmoji}>{senderReaction}</Text>
                    <Text style={[styles.reactionCount, { color: themeColors.mutedText }]}>2</Text>
                  </>
                ) : (
                  <>
                    {senderReaction && (
                      <View style={styles.reactionItem}>
                        <Text style={styles.reactionEmoji}>{senderReaction}</Text>
                      </View>
                    )}
                    {recipientReaction && (
                      <View style={styles.reactionItem}>
                        <Text style={styles.reactionEmoji}>{recipientReaction}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  useEffect(() => {
    return () => {
      if (hideStickyTimerRef.current) {
        clearTimeout(hideStickyTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Reanimated.View
        ref={containerRef}
        style={[styles.fill, { backgroundColor }]}
        onLayout={handleLayout}
      >
        <FlashList
          ref={listRef}
          data={data}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isHorizontalDragActive}
          contentContainerStyle={{
            paddingHorizontal: 16,
            // Normal list: paddingTop = space at top (header), paddingBottom = space at bottom (toolbar + 8px gap)
            paddingTop: headerHeight + 16 + STICKY_EXTRA,
            paddingBottom: bottomOffset,
            flexGrow: 1,
            justifyContent: 'flex-end', // Align messages to bottom when few messages
          }}
          onContentSizeChange={handleContentSizeChange}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const y = e.nativeEvent.contentOffset.y;
            const contentHeight = e.nativeEvent.contentSize.height;
            const layoutHeight = e.nativeEvent.layoutMeasurement.height;
            offsetYRef.current = y;
            // Pinned to bottom when scrolled near the end
            const distanceFromBottom = contentHeight - layoutHeight - y;
            pinnedToBottomRef.current = distanceFromBottom <= 40;

            // Trigger load more when scrolled near the top (200px threshold)
            if (y < 200 && hasMoreMessages && !isLoadingMore && onLoadMore) {
              onLoadMore();
            }
          }}
          ListHeaderComponent={
            isLoadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <Text style={[styles.loadingMoreText, { color: themeColors.mutedText }]}>
                  {t('general.loadingMore') || 'Loading...'}
                </Text>
              </View>
            ) : null
          }
          scrollEventThrottle={16}
          onScrollBeginDrag={() => showSticky()}
          onScrollEndDrag={() => hideStickySoon()}
          onMomentumScrollBegin={() => showSticky()}
          onMomentumScrollEnd={() => hideStickySoon()}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
        {stickyActive && (
          <Animated.View
            style={[
              styles.stickyHeaderRow,
              { opacity: Animated.multiply(stickyOpacity, stickyLabelOpacity) },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.datePill, { backgroundColor: themeColors.backgroundTertiary }]}>
              <Text style={[styles.datePillText, { color: themeColors.text }]}>
                {getDatePillLabel(stickyDateForLabel)}
              </Text>
            </View>
          </Animated.View>
        )}
      </Reanimated.View>
    </>
  );
});

const STICKY_EXTRA = 32; // Extra space for sticky header pill height

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  messageWrapper: {
    width: '100%',
    overflow: 'visible',
    position: 'relative',
  },
  messageWrapperLeft: {},
  messageWrapperRight: {},
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    maxWidth: '100%',
  },
  messageBubbleFullWidth: {
    maxWidth: '100%',
  },
  messageBubbleTailRight: { borderBottomRightRadius: 2 },
  messageBubbleTailLeft: { borderBottomLeftRadius: 2 },
  bubbleInner: {
    position: 'relative',
    width: '100%',
  },
  messageText: {
    ...typography.p3,
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    includeFontPadding: false, // Android
  },
  metaSpacer: {
    ...typography.p7,      // must match timestamp typography
    color: 'transparent',  // takes space, not visible
    fontVariant: ['tabular-nums'],
  },
  metaOverlay: {
    position: 'absolute',
    right: 0,
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 6,
    paddingTop: 1,
    borderRadius: 8,
  },
  timeText: {
    ...typography.p7,
    fontVariant: ['tabular-nums'],
  },
  hiddenMeasure: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  readReceiptIcon: {
    marginLeft: 4,
    marginTop: 1,
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
  stickyHeaderRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 10,
  },
  reactionsContainer: {
    marginTop: -4,
    marginBottom: 8,
    zIndex: 15,
  },
  reactionsContainerRight: {
    alignSelf: 'flex-end',
    marginRight: 12,
  },
  reactionsContainerLeft: {
    alignSelf: 'flex-start',
    marginLeft: 12,
  },
  reactionsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
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
    fontSize: 12,
  },
  reactionCount: {
    ...typography.p7,
    fontSize: 12,
    marginLeft: 2,
  },
  swipeContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  swipeBubbleHost: {
    maxWidth: '80%',
  },
  bubbleAlignLeft: {
    alignSelf: 'flex-start',
  },
  bubbleAlignRight: {
    alignSelf: 'flex-end',
  },
  replyUnderlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  underlayLeft: {
    left: 0,
    paddingLeft: 16,
  },
  underlayRight: {
    right: 0,
    paddingRight: 16,
  },
  replyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    ...typography.p4,
    fontWeight: '500',
  },
});
