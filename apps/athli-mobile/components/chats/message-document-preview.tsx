import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Eye } from 'lucide-react-native';
import { useColorScheme } from '@/contexts/useColorScheme';
import { type ThemeColors } from '@/constants/theme';
import { type DocumentAttachment } from '@/services/chats-service';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';
import { typography, iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';

type MessageDocumentPreviewProps = {
  document: DocumentAttachment;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onPress: () => void;
};

const getFileTypeFromMime = (mimeType: string, fileName: string): string => {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'DOCX';
  if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) return 'XLSX';
  if (mimeType.includes('presentationml') || mimeType.includes('ms-powerpoint')) return 'PPTX';
  if (mimeType === 'text/plain') return 'TXT';
  if (mimeType === 'text/csv') return 'CSV';
  if (mimeType === 'application/rtf') return 'RTF';
  
  // Fallback to file extension
  const ext = fileName.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
};

export const MessageDocumentPreview = ({
  document,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
}: MessageDocumentPreviewProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Make the background lighter or darker than the parent bubble
  const adjustedBackground = isLightColor(parentBackgroundColor)
    ? shadeHex(parentBackgroundColor, 0.1) // Darken light colors
    : tintHex(parentBackgroundColor, 0.15); // Lighten dark colors

  // Use the same text color as the parent message
  const textColor = isParentSent ? themeColors.primaryForeground : themeColors.text;
  const iconColor = isParentSent ? themeColors.primaryForeground : themeColors.text;

  const fileType = getFileTypeFromMime(document.mimeType, document.name);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: adjustedBackground }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Open document ${document.name}`}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
          {document.name}
        </Text>
        <View style={styles.rightSection}>
          <View style={[styles.fileTypeBadge, { backgroundColor: adjustedBackground }]}>
            <Text style={[styles.fileTypeText, { color: textColor }]}>{fileType}</Text>
          </View>
          <PlatformIcon
            sf="eye"
            IconComponent={Eye}
            size={iconSizes.tabBarIcons - 4}
            color={iconColor}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 8,
    padding: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fileName: {
    ...typography.p2,
    flex: 1,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  fileTypeText: {
    ...typography.p3,
    fontSize: 10,
    fontWeight: '600',
  },
});
