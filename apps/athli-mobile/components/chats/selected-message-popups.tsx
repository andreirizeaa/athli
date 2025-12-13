import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';

import { typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage } from '@/services/chats-service';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import { PlatformIcon } from '@/components/platform-icon';
import { Send, CheckCircle } from 'lucide-react-native';
import { EmojiPickerContainer } from '@/components/chats/emoji-picker-container';

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
  emojiPickerVisible?: boolean;
  onEmojiPickerOpenChange?: (open: boolean) => void;
  onEmojiSelected: (emojiObject: EmojiType) => void;
  onEmojiPickerClose: () => void;
  colorScheme: 'light' | 'dark';
  fullThemeColors: ThemeColors;
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
  emojiPickerVisible = false,
  onEmojiPickerOpenChange,
  onEmojiSelected,
  onEmojiPickerClose,
  colorScheme,
  fullThemeColors,
}: SelectedMessagePopupsProps) => {
  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';

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


  const handleOverlayPress = () => {
    // Don't close if emoji picker is open
    if (!emojiPickerVisible) {
      onClose();
    }
  };

  const handleModalRequestClose = () => {
    // Don't close if emoji picker is open
    if (!emojiPickerVisible) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleModalRequestClose}
    >
      <View style={{ flex: 1 }}>
        {/* tap-outside layer BEHIND content */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleOverlayPress}
          pointerEvents={emojiPickerVisible ? 'none' : 'auto'}
        />

        <BlurView
          intensity={50}
          style={[styles.fullScreenBlur, { width: screenWidth, height: screenHeight }]}
          tint={blurTint}
          pointerEvents="none"
        />

        <EmojiPickerContainer
          visible={visible}
          onClose={onClose}
          selectedMessage={selectedMessage}
          anchorPosition={anchorPosition}
          alignRight={alignRight}
          adjustedMessageTop={adjustedMessageTop}
          onReactionUpdate={onReactionUpdate}
          onEmojiPickerOpenChange={onEmojiPickerOpenChange}
          disableModal={true}
        />

        {/* message overlay + dropdown */}
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
                    <View style={[styles.readReceiptIcon, { opacity: 0.7 }]}>
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
        <DropdownMenu
          visible={visible}
          onClose={onClose}
          options={options}
          anchorPosition={{
            ...anchorPosition,
            y: adjustedMessageTop,
          }}
          alignRight={alignRight}
          disableModal={true}
        />

        {/* ✅ EmojiPicker INSIDE the same modal */}
        <EmojiPicker
          open={emojiPickerVisible}
          onClose={onEmojiPickerClose}
          onEmojiSelected={onEmojiSelected}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    fontSize: 16,
    textAlign: 'left',
    includeFontPadding: false, // Android
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  timeText: {
    ...typography.p5,
  },
  readReceiptIcon: {
    marginLeft: 4,
    marginTop: 1,
  },
});
