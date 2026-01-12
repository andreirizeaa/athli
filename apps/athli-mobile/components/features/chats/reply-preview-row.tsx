import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { X, Camera, Video, FileText } from 'lucide-react-native';
import { useColorScheme } from '@/stores';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { type ChatMessage } from '@/services/chats-service';

type ReplyPreviewRowProps = {
  message: ChatMessage;
  clientName: string;
  onClose: () => void;
  backgroundColor?: string;
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

export const ReplyPreviewRow = ({ message, clientName, onClose, backgroundColor }: ReplyPreviewRowProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Create translucent background color - more transparent since parent already has BlurView
  const translucentBg = backgroundColor ? hexToRgba(backgroundColor, 0.3) : hexToRgba(themeColors.headerBackground, 0.3);

  const senderName = message.isSent ? 'You' : clientName;
  // Use primary color for sender, and a distinct purple/violet for recipient
  const stripColor = message.isSent
    ? themeColors.primary
    : isDark ? '#A78BFA' : '#8B5CF6'; // Purple/violet that contrasts well with blue

  // Determine preview content based on message type
  const renderPreviewContent = () => {
    // If there's text, show it
    if (message.text && message.text.trim().length > 0) {
      return (
        <Text style={[styles.messagePreview, { color: themeColors.text }]} numberOfLines={1}>
          {message.text}
        </Text>
      );
    }

    // Check for images
    if (message.images && message.images.length > 0) {
      const imageCount = message.images.length;
      return (
        <View style={styles.attachmentPreview}>
          <PlatformIcon
            sf="camera.fill"
            IconComponent={Camera}
            size={iconSizes.tabBarIcons - 8}
            color={themeColors.text}
          />
          <Text style={[styles.attachmentText, { color: themeColors.text }]} numberOfLines={1}>
            {imageCount} image{imageCount > 1 ? 's' : ''}
          </Text>
        </View>
      );
    }

    // Check for video
    if (message.video) {
      return (
        <View style={styles.attachmentPreview}>
          <PlatformIcon
            sf="video.fill"
            IconComponent={Video}
            size={iconSizes.tabBarIcons - 8}
            color={themeColors.text}
          />
          <Text style={[styles.attachmentText, { color: themeColors.text }]} numberOfLines={1}>
            1 video
          </Text>
        </View>
      );
    }

    // Check for document
    if (message.document) {
      return (
        <View style={styles.attachmentPreview}>
          <PlatformIcon
            sf="doc.text.fill"
            IconComponent={FileText}
            size={iconSizes.tabBarIcons - 8}
            color={themeColors.text}
          />
          <Text style={[styles.attachmentText, { color: themeColors.text }]} numberOfLines={1}>
            {message.document.name}
          </Text>
        </View>
      );
    }

    // Check for audio
    if (message.audio) {
      return (
        <Text style={[styles.messagePreview, { color: themeColors.text }]} numberOfLines={1}>
          {`Audio message • ${formatAudioReplyStamp(message.timestamp)}`}
        </Text>
      );
    }

    // Fallback: show empty text
    return null;
  };

  return (
    <View
      style={[styles.container, { backgroundColor: translucentBg }]}
    >
      <View style={[styles.colorStrip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.senderName, { color: stripColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          {renderPreviewContent()}
        </View>
        <PressableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <PlatformIcon
            sf="xmark.circle"
            IconComponent={X}
            size={iconSizes.tabBarIcons - 2}
            color={themeColors.text}
          />
        </PressableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
  },
  colorStrip: {
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  senderName: {
    ...typography.p2,
    fontWeight: '600',
  },
  messagePreview: {
    ...typography.p3,
    fontSize: 13,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentText: {
    ...typography.p3,
    fontSize: 13,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});
