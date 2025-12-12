import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

  // During keyboard animation: keep the same "bottom content coordinate" pinned.
  const keyboardAnimatingRef = useRef(false);
  const bottomAnchorRef = useRef<number | null>(null);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const initialScrollToBottom = () => {
    if (didInitialScroll.current) return;
    if (contentHeightRef.current <= 0) return;
    if (layoutHeightRef.current <= 0) return;

    didInitialScroll.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  };

  // New messages: if user is near bottom, stay at bottom.
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

  // Capture bottom anchor when keyboard starts moving; keep it stable until it finishes.
  useEffect(() => {
    const captureAnchor = () => {
      // anchor = "what content Y is currently at the bottom edge of the viewport"
      bottomAnchorRef.current = offsetYRef.current + layoutHeightRef.current;
      keyboardAnimatingRef.current = true;
    };

    const releaseAnchor = () => {
      keyboardAnimatingRef.current = false;
      bottomAnchorRef.current = null;
    };

    const subs = [
      Keyboard.addListener('keyboardWillShow', captureAnchor),
      Keyboard.addListener('keyboardWillHide', captureAnchor),
      Keyboard.addListener('keyboardDidShow', releaseAnchor),
      Keyboard.addListener('keyboardDidHide', releaseAnchor),
    ];

    return () => subs.forEach((s) => s.remove());
  }, []);

  const applyAnchorOffset = (newHeight: number) => {
    // If keyboard is animating, use captured anchor; otherwise use simple prev/new delta.
    if (keyboardAnimatingRef.current && bottomAnchorRef.current != null) {
      const desiredOffset = Math.max(0, bottomAnchorRef.current - newHeight);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: desiredOffset, animated: false });
      });
      return;
    }
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isLastInSequence =
      index === messages.length - 1 || messages[index + 1]?.isSent !== item.isSent;

    const isDifferentSender = index > 0 && messages[index - 1]?.isSent !== item.isSent;

    return (
      <View
        key={item.id}
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
    <View
      style={[styles.fill, { backgroundColor }]}
      onLayout={(e) => {
        const newH = e.nativeEvent.layout.height;
        layoutHeightRef.current = newH;

        // Keep viewport anchored during keyboard animation
        applyAnchorOffset(newH);

        // Initial boot
        initialScrollToBottom();
      }}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offsetYRef.current = e.nativeEvent.contentOffset.y;
        }}
        onScrollEndDrag={(e) => {
          offsetYRef.current = e.nativeEvent.contentOffset.y;
        }}
        onMomentumScrollEnd={(e) => {
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
  messageWrapperLeft: { alignSelf: 'flex-start' },
  messageWrapperRight: { alignSelf: 'flex-end' },
  messageWrapperDifferentSender: { marginTop: 16 },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    maxWidth: '70%',
  },
  messageBubbleLastRight: { borderBottomRightRadius: 4 },
  messageBubbleLastLeft: { borderBottomLeftRadius: 4 },
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
