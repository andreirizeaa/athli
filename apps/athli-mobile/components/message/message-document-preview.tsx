import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useColorScheme } from '@/contexts/useColorScheme';
import { type ThemeColors } from '@/constants/theme';
import { type DocumentAttachment } from '@/services/chats-service';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';
import { typography } from '@/constants/typography';

type MessageDocumentPreviewProps = {
  document: DocumentAttachment;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

export const MessageDocumentPreview = ({
  document,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
}: MessageDocumentPreviewProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Make the background lighter or darker than the parent bubble
  const adjustedBackground = isLightColor(parentBackgroundColor)
    ? shadeHex(parentBackgroundColor, 0.1) // Darken light colors
    : tintHex(parentBackgroundColor, 0.15); // Lighten dark colors

  // Use the same text color as the parent message
  const textColor = isParentSent ? themeColors.primaryForeground : themeColors.text;
  const subtitleColor = isParentSent ? themeColors.primaryForeground : themeColors.mutedText;

  const fileSize = formatFileSize(document.size);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: adjustedBackground }]}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={`Open document ${document.name}`}
      accessibilityRole="button"
    >
      <View style={styles.contentRow}>
        <Image
          source={require('@/assets/icons/pdf.png')}
          style={styles.pdfIcon}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Text style={[styles.fileName, { color: textColor }]}>
            {document.name}
          </Text>
          {fileSize ? (
            <Text style={[styles.fileSize, { color: subtitleColor }]}>
              {fileSize}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 6,
    borderRadius: 8,
    padding: 8,
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  pdfIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    ...typography.p2,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    ...typography.p3,
    fontSize: 12,
  },
});
