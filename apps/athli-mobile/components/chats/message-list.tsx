import React, { useEffect, useMemo, useRef } from 'react';
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
  const offsetYRef = useRef(0);

  // NEWEST first for inverted list
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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

  // Optional: helps iOS keep content stable when keyboard changes insets
  useEffect(() => {
    const subShow = Keyboard.addListener('keyboardDidShow', () => {
      // If user is at bottom, keep them at bottom
      if (offsetYRef.current <= 40) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
          offsetYRef.current = 0;
        });
      }
    });
    return () => subShow.remove();
  }, []);

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    // Because data is reversed, "previous" item in the list is actually newer (closer to bottom).
    const isLastInSequence = index === 0 || data[index - 1]?.isSent !== item.isSent;

    const isDifferentSender = index > 0 && data[index - 1]?.isSent !== item.isSent;

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
    <View style={[styles.fill, { backgroundColor }]}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        inverted
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offsetYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        // This helps when new items are inserted at the "bottom" (index 0 in inverted list)
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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
