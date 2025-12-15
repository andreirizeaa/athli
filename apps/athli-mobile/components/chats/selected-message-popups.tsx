import React, { useMemo } from 'react';
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
import { MessageReplyPreview } from '@/components/message/message-reply-preview';
import { MessageDocumentPreview } from '@/components/message/message-document-preview';
import { MessageImagePreview } from '@/components/message/message-image-preview';
import { MessageVideoPreview } from '@/components/message/message-video-preview';
import { useColorScheme } from '@/contexts/useColorScheme';

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
  clientName?: string;
  recipientBackgroundColor?: string;
}

const NBSP = '\u00A0';

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const ZWSP = '\u200B';

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
  clientName = '',
  recipientBackgroundColor,
}: SelectedMessagePopupsProps) => {
  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';
  const colorSchemeHook = useColorScheme();
  const isLightMode = colorSchemeHook === 'light';
  const effectiveRecipientBackgroundColor = recipientBackgroundColor || (isLightMode ? '#FFFFFF' : themeColors.surfaceSecondary);

  // Find the original message if this is a reply
  const originalMessage = useMemo(() => {
    if (!selectedMessage?.replyTo) return null;
    return findOriginalMessage(selectedMessage.replyTo);
  }, [selectedMessage?.replyTo]);

  const baseTextColor = selectedMessage?.isSent ? themeColors.primaryForeground : themeColors.text;

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

  // Emoji picker dimensions (matching EmojiPickerContainer)
  const emojiPickerHeight = 44;
  const emojiPickerGap = 8; // Gap between emoji picker and message
  const emojiPickerTopGap = 80; // Minimum gap from top of screen for emoji picker (to avoid status bar)
  // Minimum message top to ensure emoji picker has enough space above it
  // Emoji picker top = adjustedMessageTop - emojiPickerHeight - emojiPickerGap
  // We need: emojiPickerTop >= emojiPickerTopGap
  // So: adjustedMessageTop - emojiPickerHeight - emojiPickerGap >= emojiPickerTopGap
  // Therefore: adjustedMessageTop >= emojiPickerTopGap + emojiPickerHeight + emojiPickerGap
  const minMessageTopForEmoji = emojiPickerTopGap + emojiPickerHeight + emojiPickerGap;

  // Calculate required space below message for dropdown
  const requiredSpaceBelow = menuHeight + menuOffset + bottomGap;
  const spaceBelow = screenHeight - anchorPosition.y - anchorPosition.height;

  // Calculate space above the original message position
  const spaceAbove = anchorPosition.y;

  // Check if we need to adjust for bottom constraints
  const needsBottomAdjustment = spaceBelow < requiredSpaceBelow;
  const bottomAdjustment = needsBottomAdjustment ? requiredSpaceBelow - spaceBelow : 0;

  // Check if we need to adjust for top constraints (emoji picker)
  const needsTopAdjustment = anchorPosition.y < minMessageTopForEmoji;

  // Calculate adjusted position
  // Priority: ensure emoji picker is visible (60px from top), then dropdown
  let adjustedMessageTop = anchorPosition.y;

  if (needsTopAdjustment && needsBottomAdjustment) {
    // Both need adjustment - try to fit both
    const totalRequiredSpace = minMessageTopForEmoji + anchorPosition.height + requiredSpaceBelow;
    const availableSpace = screenHeight - emojiPickerTopGap - bottomGap;
    
    if (totalRequiredSpace <= availableSpace) {
      // Can fit both - position message to satisfy top constraint first
      adjustedMessageTop = Math.max(minMessageTopForEmoji, anchorPosition.y - bottomAdjustment);
    } else {
      // Can't fit both perfectly - prioritize emoji picker visibility (60px gap)
      adjustedMessageTop = minMessageTopForEmoji;
    }
  } else if (needsTopAdjustment) {
    // Only top needs adjustment - push message down to make room for emoji picker
    adjustedMessageTop = minMessageTopForEmoji;
  } else if (needsBottomAdjustment) {
    // Only bottom needs adjustment - push message up, but ensure top constraint is still met
    adjustedMessageTop = Math.max(minMessageTopForEmoji, anchorPosition.y - bottomAdjustment);
  } else {
    // No adjustment needed, but ensure minimum top constraint is met
    adjustedMessageTop = Math.max(minMessageTopForEmoji, anchorPosition.y);
  }


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
                : { backgroundColor: effectiveRecipientBackgroundColor },
              isLastInSenderRun && selectedMessage.isSent && styles.messageBubbleTailRight,
              isLastInSenderRun && !selectedMessage.isSent && styles.messageBubbleTailLeft,
            ]}
          >
            <View style={styles.bubbleInner}>
              {/* Reply preview if this message is a reply */}
              {originalMessage && (
                <MessageReplyPreview
                  replyTo={originalMessage}
                  clientName={clientName}
                  themeColors={themeColors}
                  parentBackgroundColor={
                    selectedMessage.isSent ? themeColors.primary : effectiveRecipientBackgroundColor
                  }
                  isParentSent={selectedMessage.isSent}
                  onPress={() => {}}
                />
              )}

              {/* Image preview if this message has images */}
              {selectedMessage.images && selectedMessage.images.length > 0 && (
                <MessageImagePreview
                  images={selectedMessage.images}
                  themeColors={themeColors}
                  parentBackgroundColor={
                    selectedMessage.isSent ? themeColors.primary : effectiveRecipientBackgroundColor
                  }
                  isParentSent={selectedMessage.isSent}
                  onPress={() => {}}
                />
              )}

              {/* Video preview if this message has a video */}
              {selectedMessage.video && (
                <MessageVideoPreview
                  video={selectedMessage.video}
                  themeColors={themeColors}
                  parentBackgroundColor={
                    selectedMessage.isSent ? themeColors.primary : effectiveRecipientBackgroundColor
                  }
                  isParentSent={selectedMessage.isSent}
                  onPress={() => {}}
                />
              )}

              {/* Document preview if this message has a document */}
              {selectedMessage.document && (
                <MessageDocumentPreview
                  document={selectedMessage.document}
                  themeColors={themeColors}
                  parentBackgroundColor={
                    selectedMessage.isSent ? themeColors.primary : effectiveRecipientBackgroundColor
                  }
                  isParentSent={selectedMessage.isSent}
                  onPress={() => {}}
                />
              )}

              {/* Message text */}
              {selectedMessage.text && (
                <Text
                  style={[
                    styles.messageText,
                    { color: baseTextColor },
                  ]}
                >
                  {softWrapText(selectedMessage.text)}
                  {/* Reserve space at the end so meta never overlaps (single-line OR multi-line) */}
                  <Text style={styles.metaSpacer}>{NBSP.repeat(20)}</Text>
                </Text>
              )}

              {/* Actual meta pinned bottom-right */}
              <View
                style={[
                  styles.metaOverlay,
                  {
                    backgroundColor: selectedMessage.isSent ? themeColors.primary : effectiveRecipientBackgroundColor,
                  },
                ]}
                pointerEvents="none"
              >
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
    position: 'relative',
    width: '100%',
  },
  messageText: {
    ...typography.p3,
    fontSize: 16,
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
  readReceiptIcon: {
    marginLeft: 4,
    marginTop: 1,
  },
});
