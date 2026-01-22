import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Reply, Play, FileText, Mic } from 'lucide-react-native';
import { useColorScheme, useTranslations } from '@/stores';
import { type ThemeColors } from '@/constants/theme';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';
import { typography } from '@/constants/typography';
import { PlatformIcon } from '@/components/ui/platform-icon';
import type { MessageAttachment } from '@athli/shared-types';

type AttachmentWithLocalUri = MessageAttachment & { local_uri?: string };

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
  /** URL map for signed attachment URLs */
  attachmentUrlMap?: { [attachmentId: string]: string };
};

export const MessageReplyPreview = ({
  replyTo,
  clientName,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
  onLongPress,
  attachmentUrlMap = {},
}: MessageReplyPreviewProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslations();

  const yourselfLabel = t?.('messages.yourself') ?? 'You';
  const deletedMessageLabel = t?.('messages.deletedMessage') ?? 'Deleted message';
  const voiceNoteLabel = t?.('messages.voiceNote') ?? 'Voice note';

  const senderName = replyTo.isSent ? yourselfLabel : clientName;

  // Strip color based on who sent the original message
  const stripColor = replyTo.isSent
    ? isParentSent
      ? isDark
        ? shadeHex(themeColors.primary, 0.3)
        : tintHex(themeColors.primary, 0.4)
      : themeColors.primary
    : isDark
      ? '#A78BFA'
      : '#8B5CF6';

  // Background color - lighter/darker than parent
  const adjustedBackground = isLightColor(parentBackgroundColor)
    ? shadeHex(parentBackgroundColor, 0.1)
    : tintHex(parentBackgroundColor, 0.15);

  // Text color based on parent
  const textColor = isParentSent
    ? themeColors.primaryForeground
    : themeColors.text;

  // Build unified thumbnail list
  // Use new attachments format if available, otherwise fall back to legacy fields
  type ThumbnailItem = { type: 'image' | 'video' | 'pdf'; uri?: string; id?: string };
  const thumbnailItems: ThumbnailItem[] = [];
  const attachments = replyTo.attachments as AttachmentWithLocalUri[] | undefined;
  const hasNewFormat = attachments && attachments.length > 0;
  let hasAudio = false;

  if (hasNewFormat) {
    // New format: use attachments array
    attachments.forEach(att => {
      if (att.mime_type?.startsWith('image/')) {
        const uri = att.local_uri || attachmentUrlMap[att.id] || undefined;
        thumbnailItems.push({ type: 'image', uri, id: att.id });
      } else if (att.mime_type?.startsWith('video/')) {
        thumbnailItems.push({ type: 'video', id: att.id });
      } else if (att.mime_type === 'application/pdf') {
        thumbnailItems.push({ type: 'pdf', id: att.id });
      } else if (att.mime_type?.startsWith('audio/')) {
        hasAudio = true;
      }
    });
  } else {
    // Legacy format: use individual fields
    replyTo.images?.forEach((img: any) => {
      thumbnailItems.push({ type: 'image', uri: img.data });
    });
    if (replyTo.video) thumbnailItems.push({ type: 'video' });
    if (replyTo.pdf || replyTo.document) thumbnailItems.push({ type: 'pdf' });
    if (replyTo.audio) hasAudio = true;
  }

  const hasVisualAttachments = thumbnailItems.length > 0;
  const displayedThumbnails = thumbnailItems.slice(0, 4);

  // Thumbnail background color
  const thumbnailBg = isParentSent
    ? 'rgba(255,255,255,0.2)'
    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <PressableOpacity
      style={[styles.container, { backgroundColor: adjustedBackground }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.colorStrip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        {/* Header with reply icon and sender name */}
        <View style={styles.header}>
          <View style={{ opacity: 0.7 }}>
            <PlatformIcon
              sf="arrowshape.turn.up.left.fill"
              IconComponent={Reply}
              size={12}
              color={textColor}
            />
          </View>
          <Text style={[styles.senderName, { color: stripColor }]} numberOfLines={1}>
            {senderName}
          </Text>
        </View>

        {/* Content */}
        {replyTo.is_deleted ? (
          <Text
            style={[styles.messagePreview, { color: textColor, fontStyle: 'italic', opacity: 0.7 }]}
            numberOfLines={1}
          >
            {deletedMessageLabel}
          </Text>
        ) : (
          <>
            {/* Thumbnails row - square thumbnails for images, videos, PDFs */}
            {hasVisualAttachments && (
              <View style={styles.thumbnailsRow}>
                {displayedThumbnails.map((item, idx) => (
                  <View key={idx} style={[styles.thumbnail, { backgroundColor: thumbnailBg }]}>
                    {item.type === 'image' && item.uri && (
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    )}
                    {item.type === 'image' && !item.uri && (
                      <Text style={[styles.thumbnailPlaceholder, { color: textColor }]}>IMG</Text>
                    )}
                    {item.type === 'video' && (
                      <View style={styles.videoOverlay}>
                        <View style={styles.playCircle}>
                          <PlatformIcon
                            sf="play.fill"
                            IconComponent={Play}
                            size={8}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    )}
                    {item.type === 'pdf' && (
                      <View style={styles.pdfThumbnail}>
                        <PlatformIcon
                          sf="doc.text.fill"
                          IconComponent={FileText}
                          size={12}
                          color={isDark ? '#FB923C' : '#EA580C'}
                        />
                      </View>
                    )}
                  </View>
                  ))}
                </View>
              )}

            {/* Voice note indicator */}
            {hasAudio && (
              <View style={styles.audioRow}>
                <View style={{ opacity: 0.7 }}>
                  <PlatformIcon
                    sf="mic.fill"
                    IconComponent={Mic}
                    size={12}
                    color={textColor}
                  />
                </View>
                <Text style={[styles.audioLabel, { color: textColor, opacity: 0.8 }]}>
                  {voiceNoteLabel}
                </Text>
              </View>
            )}

            {/* Text row - single line with ellipsis */}
            {replyTo.text && (
              <Text
                style={[styles.messagePreview, { color: textColor, opacity: 0.8 }]}
                numberOfLines={1}
              >
                {replyTo.text}
              </Text>
            )}
          </>
        )}
      </View>
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: 140,
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  colorStrip: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    fontSize: 8,
    opacity: 0.5,
  },
  pdfThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
  },
  videoOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.6)',
  },
  playCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 1,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  audioLabel: {
    fontSize: 12,
  },
  messagePreview: {
    ...typography.p4,
    fontSize: 13,
    lineHeight: 18,
  },
});
