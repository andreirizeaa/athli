import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image, Video, FileText, Camera } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

type AttachmentPickerRowProps = {
  backgroundColor?: string;
  hideVideos?: boolean;
  hideCamera?: boolean;
};

export const AttachmentPickerRow = ({ backgroundColor, hideVideos = false, hideCamera = false }: AttachmentPickerRowProps) => {
  const { colors: themeColors } = useThemePreference();

  const handlePhotoPress = () => {
    // TODO: Implement photo selection
  };

  const handleVideoPress = () => {
    // TODO: Implement video selection
  };

  const handleDocumentPress = () => {
    // TODO: Implement document selection
  };

  const handleCameraPress = () => {
    // TODO: Implement camera capture
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || themeColors.surfaceSecondary,
        },
      ]}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.attachmentButton}
          activeOpacity={0.7}
          onPress={handlePhotoPress}
          accessibilityLabel="Select photo"
          accessibilityRole="button"
        >
          <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
            <PlatformIcon
              sf="photo.on.rectangle"
              IconComponent={Image}
              size={iconSizes.tabBarIcons}
              color={themeColors.primary}
            />
          </View>
          <Text style={[styles.subtitle, { color: themeColors.text }]}>Photos</Text>
        </TouchableOpacity>

        {!hideVideos && (
          <TouchableOpacity
            style={styles.attachmentButton}
            activeOpacity={0.7}
            onPress={handleVideoPress}
            accessibilityLabel="Select video"
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
              <PlatformIcon
                sf="video"
                IconComponent={Video}
                size={iconSizes.tabBarIcons}
                color={themeColors.primary}
              />
            </View>
            <Text style={[styles.subtitle, { color: themeColors.text }]}>Videos</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.attachmentButton}
          activeOpacity={0.7}
          onPress={handleDocumentPress}
          accessibilityLabel="Select document"
          accessibilityRole="button"
        >
          <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
            <PlatformIcon
              sf="doc.text"
              IconComponent={FileText}
              size={iconSizes.tabBarIcons}
              color={themeColors.primary}
            />
          </View>
          <Text style={[styles.subtitle, { color: themeColors.text }]}>Documents</Text>
        </TouchableOpacity>

        {!hideCamera && (
          <TouchableOpacity
            style={styles.attachmentButton}
            activeOpacity={0.7}
            onPress={handleCameraPress}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
              <PlatformIcon
                sf="camera"
                IconComponent={Camera}
                size={iconSizes.tabBarIcons}
                color={themeColors.primary}
              />
            </View>
            <Text style={[styles.subtitle, { color: themeColors.text }]}>Camera</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 32,
  },
  attachmentButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...typography.p3,
    fontSize: 12,
  },
});
