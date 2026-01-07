import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';
import { type ChatMessage, removeReaction } from '@/services/chats-service';

interface MessageReactionsSheetProps {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  onReactionRemoved?: (messageId: string, isSender: boolean) => void;
}

export const MessageReactionsSheet = ({
  visible,
  onClose,
  message,
  onReactionRemoved,
}: MessageReactionsSheetProps) => {
  const { colors: themeColors } = useThemePreference();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const modalHeight = screenHeight * 0.4;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(modalHeight)).current;

  useEffect(() => {
    if (visible) {
      // Reset sheet position
      sheetTranslateY.setValue(modalHeight);
      // Animate overlay fade in and sheet slide up
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate overlay fade out and sheet slide down
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: modalHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, sheetTranslateY, modalHeight]);

  if (!message) {
    return null;
  }

  const reactions = [];
  if (message.senderReaction) {
    reactions.push({
      emoji: message.senderReaction,
      isSender: true,
      userName: message.isSent ? 'You' : 'Sender',
    });
  }
  if (message.recipientReaction) {
    reactions.push({
      emoji: message.recipientReaction,
      isSender: false,
      userName: !message.isSent ? 'You' : 'Recipient',
    });
  }

  const reactionCount = reactions.length;
  const title = reactionCount === 1 ? '1 Reaction' : `${reactionCount} Reactions`;

  const iconColor = themeColors.text;
  const dividerColor = themeColors.border;

  const handleRemoveReaction = async (isSender: boolean) => {
    if (!message) return;

    await removeReaction(message.id, isSender);
    onReactionRemoved?.(message.id, isSender);

    // Close sheet after removal
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              height: modalHeight,
              backgroundColor: themeColors.background,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
                backgroundColor: themeColors.background,
              },
            ]}
          >
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={onClose}
              size="md"
              color={iconColor}
            />
            <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
            <View style={styles.closeButton} />
          </View>

          {/* Reactions list */}
          <ScrollView style={styles.reactionsList} showsVerticalScrollIndicator={false}>
            {reactions.map((reaction, index) => (
              <View key={index}>
                <PressableOpacity
                  style={styles.reactionRow}
                  onPress={() => handleRemoveReaction(reaction.isSender)}
                >
                  {/* Profile picture placeholder */}
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: themeColors.surfaceSecondary },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: themeColors.text }]}>
                      {reaction.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Name and tap to remove */}
                  <View style={styles.reactionInfo}>
                    <Text style={[styles.userName, { color: themeColors.text }]}>
                      {reaction.userName}
                    </Text>
                    <Text style={[styles.tapToRemove, { color: themeColors.mutedText }]}>
                      Tap to remove
                    </Text>
                  </View>

                  {/* Emoji */}
                  <View style={styles.emojiContainer}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  </View>
                </PressableOpacity>

                {index < reactions.length - 1 && (
                  <View style={[styles.modalDivider, { backgroundColor: dividerColor }]} />
                )}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    ...typography.p5,
    fontWeight: '600',
  },
  reactionInfo: {
    flex: 1,
  },
  userName: {
    ...typography.p2,
    marginTop: 1,
  },
  tapToRemove: {
    ...typography.p6,
    marginTop: 2,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  modalDivider: {
    height: 1,
  },
});
