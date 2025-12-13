import React, { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage, reactTo } from '@/services/chats-service';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { Send, CheckCircle, Plus } from 'lucide-react-native';

interface SelectedMessagePopupsProps {
  visible: boolean;
  onClose: () => void;
  selectedMessage: ChatMessage | null;
  options: DropdownMenuOption[];
  anchorPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  alignRight?: boolean;
  containerPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  themeColors: ThemeColors;
  isLastInSenderRun: boolean;
  onReactionUpdate?: (messageId: string, emoji: string | undefined, isSender: boolean) => void;
}

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const SelectedMessagePopups = ({
  visible,
  onClose,
  selectedMessage,
  options,
  anchorPosition,
  alignRight = true,
  containerPosition,
  themeColors,
  isLastInSenderRun,
  onReactionUpdate,
}: SelectedMessagePopupsProps) => {
  const colorScheme = useColorScheme();
  const { colors: fullThemeColors } = useThemePreference();
  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  // Get current user's reaction
  const currentReaction = selectedMessage
    ? selectedMessage.isSent
      ? selectedMessage.senderReaction
      : selectedMessage.recipientReaction
    : undefined;

  // Emoji shortcuts - if user has reacted, show that emoji first
  const baseEmojiShortcuts = ['👍', '❤️', '😂', '😮', '😢', '👏', '👌', '👋', '🤩'];
  const emojiShortcuts = currentReaction
    ? [currentReaction, ...baseEmojiShortcuts.filter((e) => e !== currentReaction)]
    : baseEmojiShortcuts;

  const handlePlusPress = () => {
    setEmojiPickerVisible(true);
  };

  const handleEmojiSelected = async (emojiObject: EmojiType) => {
    if (!selectedMessage) return;

    const emoji = emojiObject.emoji;
    const isSender = selectedMessage.isSent;

    // If clicking the same emoji, remove reaction
    const isRemoving = emoji === currentReaction;

    if (isRemoving) {
      // Remove reaction
      await reactTo(selectedMessage.id, '', isSender);
      onReactionUpdate?.(selectedMessage.id, undefined, isSender);
    } else {
      // Add or update reaction
      await reactTo(selectedMessage.id, emoji, isSender);
      onReactionUpdate?.(selectedMessage.id, emoji, isSender);
    }

    setEmojiPickerVisible(false);
    // Close the popup after reaction
    onClose();
  };

  const handleEmojiPickerClose = () => {
    setEmojiPickerVisible(false);
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

  if (!visible || !selectedMessage) {
    return null;
  }

  // Calculate dropdown menu dimensions
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const menuItemHeight = 48;
  const menuHeight = options.length * menuItemHeight;
  const menuOffset = 8;
  const bottomGap = 40; // Gap from bottom of screen
  const topGap = 16; // Minimum gap from top of screen

  // Calculate required space below message for dropdown
  const requiredSpaceBelow = menuHeight + menuOffset + bottomGap;
  const spaceBelow = screenHeight - anchorPosition.y - anchorPosition.height;

  // If there's not enough space below, raise the message up
  const messageTopOffset = spaceBelow < requiredSpaceBelow 
    ? requiredSpaceBelow - spaceBelow 
    : 0;

  // Calculate adjusted position, but don't go above the top of the screen
  const adjustedMessageTop = Math.max(
    topGap,
    anchorPosition.y - messageTopOffset
  );

  // Emoji picker dimensions
  const emojiPickerHeight = 44;
  const emojiPickerGap = 8; // Gap between emoji picker and message
  const emojiPickerTop = Math.max(
    topGap,
    adjustedMessageTop - emojiPickerHeight - emojiPickerGap
  );
  const emojiPickerWidth = 280; // Width of the emoji container
  const plusButtonSize = 36; // Size of the circular plus button inside container
  const plusButtonPadding = 4; // Padding from right edge

  // Calculate emoji picker position based on message sender
  // User messages (isSent): align to right edge
  // Client messages (!isSent): align to left edge
  const emojiPickerLeft = selectedMessage.isSent
    ? Math.min(
        anchorPosition.x + anchorPosition.width - emojiPickerWidth,
        screenWidth - emojiPickerWidth - topGap
      )
    : Math.max(
        anchorPosition.x,
        topGap
      );

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Blur the entire screen */}
        <BlurView
          intensity={50}
          style={[
            styles.fullScreenBlur,
            {
              width: screenWidth,
              height: screenHeight,
            },
          ]}
          tint={blurTint}
        />
        {/* Emoji picker container */}
        <Pressable
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
          onPress={(e) => e.stopPropagation()}
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
                  onPress={(e) => {
                    e.stopPropagation();
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
        </Pressable>
        {/* Render message above blur */}
        <View
          style={[
            styles.messageOverlay,
            {
              left: anchorPosition.x,
              top: adjustedMessageTop,
              width: anchorPosition.width,
            },
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              { width: '100%' },
              selectedMessage.isSent
                ? { backgroundColor: themeColors.primary }
                : { backgroundColor: themeColors.surfaceSecondary },
              isLastInSenderRun && selectedMessage.isSent && styles.messageBubbleTailRight,
              isLastInSenderRun && !selectedMessage.isSent && styles.messageBubbleTailLeft,
            ]}
          >
            <View style={styles.bubbleInner}>
              <View style={styles.messageContainer}>
                <View style={styles.textWrap}>
                  <Text
                    style={[
                      styles.messageText,
                      selectedMessage.isSent
                        ? { color: themeColors.primaryForeground }
                        : { color: themeColors.text },
                    ]}
                  >
                    {selectedMessage.text}
                  </Text>
                </View>
                <View style={styles.timeRow}>
                  <Text
                    style={[
                      styles.timeText,
                      selectedMessage.isSent
                        ? { color: themeColors.primaryForeground, opacity: 0.7 }
                        : { color: themeColors.mutedText },
                    ]}
                  >
                    {formatTime(selectedMessage.timestamp)}
                  </Text>
                  {selectedMessage.isSent && (
                    <View style={styles.readReceiptIcon}>
                      {selectedMessage.isRead ? (
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
          </View>
        </View>
        {/* Dropdown menu */}
        <DropdownMenu
          visible={visible}
          onClose={onClose}
          options={options}
          anchorPosition={{
            ...anchorPosition,
            y: adjustedMessageTop,
          }}
          alignRight={alignRight}
        />
      </Pressable>
      {/* Emoji picker bottom sheet */}
      <EmojiPicker
        open={emojiPickerVisible}
        onClose={handleEmojiPickerClose}
        onEmojiSelected={handleEmojiSelected}
        enableSearchBar
        theme={{
          backdrop: colorScheme === 'dark' ? '#00000055' : '#00000055',
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  fullScreenBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  emojiPickerContainer: {
    position: 'absolute',
    borderRadius: 28,
    borderWidth: 1,
    zIndex: 2,
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
    elevation: 3,
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
  messageOverlay: {
    position: 'absolute',
    zIndex: 1,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
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
