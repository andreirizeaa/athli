import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/contexts/useColorScheme';
import { type ThemeColors } from '@/constants/theme';
import { type ChatMessage } from '@/services/chats-service';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';
import { typography } from '@/constants/typography';

type MessageReplyPreviewProps = {
  replyTo: ChatMessage;
  clientName: string;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onPress: () => void;
};

export const MessageReplyPreview = ({
  replyTo,
  clientName,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
}: MessageReplyPreviewProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const senderName = replyTo.isSent ? 'You' : clientName;
  // Use primary color for sender, and a distinct purple/violet for recipient
  const stripColor = replyTo.isSent
    ? themeColors.primary
    : isDark
      ? '#A78BFA'
      : '#8B5CF6';

  // Make the background lighter or darker than the parent bubble
  // If parent is light, make it darker; if parent is dark, make it lighter
  const adjustedBackground = isLightColor(parentBackgroundColor)
    ? shadeHex(parentBackgroundColor, 0.1) // Darken light colors
    : tintHex(parentBackgroundColor, 0.15); // Lighten dark colors

  // Use the same text color as the parent message
  const messageTextColor = isParentSent
    ? themeColors.primaryForeground
    : themeColors.text;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: adjustedBackground }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Reply to ${senderName}`}
      accessibilityRole="button"
    >
      <View style={[styles.colorStrip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        <Text style={[styles.senderName, { color: stripColor }]} numberOfLines={1}>
          {senderName}
        </Text>
        <Text
          style={[
            styles.messagePreview,
            { color: messageTextColor },
          ]}
          numberOfLines={2}
        >
          {replyTo.text}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  colorStrip: {
    width: 3,
  },
  content: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagePreview: {
    ...typography.p3,
    fontSize: 16,
    lineHeight: 20,
  },
});
