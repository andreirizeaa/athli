import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Reply, Copy, Pencil, Trash2, Send, CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage } from '@/services/chats-service';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';

interface MessageListProps {
  messages: ChatMessage[];
  backgroundColor: string;
  themeColors: ThemeColors;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
}

export const MessageList = ({
  messages,
  backgroundColor,
  themeColors,
  onReply,
  onEdit,
  onDelete,
}: MessageListProps) => {
  const { t } = useTranslations();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const offsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const bottomAnchorRef = useRef<number | null>(null);
  const keyboardAnimatingRef = useRef(false);
  const didInitialScroll = useRef(false);
  const initialScrollAttemptsRef = useRef(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Record<string, View>>({});
  const containerRef = useRef<View>(null);

  // NEWEST first for inverted list
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const BASE_GAP = 6; // every message-to-message gap starts with this
  const EXTRA_ON_SENDER_CHANGE = 14; // added when user <-> client switches

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

    messageRef.measureInWindow((x, y, width, height) => {
      setSelectedMessage(message);
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
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.text);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
  };

  const handleEdit = () => {
    if (selectedMessage && onEdit) {
      onEdit(selectedMessage);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
  };

  const handleDelete = () => {
    if (selectedMessage && onDelete) {
      onDelete(selectedMessage);
    }
    setDropdownVisible(false);
    setSelectedMessage(null);
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

  const captureAnchor = () => {
    // Clamp anchor to the actual content bottom so non-overflow chats don't "anchor" past content.
    const bottomEdge = offsetYRef.current + layoutHeightRef.current;
    bottomAnchorRef.current = Math.min(contentHeightRef.current, bottomEdge);
    keyboardAnimatingRef.current = true;
  };

  const applyAnchorOffset = (newHeight: number) => {
    if (!(keyboardAnimatingRef.current && bottomAnchorRef.current != null)) return;

    // Maximum scrollable offset given new viewport height
    const maxOffset = Math.max(0, contentHeightRef.current - newHeight);

    // Desired keeps the same content point at the bottom edge
    const raw = bottomAnchorRef.current - newHeight;

    // Clamp into valid scroll range
    const desiredOffset = Math.min(maxOffset, Math.max(0, raw));

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: desiredOffset, animated: false });
      offsetYRef.current = desiredOffset; // keep ref truthful even if onScroll doesn't fire
    });
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

  // If user is near "bottom" (offset ~ 0), keep them pinned to bottom as new messages arrive
  useEffect(() => {
    if (offsetYRef.current <= 40) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        offsetYRef.current = 0;
      });
    }
  }, [messages.length]);

  // Keyboard handling with anchoring
  useEffect(() => {
    const subShow = Keyboard.addListener('keyboardDidShow', (event) => {
      captureAnchor();
      applyAnchorOffset(event.endCoordinates.height);
    });

    const subHide = Keyboard.addListener('keyboardDidHide', () => {
      if (keyboardAnimatingRef.current) {
        keyboardAnimatingRef.current = false;
        bottomAnchorRef.current = null;
      }
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    // index-1 is visually "below" (newer) because data is reversed + list inverted
    const newer = index > 0 ? data[index - 1] : null;

    const sameSenderAsNewer = !!newer && newer.isSent === item.isSent;

    // Gap between THIS message and the one below it (newer)
    const gap =
      !newer
        ? 0
        : BASE_GAP + (sameSenderAsNewer ? 0 : EXTRA_ON_SENDER_CHANGE);

    // This is the last message in its sender-run (so it gets the tail corner)
    const isLastInSenderRun = !sameSenderAsNewer;

    return (
      <View
        style={[
          styles.messageWrapper,
          item.isSent ? styles.messageWrapperRight : styles.messageWrapperLeft,
          { marginBottom: gap },
        ]}
      >
        <Pressable
          ref={(ref: View | null) => {
            if (ref) messageRefs.current[item.id] = ref;
          }}
          onPressIn={() => handlePressIn(item)}
          onPressOut={handlePressOut}
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
            <View style={styles.messageContainer}>
              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.messageText,
                    item.isSent
                      ? { color: themeColors.primaryForeground }
                      : { color: themeColors.text },
                  ]}
                >
                  {item.text}
                </Text>
              </View>
              <View style={styles.timeRow}>
                <Text
                  style={[
                    styles.timeText,
                    item.isSent
                      ? { color: themeColors.primaryForeground, opacity: 0.7 }
                      : { color: themeColors.mutedText },
                  ]}
                >
                  {formatTime(item.timestamp)}
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
          </View>
        </Pressable>
      </View>
    );
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
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
        // This helps when new items are inserted at the "bottom" (index 0 in inverted list)
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />
      {selectedMessage && (
        <DropdownMenu
          visible={dropdownVisible}
          onClose={() => {
            setDropdownVisible(false);
            setSelectedMessage(null);
          }}
          options={getDropdownOptions(selectedMessage)}
          anchorPosition={anchorPosition}
          alignRight={selectedMessage.isSent}
          containerPosition={containerPosition}
          messageData={{
            text: selectedMessage.text,
            timestamp: selectedMessage.timestamp,
            isSent: selectedMessage.isSent,
            themeColors: {
              primary: themeColors.primary,
              primaryForeground: themeColors.primaryForeground,
              surfaceSecondary: themeColors.surfaceSecondary,
              text: themeColors.text,
              mutedText: themeColors.mutedText,
            },
          }}
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
    width: '100%',
  },
  messageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    width: '100%',
  },
  textWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
  },
  messageText: {
    ...typography.p3,
    fontSize: 14,
    textAlign: 'left',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  timeText: {
    ...typography.p7,
  },
  readReceiptIcon: {
    marginLeft: 4,
    marginTop: 1,
  },
});
