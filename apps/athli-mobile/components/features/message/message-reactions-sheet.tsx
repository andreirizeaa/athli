import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import { removeReaction } from '@/services/chats-service';
import type { UIMessage, MessageReaction } from '@athli/shared-types';

interface ReactionUser {
  id: string;
  name: string;
  avatarUrl?: string;
  reaction: string;
  isCurrentUser: boolean;
}

interface MessageReactionsSheetProps {
  visible: boolean;
  onClose: () => void;
  message: UIMessage | null;
  currentUserId?: string;
  /** Name of the other user (client for coach view, coach for client view) */
  otherUserName?: string;
  /** Avatar URL of the other user */
  otherUserAvatarUrl?: string;
  /** Current user's name */
  currentUserName?: string;
  /** Current user's avatar URL */
  currentUserAvatarUrl?: string;
  onReactionRemoved?: (messageId: string) => void;
}

export const MessageReactionsSheet = ({
  visible,
  onClose,
  message,
  currentUserId,
  otherUserName = 'User',
  otherUserAvatarUrl,
  currentUserName = 'You',
  currentUserAvatarUrl,
  onReactionRemoved,
}: MessageReactionsSheetProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  if (!message || !visible) {
    return null;
  }

  // Extract reactions from the reactions array
  const reactions: ReactionUser[] = [];

  if (message.reactions && message.reactions.length > 0) {
    message.reactions.forEach((reaction: MessageReaction) => {
      const isCurrentUser = currentUserId ? reaction.user_id === currentUserId : false;
      const isSender = reaction.user_id === message.sender_id;

      // Determine name and avatar based on whether this is current user or other user
      let name: string;
      let avatarUrl: string | undefined;

      if (isCurrentUser) {
        name = currentUserName;
        avatarUrl = currentUserAvatarUrl;
      } else {
        name = otherUserName;
        avatarUrl = otherUserAvatarUrl;
      }

      reactions.push({
        id: reaction.user_id,
        name,
        avatarUrl,
        reaction: reaction.reaction,
        isCurrentUser,
      });
    });
  }

  const reactionCount = reactions.length;
  const title = reactionCount === 1
    ? `1 ${t('messages.reaction') || 'Reaction'}`
    : `${reactionCount} ${t('messages.reactions') || 'Reactions'}`;

  const handleRemoveReaction = async (reactionUser: ReactionUser) => {
    if (!message || !reactionUser.isCurrentUser) return;

    try {
      await removeReaction(message.id);
      onReactionRemoved?.(message.id);
      onClose();
    } catch (error) {
      console.error('[MessageReactionsSheet] Failed to remove reaction:', error);
    }
  };

  const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        {/* Tap outside to close */}
        <Pressable style={styles.overlay} onPress={onClose} />

        {/* Sheet content */}
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: themeColors.backgroundSecondary,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handleBar} />
            <Text style={[styles.title, { color: themeColors.text }]}>
              {title}
            </Text>
          </View>

          {/* Reactions list */}
          <View style={styles.reactionsList}>
            {reactions.map((reactionUser, index) => (
              <View key={`${reactionUser.id}-${index}`}>
                <PressableOpacity
                  style={styles.reactionRow}
                  onPress={() => handleRemoveReaction(reactionUser)}
                  disabled={!reactionUser.isCurrentUser}
                >
                  {/* Profile picture */}
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: themeColors.backgroundTertiary },
                    ]}
                  >
                    {reactionUser.avatarUrl ? (
                      <Image
                        source={{ uri: reactionUser.avatarUrl }}
                        style={styles.avatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={[styles.avatarText, { color: themeColors.text }]}>
                        {getInitials(reactionUser.name)}
                      </Text>
                    )}
                  </View>

                  {/* Name and tap to remove */}
                  <View style={styles.reactionInfo}>
                    <Text style={[styles.userName, { color: themeColors.text }]}>
                      {reactionUser.isCurrentUser ? (t('general.you') || 'You') : reactionUser.name}
                    </Text>
                    {reactionUser.isCurrentUser && (
                      <Text style={[styles.tapToRemove, { color: themeColors.mutedText }]}>
                        {t('messages.tapToRemove') || 'Tap to remove'}
                      </Text>
                    )}
                  </View>

                  {/* Emoji */}
                  <View style={styles.emojiContainer}>
                    <Text style={styles.reactionEmoji}>{reactionUser.reaction}</Text>
                  </View>
                </PressableOpacity>

                {index < reactions.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                )}
              </View>
            ))}

            {/* Empty state */}
            {reactions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                  {t('messages.noReactions') || 'No reactions yet'}
                </Text>
              </View>
            )}
          </View>
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 200,
    maxHeight: '50%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    marginBottom: 16,
  },
  title: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
  },
  reactionsList: {
    paddingHorizontal: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    ...typography.p3,
    fontWeight: '600',
  },
  reactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    ...typography.p2,
    fontWeight: '500',
  },
  tapToRemove: {
    ...typography.p5,
    marginTop: 2,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  divider: {
    height: 1,
    marginLeft: 56, // Align with content after avatar
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.p3,
  },
});
