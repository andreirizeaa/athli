import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Reply, Copy, Pencil, Trash2, Send, CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage } from '@/services/chats-service';
import { type DropdownMenuOption } from '@/components/dropdown-menu';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { SelectedMessagePopups } from '@/components/chats/selected-message-popups';

interface MessageListProps {
  messages: ChatMessage[];
  backgroundColor: string;
  themeColors: ThemeColors;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onReactionPress?: (message: ChatMessage) => void;
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

const BubbleMeta = React.memo(function BubbleMeta({
  item,
  themeColors,
  formatTime,
  softWrapText,
  registerRef,
  onPressIn,
  onPressOut,
  isLastInSenderRun,
}: {
  item: ChatMessage;
  themeColors: ThemeColors;
  formatTime: (d: Date) => string;
  softWrapText: (t: string) => string;
  registerRef: (ref: View | null) => void;
  onPressIn: () => void;
  onPressOut: () => void;
  isLastInSenderRun: boolean;
}) {
  const [metaWidth, setMetaWidth] = useState(0);
  const [spaceWidth, setSpaceWidth] = useState(0);

  const timeLabel = useMemo(() => formatTime(item.timestamp), [item.timestamp, formatTime]);

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

  return (
    <Pressable
      ref={registerRef}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.messageBubble,
        item.isSent
          ? { backgroundColor: themeColors.primary }
          : { backgroundColor: themeColors.surfaceSecondary },
        isLastInSenderRun && item.isSent && styles.messageBubbleTailRight,
        isLastInSenderRun && !item.isSent && styles.messageBubbleTailLeft,
      ]}
    >
      <View style={styles.bubbleInner}>
        {/* Hidden measurer for NBSP width (timestamp typography) */}
        <Text
          style={[styles.timeText, styles.hiddenMeasure]}
          onLayout={onMeasureSpace}
          pointerEvents="none"
        >
          {NBSP}
        </Text>

        <Text
          style={[
            styles.messageText,
            item.isSent
              ? { color: themeColors.primaryForeground }
              : { color: themeColors.text },
          ]}
        >
          {softWrapText(item.text)}

          {/* Reserve space at the end so meta never overlaps (single-line OR multi-line) */}
          <Text style={styles.metaSpacer}>{metaSpacer}</Text>
        </Text>

        {/* Actual meta pinned bottom-right */}
        <View
          onLayout={onMeasureMeta}
          style={[
            styles.metaOverlay,
            {
              backgroundColor: item.isSent ? themeColors.primary : themeColors.surfaceSecondary,
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
      </View>
    </Pressable>
  );
});

export const MessageList = ({
  messages,
  backgroundColor,
  themeColors,
  onReply,
  onEdit,
  onDelete,
  onReactionPress,
}: MessageListProps) => {
  const { t } = useTranslations();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const offsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const didInitialScroll = useRef(false);
  const initialScrollAttemptsRef = useRef(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isLastInSenderRun, setIsLastInSenderRun] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Record<string, View>>({});
  const containerRef = useRef<View>(null);

  // Update local messages when prop changes
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

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

  const handleReactionPress = (message: ChatMessage) => {
    onReactionPress?.(message);
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
    if (hideStickyTimerRef.current) clearTimeout(hideStickyTimerRef.current);

    hideStickyTimerRef.current = setTimeout(() => {
      Animated.timing(stickyOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setStickyActive(false);
      });
    }, 600); // delay like WhatsApp
  };

  // NEWEST first for inverted list
  const data = useMemo(() => [...localMessages].reverse(), [localMessages]);

  const BASE_GAP = 6; // every message-to-message gap starts with this
  const EXTRA_ON_SENDER_CHANGE = 14; // added when user <-> client switches

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

    // "Fri 28 Dec"
    return d
      .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace(',', '');
  };

