import React from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type EmojiType } from 'rn-emoji-keyboard';

import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { Plus } from 'lucide-react-native';
import { type ChatMessage, reactTo } from '@/services/chats-service';

type EmojiPickerContainerProps = {
  visible: boolean;
  onClose: () => void;
  selectedMessage: ChatMessage | null;
  anchorPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  alignRight?: boolean;
  adjustedMessageTop: number;
  onReactionUpdate?: (messageId: string, emoji: string | undefined, isSender: boolean) => void;
  onEmojiPickerOpenChange?: (open: boolean) => void;
  disableModal?: boolean; // When true, renders without Modal wrapper (for use inside another Modal)
};

export const EmojiPickerContainer = ({
  visible,
  onClose,
  selectedMessage,
  anchorPosition,
  alignRight = true,
  adjustedMessageTop,
  onReactionUpdate,
  onEmojiPickerOpenChange,
  disableModal = false,
}: EmojiPickerContainerProps) => {
  const { colors: fullThemeColors } = useThemePreference();

  if (!visible || !selectedMessage) {
    return null;
  }

  // Get current user's reaction
  const currentReaction = selectedMessage.isSent
    ? selectedMessage.senderReaction
    : selectedMessage.recipientReaction;

  // Emoji shortcuts - if user has reacted, show that emoji first
  const baseEmojiShortcuts = ['👍', '❤️', '😂', '😮', '😢', '👏', '👌', '👋', '🤩'];
  const emojiShortcuts = currentReaction
    ? [currentReaction, ...baseEmojiShortcuts.filter((e) => e !== currentReaction)]
    : baseEmojiShortcuts;

  const handlePlusPress = () => {
    onEmojiPickerOpenChange?.(true);
  };


  const handleEmojiShortcutPress = async (emoji: string) => {
    if (!selectedMessage) {
      console.log('No selected message');
      return;
    }

    console.log('Emoji shortcut pressed:', emoji);
    const isSender = selectedMessage.isSent;
    const isRemoving = emoji === currentReaction;

    console.log('isSender:', isSender, 'isRemoving:', isRemoving, 'currentReaction:', currentReaction);

    if (isRemoving) {
      // Remove reaction
      console.log('Removing reaction');
      await reactTo(selectedMessage.id, '', isSender);
      onReactionUpdate?.(selectedMessage.id, undefined, isSender);
    } else {
      // Add or update reaction
      console.log('Adding/updating reaction:', emoji);
      await reactTo(selectedMessage.id, emoji, isSender);
      onReactionUpdate?.(selectedMessage.id, emoji, isSender);
    }

    // Close the popup after reaction
    onClose();
  };

  const screenWidth = Dimensions.get('window').width;
  const emojiPickerHeight = 44;
  const emojiPickerGap = 8; // Gap between emoji picker and message
  const emojiPickerTopGap = 80; // Minimum gap from top of screen (to avoid status bar)
  const emojiPickerTop = Math.max(
    emojiPickerTopGap,
    adjustedMessageTop - emojiPickerHeight - emojiPickerGap
  );
  const emojiPickerWidth = 340; // Width of the emoji container
  const plusButtonSize = 36; // Size of the circular plus button inside container
  const edgeGap = 16;

  // Calculate emoji picker position based on message sender
  // User messages (isSent): align to right edge
  // Client messages (!isSent): align to left edge
  const emojiPickerLeft = alignRight
    ? Math.min(
        anchorPosition.x + anchorPosition.width - emojiPickerWidth,
        screenWidth - emojiPickerWidth - edgeGap
      )
    : Math.max(
        anchorPosition.x,
        edgeGap
      );

  const handleOverlayPress = () => {
    onClose();
  };

  const handleModalRequestClose = () => {
    onClose();
  };

  const containerContent = (
    <View
      style={[
        styles.emojiPickerContainer,
        {
          left: emojiPickerLeft,
          top: emojiPickerTop,
          width: emojiPickerWidth,
          height: emojiPickerHeight,
          backgroundColor: fullThemeColors.surface,
          borderColor: fullThemeColors.border,
          shadowColor: fullThemeColors.shadowColor,
        },
      ]}
      onStartShouldSetResponder={() => true}
    >
      {/* Scrollable emoji shortcuts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emojiShortcutsScroll}
        style={styles.emojiShortcutsContainer}
      >
        {emojiShortcuts.map((emoji, index) => {
          const isCurrentReaction = emoji === currentReaction;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.emojiShortcut,
                isCurrentReaction && {
                  backgroundColor: fullThemeColors.surfaceSecondary,
                  borderRadius: 18,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                handleEmojiShortcutPress(emoji);
              }}
            >
              <Text style={styles.emojiShortcutText}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Plus button inside container, aligned to right */}
      <TouchableOpacity
        style={[
          styles.plusButton,
          {
            width: plusButtonSize,
            height: plusButtonSize,
            backgroundColor: fullThemeColors.surface,
          },
        ]}
        activeOpacity={0.7}
        onPress={handlePlusPress}
      >
        {/* Blur/fade effect on the left edge of plus button */}
        <LinearGradient
          colors={[fullThemeColors.surface, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 0 }}
          style={styles.plusButtonFade}
        />
        <PlatformIcon
          sf="plus"
          IconComponent={Plus}
          size={18}
          color={fullThemeColors.text}
        />
      </TouchableOpacity>
    </View>
  );

  if (disableModal) {
    return containerContent;
  }

  return (
    <Modal visible={visible} transparent onRequestClose={handleModalRequestClose}>
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        {containerContent}
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emojiPickerContainer: {
    position: 'absolute',
    borderRadius: 28,
    borderWidth: 1,
    zIndex: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 20,
  },
  emojiShortcutsContainer: {
    flex: 1,
    marginRight: 8,
  },
  emojiShortcutsScroll: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  emojiShortcut: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  emojiShortcutText: {
    fontSize: 24,
  },
  plusButton: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  plusButtonFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0,
  },
});
