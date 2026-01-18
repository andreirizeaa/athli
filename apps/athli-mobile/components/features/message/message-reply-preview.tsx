import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Camera, Video, FileText } from 'lucide-react-native';
import { useColorScheme } from '@/stores';
import { type ThemeColors } from '@/constants/theme';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';
import { typography, iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/ui/platform-icon';

type MessageReplyPreviewProps = {
  replyTo: any;
  clientName: string;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
};

const formatAudioReplyStamp = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86400000);

  if (diffDays === 0) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  if (diffDays === 1) return 'Yesterday';

  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d);
  const day = new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
  return `${weekday} ${day} ${month}`;
};

export const MessageReplyPreview = ({
  replyTo,
  clientName,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
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

  // Determine preview content based on message type
  const renderPreviewContent = () => {
    // Check if the replied-to message was deleted
    if (replyTo.is_deleted) {
      return (
        <Text
          style={[
            styles.messagePreview,
            { color: messageTextColor, fontStyle: 'italic', opacity: 0.7 },
          ]}
          numberOfLines={1}
        >
          Deleted message
        </Text>
      );
    }

    // Check for images
    if (replyTo.images && replyTo.images.length > 0) {
      const imageCount = replyTo.images.length;
      return (
        <View style={styles.attachmentPreview}>
          <PlatformIcon
            sf="camera.fill"
            IconComponent={Camera}
            size={iconSizes.tabBarIcons - 8}
            color={messageTextColor}
          />
          <Text style={[styles.attachmentText, { color: messageTextColor }]} numberOfLines={1}>
            {imageCount} photo{imageCount > 1 ? 's' : ''}
          </Text>
        </View>
      );
    }

    // Check for video
    if (replyTo.video) {
      return (
        <Text style={[styles.messagePreview, { color: messageTextColor }]} numberOfLines={1}>
          1 video
        </Text>
      );
    }

    // Check for document
    if (replyTo.document) {
      return (
        <View style={styles.attachmentPreview}>
          <PlatformIcon
            sf="doc.text.fill"
            IconComponent={FileText}
            size={iconSizes.tabBarIcons - 8}
            color={messageTextColor}
          />
          <Text style={[styles.attachmentText, { color: messageTextColor }]} numberOfLines={1}>
            {replyTo.document.name}
          </Text>
        </View>
      );
    }

    // Check for audio
    if (replyTo.audio) {
      return (
        <Text style={[styles.messagePreview, { color: messageTextColor }]} numberOfLines={1}>
          {`Audio message • ${formatAudioReplyStamp(replyTo.sent_at)}`}
        </Text>
      );
    }

    // Default: show text preview
    return (
      <Text
        style={[
          styles.messagePreview,
          { color: messageTextColor },
        ]}
        numberOfLines={2}
      >
        {replyTo.text}
      </Text>
    );
  };

  return (
    <PressableOpacity
      style={[styles.container, { backgroundColor: adjustedBackground }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.colorStrip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        <Text style={[styles.senderName, { color: stripColor }]} numberOfLines={1}>
          {senderName}
        </Text>
        {renderPreviewContent()}
      </View>
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentText: {
    ...typography.p3,
    fontSize: 16,
    lineHeight: 20,
    flex: 1,
  },
});
