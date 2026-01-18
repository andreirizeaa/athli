import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { X, Reply, Play, FileText, Mic } from 'lucide-react-native';
import { useColorScheme, useTranslations } from '@/stores';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import type { MessageAttachment } from '@athli/shared-types';

type AttachmentWithLocalUri = MessageAttachment & { local_uri?: string };

type ReplyPreviewRowProps = {
  message: any;
  clientName: string;
  onClose: () => void;
  backgroundColor?: string;
  /** URL map for signed attachment URLs */
  attachmentUrlMap?: { [attachmentId: string]: string };
};

export const ReplyPreviewRow = ({ message, clientName, onClose, backgroundColor, attachmentUrlMap = {} }: ReplyPreviewRowProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslations();

  const yourselfLabel = t?.('messages.yourself') ?? 'You';
  const deletedMessageLabel = t?.('messages.deletedMessage') ?? 'Deleted message';
  const voiceNoteLabel = t?.('messages.voiceNote') ?? 'Voice note';

  // Create translucent background color
  const translucentBg = backgroundColor ? hexToRgba(backgroundColor, 0.3) : hexToRgba(themeColors.translucentBackground, 0.3);

  const senderName = message.isSent ? yourselfLabel : clientName;
  const stripColor = message.isSent
    ? themeColors.primary
    : isDark ? '#A78BFA' : '#8B5CF6';

  // Build unified thumbnail list
  // Use new attachments format if available, otherwise fall back to legacy fields
  type ThumbnailItem = { type: 'image' | 'video' | 'pdf'; uri?: string; id?: string };
  const thumbnailItems: ThumbnailItem[] = [];
  const attachments = message.attachments as AttachmentWithLocalUri[] | undefined;
  const hasNewFormat = attachments && attachments.length > 0;
  let hasAudio = false;

  if (hasNewFormat) {
    // New format: use attachments array
    attachments.forEach((att: AttachmentWithLocalUri) => {
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
    message.images?.forEach((img: any) => {
      thumbnailItems.push({ type: 'image', uri: img.data });
    });
    if (message.video) thumbnailItems.push({ type: 'video' });
    if (message.pdf || message.document) thumbnailItems.push({ type: 'pdf' });
    if (message.audio) hasAudio = true;
  }

  const hasVisualAttachments = thumbnailItems.length > 0;
  const displayedThumbnails = thumbnailItems.slice(0, 4);

  // Thumbnail background
  const thumbnailBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.container, { backgroundColor: translucentBg }]}>
      <View style={[styles.colorStrip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        <View style={styles.textContainer}>
          {/* Header with reply icon and sender name */}
          <View style={styles.header}>
            <PlatformIcon
              sf="arrowshape.turn.up.left.fill"
              IconComponent={Reply}
              size={12}
              color={themeColors.text}
              style={{ opacity: 0.7 }}
            />
            <Text style={[styles.senderName, { color: stripColor }]} numberOfLines={1}>
              {senderName}
            </Text>
          </View>

          {/* Content */}
          {message.is_deleted ? (
            <Text
              style={[styles.messagePreview, { color: themeColors.text, fontStyle: 'italic', opacity: 0.7 }]}
              numberOfLines={1}
            >
              {deletedMessageLabel}
            </Text>
          ) : (
            <>
              {/* Thumbnails row */}
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
                        <Text style={[styles.thumbnailPlaceholder, { color: themeColors.text }]}>IMG</Text>
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
                  <PlatformIcon
                    sf="mic.fill"
                    IconComponent={Mic}
                    size={12}
                    color={themeColors.text}
                    style={{ opacity: 0.7 }}
                  />
                  <Text style={[styles.audioLabel, { color: themeColors.text, opacity: 0.8 }]}>
                    {voiceNoteLabel}
                  </Text>
                </View>
              )}

              {/* Text row - single line with ellipsis */}
              {message.text && message.text.trim().length > 0 && (
                <Text
                  style={[styles.messagePreview, { color: themeColors.text, opacity: 0.8 }]}
                  numberOfLines={1}
                >
                  {message.text}
                </Text>
              )}
            </>
          )}
        </View>
        <PressableOpacity style={styles.closeButton} onPress={onClose}>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  textContainer: {
    flex: 1,
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
    marginTop: 2,
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
  },
  audioLabel: {
    fontSize: 12,
  },
  messagePreview: {
    ...typography.p4,
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});
