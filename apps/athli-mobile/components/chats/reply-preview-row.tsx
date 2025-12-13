import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useColorScheme } from '@/contexts/useColorScheme';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { type ChatMessage } from '@/services/chats-service';

type ReplyPreviewRowProps = {
  message: ChatMessage;
  clientName: string;
  onClose: () => void;
  backgroundColor?: string;
};

export const ReplyPreviewRow = ({ message, clientName, onClose, backgroundColor }: ReplyPreviewRowProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const senderName = message.isSent ? 'You' : clientName;
  // Use primary color for sender, and a distinct purple/violet for recipient
  const stripColor = message.isSent 
    ? themeColors.primary 
    : isDark ? '#A78BFA' : '#8B5CF6'; // Purple/violet that contrasts well with blue

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || themeColors.surfaceSecondary,
        },
      ]}
    >
      <View style={[styles.colorStrip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.senderName, { color: stripColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[styles.messagePreview, { color: themeColors.text }]} numberOfLines={1}>
            {message.text}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.7}
          onPress={onClose}
          accessibilityLabel="Close reply"
          accessibilityRole="button"
        >
          <PlatformIcon
            sf="xmark.circle"
            IconComponent={X}
            size={iconSizes.tabBarIcons - 2}
            color={themeColors.text}
          />
        </TouchableOpacity>
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
  closeButton: {
    padding: 4,
  },
});
