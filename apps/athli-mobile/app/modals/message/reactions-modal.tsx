import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import { removeReaction } from '@/services/chats-service';
import { IconButton } from '@/components/ui/icon-button';

interface ReactionData {
  id: string;
  name: string;
  avatarUrl?: string;
  reaction: string;
  isCurrentUser: boolean;
}

export default function ReactionsModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const params = useLocalSearchParams<{
    messageId: string;
    reactions: string;
    currentUserId: string;
    otherUserName: string;
    otherUserAvatarUrl?: string;
    currentUserName?: string;
    currentUserAvatarUrl?: string;
  }>();

  // Parse reactions from params
  const reactions: ReactionData[] = React.useMemo(() => {
    if (!params.reactions) return [];
    try {
      const parsed = JSON.parse(params.reactions);
      return parsed.map((r: any) => ({
        id: r.user_id,
        name: r.user_id === params.currentUserId
          ? (params.currentUserName || t('general.you'))
          : (params.otherUserName || 'User'),
        avatarUrl: r.user_id === params.currentUserId
          ? params.currentUserAvatarUrl
          : params.otherUserAvatarUrl,
        reaction: r.reaction,
        isCurrentUser: r.user_id === params.currentUserId,
      }));
    } catch {
      return [];
    }
  }, [params.reactions, params.currentUserId, params.otherUserName, params.otherUserAvatarUrl, params.currentUserName, params.currentUserAvatarUrl, t]);

  const reactionCount = reactions.length;
  const title = reactionCount === 1
    ? `1 ${t('messages.reaction') || 'Reaction'}`
    : `${reactionCount} ${t('messages.reactions') || 'Reactions'}`;

  const handleRemoveReaction = async (reactionUser: ReactionData) => {
    if (!params.messageId || !reactionUser.isCurrentUser) return;

    try {
      await removeReaction(params.messageId);
      router.back();
    } catch (error) {
      console.error('[ReactionsModal] Failed to remove reaction:', error);
    }
  };

  const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {title}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Reactions list */}
      <View style={styles.reactionsList}>
        {reactions.map((reactionUser, index) => (
          <View key={`${reactionUser.id}-${index}`}>
            <PressableOpacity
              style={styles.reactionRow}
              onPress={() => handleRemoveReaction(reactionUser)}
              enabled={reactionUser.isCurrentUser}
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

      {/* Bottom padding for safe area */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  reactionsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
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
    marginLeft: 56,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.p3,
  },
  bottomPadding: {
    height: 40,
  },
});