  const [stickyDayKey, setStickyDayKey] = useState(() => {
    const first = data[0];
    return first ? dayKey(first.timestamp) : dayKey(new Date());
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: ChatMessage; index: number | null }> }) => {
      if (!viewableItems?.length) return;

      // In an inverted list, the item with the largest index is the one closest to the TOP of the screen.
      let topMost = null as { item: ChatMessage; index: number | null } | null;

      for (const v of viewableItems) {
        if (!v?.item?.timestamp) continue;
        if (!topMost || (v.index ?? -1) > (topMost.index ?? -1)) {
          topMost = v;
        }
      }

      if (topMost) {
        const nextKey = dayKey(topMost.item.timestamp);
        setStickyDayKey((prev) => (prev === nextKey ? prev : nextKey));
      }
    }
  ).current;

  const stickyDateForLabel = useMemo(() => {
    const msg = data.find((m) => dayKey(m.timestamp) === stickyDayKey);
    return msg?.timestamp ?? new Date();
  }, [data, stickyDayKey]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isMessageWithinOneHour = (message: ChatMessage): boolean => {
    const now = new Date();
    const messageTime = message.timestamp;
    const diffInMs = now.getTime() - messageTime.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 1;
  };

  const handleLongPress = (message: ChatMessage) => {
    const messageRef = messageRefs.current[message.id];
    if (!messageRef) return;

    // Find the message index in the data array to determine if it's last in sender run
    const messageIndex = data.findIndex((m) => m.id === message.id);
    const newer = messageIndex > 0 ? data[messageIndex - 1] : null;
    const sameSenderAsNewer = !!newer && newer.isSent === message.isSent;
    const isLast = !sameSenderAsNewer;

    messageRef.measureInWindow((x, y, width, height) => {
      setSelectedMessage(message);
      setIsLastInSenderRun(isLast);
      setAnchorPosition({ x, y, width, height });
      
      // Measure the container to get its position for blur
      containerRef.current?.measureInWindow((containerX, containerY, containerWidth, containerHeight) => {
        setContainerPosition({ x: containerX, y: containerY, width: containerWidth, height: containerHeight });
      });
      
      setDropdownVisible(true);
    });
  };

  const handlePressIn = (message: ChatMessage) => {
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(message);
    }, 500);
  };

  const handlePressOut = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleReply = () => {
    if (selectedMessage && onReply) {
      onReply(selectedMessage);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
    setIsLastInSenderRun(false);
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.text);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
    setIsLastInSenderRun(false);
  };

  const handleEdit = () => {
    if (selectedMessage && onEdit) {
      onEdit(selectedMessage);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
    setIsLastInSenderRun(false);
  };

  const handleDelete = () => {
    if (selectedMessage && onDelete) {
      onDelete(selectedMessage);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
    setIsLastInSenderRun(false);
  };

  const getDropdownOptions = (message: ChatMessage): DropdownMenuOption[] => {
    const options: DropdownMenuOption[] = [
      {
        label: t('general.reply'),
        icon: { sf: 'arrowshape.turn.up.left', IconComponent: Reply },
        onPress: handleReply,
      },
      {
        label: t('general.copy'),
        icon: { sf: 'doc.on.doc', IconComponent: Copy },
        onPress: handleCopy,
      },
    ];

    if (message.isSent) {
      if (isMessageWithinOneHour(message)) {
        options.push({
          label: t('general.edit'),
          icon: { sf: 'pencil', IconComponent: Pencil },
          onPress: handleEdit,
        });
      }
      options.push({
        label: t('general.delete'),
        icon: { sf: 'trash', IconComponent: Trash2 },
        onPress: handleDelete,
      });
    }

    return options;
  };

  const tryInitialScrollToBottom = () => {
    if (messages.length === 0) return;
    if (contentHeightRef.current <= 0) return;
    if (layoutHeightRef.current <= 0) return;

    const isOverflowing = contentHeightRef.current > layoutHeightRef.current + 1;
    if (!isOverflowing) {
      // Content fits: we want it to start at the top and NEVER run bottom logic.
      didInitialScroll.current = true;
      initialScrollAttemptsRef.current = 0;
      return;
    }

    // Existing scroll-to-bottom logic here
    if (!didInitialScroll.current && initialScrollAttemptsRef.current < 3) {
      initialScrollAttemptsRef.current += 1;
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        offsetYRef.current = 0;
        didInitialScroll.current = true;
      });
    }
  };


  // Track content and layout dimensions
  const handleContentSizeChange = (_width: number, height: number) => {
    contentHeightRef.current = height;
    tryInitialScrollToBottom();
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    layoutHeightRef.current = event.nativeEvent.layout.height;
    tryInitialScrollToBottom();
  };

  // Update sticky day key when messages change
  useEffect(() => {
    if (data.length > 0) {
      setStickyDayKey(dayKey(data[0].timestamp));
    }
  }, [data.length]);

  // If user is near "bottom" (offset ~ 0), keep them pinned to bottom as new messages arrive
  useEffect(() => {
    if (offsetYRef.current <= 40) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        offsetYRef.current = 0;
      });
    }
  }, [messages.length]);

  // Keyboard handling - no jump, just pin to bottom if already near bottom
  useEffect(() => {
    const subShow = Keyboard.addListener('keyboardDidShow', () => {
      // If user is at (or near) the bottom, keep them pinned there.
      if (offsetYRef.current <= 40) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
          offsetYRef.current = 0;
        });
      }
      // If user is reading older messages, do nothing (no jump).
    });

    return () => {
      subShow.remove();
    };
  }, []);

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    // index-1 is visually "below" (newer) because data is reversed + list inverted
    const newer = index > 0 ? data[index - 1] : null;
    // index+1 is visually "above" (older) because data is reversed + list inverted
    const older = index + 1 < data.length ? data[index + 1] : null;

    const sameSenderAsNewer = !!newer && newer.isSent === item.isSent;

    // Gap between THIS message and the one below it (newer)
    const gap =
      !newer
        ? 0
        : BASE_GAP + (sameSenderAsNewer ? 0 : EXTRA_ON_SENDER_CHANGE);

    // This is the last message in its sender-run (so it gets the tail corner)
    const isLastInSenderRun = !sameSenderAsNewer;

    // Show pill above the first (oldest) message in a date run
    const showDatePill = !older || !isSameDay(older.timestamp, item.timestamp);
    const itemDayKey = dayKey(item.timestamp);
    const hideInlinePill = stickyActive && itemDayKey === stickyDayKey;

    return (
      <View>
        {showDatePill && (
          <View style={styles.datePillRow}>
            <View
              style={[
                styles.datePill,
                { backgroundColor: themeColors.surfaceSecondary },
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
                {getDatePillLabel(item.timestamp)}
              </Text>
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageWrapper,
            item.isSent ? styles.messageWrapperRight : styles.messageWrapperLeft,
            { marginBottom: gap },
          ]}
        >
          <BubbleMeta
            item={item}
            themeColors={themeColors}
            formatTime={formatTime}
            softWrapText={softWrapText}
            registerRef={(ref) => {
              if (ref) messageRefs.current[item.id] = ref;
            }}
            onPressIn={() => handlePressIn(item)}
            onPressOut={handlePressOut}
            isLastInSenderRun={isLastInSenderRun}
          />
        </View>
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
          </TouchableOpacity>
        )}
      </View>
    );
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (hideStickyTimerRef.current) {
        clearTimeout(hideStickyTimerRef.current);
      }
    };
  }, []);

  return (
    <View ref={containerRef} style={[styles.fill, { backgroundColor }]} onLayout={handleLayout}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        inverted
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        onContentSizeChange={handleContentSizeChange}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offsetYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => showSticky()}
        onScrollEndDrag={() => hideStickySoon()}
        onMomentumScrollBegin={() => showSticky()}
        onMomentumScrollEnd={() => hideStickySoon()}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // This helps when new items are inserted at the "bottom" (index 0 in inverted list)
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />
      {stickyActive && (
        <Animated.View
          style={[styles.stickyHeaderRow, { opacity: stickyOpacity }]}
          pointerEvents="none"
        >
          <View style={[styles.datePill, { backgroundColor: themeColors.surfaceSecondary }]}>
            <Text style={[styles.datePillText, { color: themeColors.text }]}>
              {getDatePillLabel(stickyDateForLabel)}
            </Text>
          </View>
        </Animated.View>
      )}
      {selectedMessage && (
        <SelectedMessagePopups
          visible={dropdownVisible}
          onClose={() => {
            setDropdownVisible(false);
            setSelectedMessage(null);
            setIsLastInSenderRun(false);
          }}
          selectedMessage={selectedMessage}
          options={getDropdownOptions(selectedMessage)}
          anchorPosition={anchorPosition}
          alignRight={selectedMessage.isSent}
          containerPosition={containerPosition}
          themeColors={themeColors}
          isLastInSenderRun={isLastInSenderRun}
          onReactionUpdate={handleReactionUpdate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 16 + 32, // extra padding for sticky header (16 base + ~32 for pill height)
  },
  messageWrapper: {
    maxWidth: '100%',
  },
  messageWrapperLeft: { alignSelf: 'flex-start' },
  messageWrapperRight: { alignSelf: 'flex-end' },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    maxWidth: '80%',
  },
  messageBubbleTailRight: { borderBottomRightRadius: 2 },
  messageBubbleTailLeft: { borderBottomLeftRadius: 2 },
  bubbleInner: {
    position: 'relative',
    width: '100%',
  },
  messageText: {
    ...typography.p3,
    fontSize: 14,
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
    bottom: 0,
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
    ...typography.p5,
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
    marginTop: -12,
  },
  reactionsContainerRight: {
    alignSelf: 'flex-end',
  },
  reactionsContainerLeft: {
    alignSelf: 'flex-start',
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
});
