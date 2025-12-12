import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage } from '@/services/chats-service';

interface MessageListProps {
  messages: ChatMessage[];
  backgroundColor: string;
  themeColors: ThemeColors;
}

export const MessageList = ({ messages, backgroundColor, themeColors }: MessageListProps) => {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const didInitialScroll = useRef(false);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const offsetYRef = useRef(0);

  // Track last layout height so we can anchor the bottom edge when viewport shrinks/expands
  const lastLayoutHeightRef = useRef(0);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const keyExtractor = (item: ChatMessage) => item.id;

  const initialScrollToBottom = () => {
    if (didInitialScroll.current) return;
    if (contentHeightRef.current <= 0) return;
    if (layoutHeightRef.current <= 0) return;

    didInitialScroll.current = true;

    // Jump to bottom once after first real layout/content measurement
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  };

  // When new messages arrive: if you're already at/near bottom, stay at bottom.
  useEffect(() => {
    if (!didInitialScroll.current) return;

    const distanceFromBottom =
      contentHeightRef.current - (offsetYRef.current + layoutHeightRef.current);

    const nearBottom = distanceFromBottom <= 40;

    if (nearBottom) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  // Anchor the bottom edge of the viewport when the list height changes
  // (keyboard opens/closes, toolbar grows/shrinks, etc.)
  const handleLayout = (h: number) => {
    const prev = lastLayoutHeightRef.current;
    lastLayoutHeightRef.current = h;

    layoutHeightRef.current = h;

    // First layout: just do initial scroll
    if (prev === 0) {
      initialScrollToBottom();
      return;
    }

    if (h === prev) return;

    // Keep the same bottom content coordinate pinned:
    // bottomCoord = offset + prevHeight
    // newOffset  = bottomCoord - newHeight = offset + prevHeight - newHeight
    const desiredOffset = Math.max(0, offsetYRef.current + (prev - h));

    // If we’re basically at the same offset, don’t spam scrollToOffset
    if (Math.abs(desiredOffset - offsetYRef.current) < 0.5) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: desiredOffset, animated: false });
    });
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isLastInSequence =
      index === messages.length - 1 || messages[index + 1]?.isSent !== item.isSent;

    const isDifferentSender = index > 0 && messages[index - 1]?.isSent !== item.isSent;

    return (
      <View
        style={[
          styles.messageWrapper,
          item.isSent ? styles.messageWrapperRight : styles.messageWrapperLeft,
          isDifferentSender && styles.messageWrapperDifferentSender,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            item.isSent
              ? { backgroundColor: themeColors.primary }
              : { backgroundColor: themeColors.surfaceSecondary },
            isLastInSequence && item.isSent && styles.messageBubbleLastRight,
            isLastInSequence && !item.isSent && styles.messageBubbleLastLeft,
          ]}
        >
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

          <Text
            style={[
              styles.messageTime,
              item.isSent
                ? { color: themeColors.primaryForeground, opacity: 0.7 }
                : { color: themeColors.mutedText },
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.fill, { backgroundColor }]} onLayout={(e) => handleLayout(e.nativeEvent.layout.height)}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offsetYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onContentSizeChange={(_, h) => {
          contentHeightRef.current = h;
          initialScrollToBottom();
        }}
      />
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
    marginBottom: 12,
    maxWidth: '100%',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  messageWrapperDifferentSender: {
    marginTop: 16,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    maxWidth: '70%',
  },
  messageBubbleLastRight: {
    borderBottomRightRadius: 4,
  },
  messageBubbleLastLeft: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.p4,
    marginBottom: 4,
  },
  messageTime: {
    ...typography.p6,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
});
