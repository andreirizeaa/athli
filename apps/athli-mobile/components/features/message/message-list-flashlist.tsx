import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Reply, Copy, Pencil, Trash2, Send, CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage, reactTo } from '@/services/chats-service';
import { type DropdownMenuOption, ContextMenuWrapper } from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { MessageReplyPreview } from '@/components/features/message/message-reply-preview';
import { MessageDocumentPreview } from '@/components/features/message/message-document-preview';
import { MessageImagePreview } from '@/components/features/message/message-image-preview';
import { MessageVideoPreview } from '@/components/features/message/message-video-preview';
import { MessageAudioPreview } from '@/components/features/message/message-audio-preview';
import { useColorScheme, useThemePreference } from '@/stores';

interface MessageListProps {
  messages: ChatMessage[];
  backgroundColor: string;
  themeColors: ThemeColors;
  clientName: string;
  headerHeight?: number;
  bottomOffset?: number;
  keyboardHeight?: SharedValue<number>;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onReactionPress?: (message: ChatMessage) => void;
  onDocumentPress?: (document: import('@/services/chats-service').DocumentAttachment) => void;
  onImagePress?: (images: import('@/services/chats-service').ImageAttachment[], senderName: string, isSent: boolean, messageTimestamp?: Date) => void;
  onVideoPress?: (video: import('@/services/chats-service').VideoAttachment, senderName: string, isSent: boolean, messageTimestamp?: Date) => void;
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
const findOriginalMessage = (message: ChatMessage): ChatMessage => {
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
  dropdownOptions,
}: {
  item: ChatMessage;
  themeColors: ThemeColors;
  recipientBackgroundColor: string;
  formatTime: (d: Date) => string;
  softWrapText: (t: string) => string;
  registerRef: (ref: View | null) => void;
  isLastInSenderRun: boolean;
  clientName: string;
  onReplyPreviewPress?: (messageId: string) => void;
  onDocumentPress?: (document: import('@/services/chats-service').DocumentAttachment) => void;
  onImagePress?: (images: import('@/services/chats-service').ImageAttachment[], senderName: string, isSent: boolean, messageTimestamp?: Date) => void;
  onVideoPress?: (video: import('@/services/chats-service').VideoAttachment, senderName: string, isSent: boolean, messageTimestamp?: Date) => void;
  flashOpacity?: Animated.Value;
  dropdownOptions: DropdownMenuOption[];
}) {
  const [metaWidth, setMetaWidth] = useState(0);
  const [spaceWidth, setSpaceWidth] = useState(0);

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

  const bubbleStyle = [
    styles.messageBubble,
    item.isSent
      ? { backgroundColor: themeColors.primary }
      : { backgroundColor: recipientBackgroundColor },
    isLastInSenderRun && item.isSent && styles.messageBubbleTailRight,
    isLastInSenderRun && !item.isSent && styles.messageBubbleTailLeft,
    // Make bubble full width when it contains a document or is a reply
    ...(item.document || item.replyTo || item.audio ? [styles.messageBubbleFullWidth] : []),
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
          replyTo={originalMessage}
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
      {item.images && item.images.length > 0 && onImagePress && (
        <MessageImagePreview
          images={item.images}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            if (item.images) {
              onImagePress(item.images, clientName, item.isSent, item.sent_at);
            }
          }}
        />
      )}

      {/* Video preview if this message has a video */}
      {item.video && onVideoPress && (
        <MessageVideoPreview
          video={item.video}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            if (item.video) {
              onVideoPress(item.video, clientName, item.isSent, item.sent_at);
            }
          }}
        />
      )}

      {/* Document preview if this message has a document */}
      {item.document && onDocumentPress && (
        <MessageDocumentPreview
          document={item.document}
          themeColors={themeColors}
          parentBackgroundColor={
            item.isSent ? themeColors.primary : recipientBackgroundColor
          }
          isParentSent={item.isSent}
          onPress={() => {
            if (item.document) {
              onDocumentPress(item.document);
            }
          }}
        />
      )}

      {/* Audio preview if this message has audio */}
      {item.audio && (
        <MessageAudioPreview
          audio={item.audio}
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
    <ContextMenuWrapper options={dropdownOptions}>
      <View ref={registerRef} style={bubbleStyle}>
        {bubbleContent}
      </View>
    </ContextMenuWrapper>
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
}: {
  children: React.ReactNode;
  themeColors: ThemeColors;
  onCancelLongPress: () => void;
  alignRight: boolean;
  onReply?: (message: ChatMessage) => void;
  message: ChatMessage;
  onHorizontalDragStart?: () => void;
  onHorizontalDragEnd?: () => void;
}) {
  const MAX = 100;
  const THRESHOLD = 60; // pixels to trigger reply
  const translateX = useRef(new Animated.Value(0)).current;
  const didCancelRef = useRef(false);
  const currentDistanceRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hapticFiredRef = useRef(false);

  const iconOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, 15, MAX],
        outputRange: [0, 0.7, 1],
        extrapolate: 'clamp',
      }),
    [translateX]
  );

  const iconScale = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, THRESHOLD, MAX],
        outputRange: [0.8, 1.1, 1.15],
        extrapolate: 'clamp',
      }),
    [translateX]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, g) => {
          const { dx, dy } = g;
          // Require minimum horizontal movement
          if (Math.abs(dx) < 5) return false;
          // Must be primarily horizontal - horizontal movement must be at least 2x vertical
          if (Math.abs(dx) < Math.abs(dy) * 2) return false;
          // Only trigger on right swipe
          if (dx <= 0) return false;
          return true;
        },
        onPanResponderGrant: () => {
          translateX.stopAnimation();
          didCancelRef.current = false;
          currentDistanceRef.current = 0;
          hapticFiredRef.current = false;
          if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            onHorizontalDragStart?.();
          }
        },
        onShouldBlockNativeResponder: () => true,
        onPanResponderMove: (_evt, g) => {
          if (!didCancelRef.current) {
            onCancelLongPress();
            didCancelRef.current = true;
          }

          // Allow swipe based on message alignment
          const rawDx = g.dx;
          const clamped = Math.min(MAX, Math.max(0, Math.abs(rawDx)));

          currentDistanceRef.current = clamped;
          translateX.setValue(clamped);

          // Haptic feedback when crossing threshold
          if (clamped >= THRESHOLD && !hapticFiredRef.current) {
            hapticFiredRef.current = true;
            haptics.medium();
          } else if (clamped < THRESHOLD && hapticFiredRef.current) {
            hapticFiredRef.current = false;
          }
        },
        onPanResponderRelease: () => {
          const distance = currentDistanceRef.current;
          const shouldReply = distance >= THRESHOLD && onReply;

          if (shouldReply) {
            onReply(message);
          }

          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 35,
            velocity: 0,
          }).start();

          currentDistanceRef.current = 0;
          hapticFiredRef.current = false;
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            onHorizontalDragEnd?.();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 35,
            velocity: 0,
          }).start();
          currentDistanceRef.current = 0;
          hapticFiredRef.current = false;
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            onHorizontalDragEnd?.();
          }
        },
        onPanResponderTerminationRequest: () => {
          // Prevent termination if we're actively dragging
          return !isDraggingRef.current;
        },
      }),
    [onCancelLongPress, translateX, onReply, message, onHorizontalDragStart, onHorizontalDragEnd]
  );

  return (
    <View
      style={[
        styles.swipeContainer,
        alignRight ? styles.swipeContainerRight : styles.swipeContainerLeft,
      ]}
    >
      {/* Underlay (revealed as bubble moves right) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replyUnderlay,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
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
      </Animated.View>

      {/* Bubble */}
      <Animated.View
        style={[styles.swipeBubbleHost, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
});

export const MessageList = ({
  messages,
  backgroundColor,
  themeColors,
  clientName,
  headerHeight = 0,
  bottomOffset = 0,
  keyboardHeight,
  onReply,
  onEdit,
  onDelete,
  onReactionPress,
  onDocumentPress,
  onImagePress,
  onVideoPress,
}: MessageListProps) => {
  const { t } = useTranslations();
  const listRef = useRef<any>(null);
  const offsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const didInitialScroll = useRef(false);
  const initialScrollAttemptsRef = useRef(0);
  const pinnedToBottomRef = useRef(true);
  const prevBottomOffsetRef = useRef<number | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
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

  const handleReactionPress = (message: ChatMessage) => {
    onReactionPress?.(message);
  };

  const handleQuickReaction = async (message: ChatMessage, emoji: string) => {
    const isSender = message.isSent;

    // Get current user's reaction
    const currentReaction = isSender
      ? message.senderReaction
      : message.recipientReaction;

    // If clicking the same emoji, remove reaction
    const isRemoving = emoji === currentReaction;
    const newEmoji = isRemoving ? '' : emoji;

    // Update locally first for instant feedback
    setLocalMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === message.id) {
          return {
            ...msg,
            ...(isSender ? { senderReaction: isRemoving ? undefined : emoji } : { recipientReaction: isRemoving ? undefined : emoji }),
          };
        }
        return msg;
      })
    );

    // Send to backend
    try {
      await reactTo(message.id, newEmoji, isSender);
    } catch (error) {
      console.error('Failed to react to message:', error);
      // Revert on error
      setLocalMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === message.id) {
            return {
              ...msg,
              ...(isSender ? { senderReaction: currentReaction } : { recipientReaction: currentReaction }),
            };
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

  // Normal list (NOT inverted): chronological order (oldest first)
  // Index 0 (oldest) = TOP, last index (newest) = BOTTOM (above toolbar)
  const data = useMemo(() => {
    const sorted = [...localMessages].sort((a, b) => a.sent_at.getTime() - b.sent_at.getTime());
    return sorted;
  }, [localMessages]);

  const BASE_GAP = 6;
  const GROUPED_GAP = 2; // Tight gap for messages within 2 minutes from same sender
  const EXTRA_ON_SENDER_CHANGE = 10;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const getDatePillLabel = (d: Date) => {
    const now = new Date();
    const diffDays = Math.round(
      (startOfDay(now).getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return t?.('general.today') ?? 'Today';
    if (diffDays === 1) return t?.('general.yesterday') ?? 'Yesterday';

    return d
      .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace(',', '');
  };

  const [stickyTimestamp, setStickyTimestamp] = useState<Date>(() => data[0]?.sent_at ?? new Date());
  const [stickyDayKey, setStickyDayKey] = useState(() => {
    const first = data[0];
    return first ? dayKey(first.sent_at) : dayKey(new Date());
  });
  const stickyLabelOpacity = useRef(new Animated.Value(1)).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 5 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: ChatMessage; index: number | null }> }) => {
      if (!viewableItems?.length) return;

      let topMost = null as { item: ChatMessage; index: number | null } | null;

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

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isMessageWithinOneHour = (message: ChatMessage): boolean => {
    const now = new Date();
    const messageTime = message.sent_at;
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
      options.push({
        label: t('general.delete'),
        icon: { sf: 'trash', IconComponent: Trash2 },
        onPress: () => handleDelete(message),
        destructive: true,
      });
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

  const handleContentSizeChange = (_width: number, height: number) => {
    contentHeightRef.current = height;

    // Auto-scroll on content size change if pinned to bottom
    if (pinnedToBottomRef.current) {
      scrollToBottom(false);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    layoutHeightRef.current = event.nativeEvent.layout.height;
  };

  useEffect(() => {
    if (data.length > 0) {
      const newTimestamp = data[0].sent_at;
      setStickyTimestamp(newTimestamp);
      setStickyDayKey(dayKey(newTimestamp));
    }
  }, [data.length]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (data.length > 0 && !didInitialScroll.current) {
      didInitialScroll.current = true;
      pinnedToBottomRef.current = true;
      scrollToBottom(false);
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

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    // Normal list (NOT inverted): chronological order
    // Index 0 (oldest) = TOP of screen, last index (newest) = BOTTOM of screen
    const older = index > 0 ? data[index - 1] : null; // Previous index = older in time
    const newer = index + 1 < data.length ? data[index + 1] : null; // Next index = newer in time

    const sameSenderAsNewer = !!newer && newer.isSent === item.isSent;

    // Check if messages are within 2 minutes (for grouping)
    const isGroupedWithNewer = sameSenderAsNewer && newer &&
      Math.abs(item.sent_at.getTime() - newer.sent_at.getTime()) < 2 * 60 * 1000;

    // Gap ABOVE this message (marginTop creates space above in normal list)
    // Gap is between this message and the OLDER message above it
    let gap = 0;
    if (older) {
      const sameSenderAsOlder = !!older && older.isSent === item.isSent;
      const isGroupedWithOlder = sameSenderAsOlder && Math.abs(item.sent_at.getTime() - older.sent_at.getTime()) < 2 * 60 * 1000;

      if (sameSenderAsOlder) {
        // Same sender: use grouped gap if within 2 mins, otherwise base gap
        gap = isGroupedWithOlder ? GROUPED_GAP : BASE_GAP;
      } else {
        // Different sender: base gap + extra
        gap = BASE_GAP + EXTRA_ON_SENDER_CHANGE;
      }
    }

    // Determine if this is LAST in sender run (show tail corner, no bottom border radius)
    // Last = the one that is NOT grouped with the NEWER (next) message
    const isLastInSenderRun = !isGroupedWithNewer;

    const showDatePill = !older || !isSameDay(older.sent_at, item.sent_at);
    const itemDayKey = dayKey(item.sent_at);
    const hideInlinePill = stickyActive && itemDayKey === stickyDayKey;

    return (
      <View>
        {showDatePill && (
          <View style={styles.datePillRow}>
            <View
              style={[
                styles.datePill,
                { backgroundColor: themeColors.backgroundTertiary },
                hideInlinePill && styles.datePillHidden,
              ]}
            >
              <Text
                style={[
                  styles.datePillText,
                  { color: themeColors.text },
                  hideInlinePill && styles.datePillHidden,
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
              dropdownOptions={getDropdownOptions(item)}
            />
          </SwipeToReplyBubble>

          {/* Reactions container */}
          {(item.senderReaction || item.recipientReaction) && (
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

  // Animated style for keyboard
  const animatedContainerStyle = useAnimatedStyle(() => {
    if (!keyboardHeight) return {};
    return {
      transform: [{ translateY: -keyboardHeight.value }],
    };
  }, [keyboardHeight]);

  return (
    <>
      <Reanimated.View
        ref={containerRef}
        style={[
          styles.fill,
          { backgroundColor },
          keyboardHeight ? animatedContainerStyle : undefined,
        ]}
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
            // Normal list: paddingTop = space at top (header), paddingBottom = space at bottom (toolbar)
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
          }}
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
};

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
    maxWidth: '100%',
    overflow: 'visible',
    position: 'relative',
  },
  messageWrapperLeft: { alignSelf: 'flex-start' },
  messageWrapperRight: { alignSelf: 'flex-end' },
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
  datePillHidden: {
    opacity: 0,
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
    position: 'relative',
    flexShrink: 1,
    overflow: 'visible',
  },
  swipeContainerLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  swipeContainerRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  swipeBubbleHost: {
    maxWidth: '80%',
  },
  replyUnderlay: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
