import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Alert } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Image, Video, FileText, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/platform-icon';

type AttachmentPickerRowProps = {
  backgroundColor?: string;
  hideVideos?: boolean;
  hideCamera?: boolean;
  chatId?: string;
  clientId?: string;
  clientName?: string;
  caption?: string;
};

export const AttachmentPickerRow = ({
  backgroundColor,
  hideVideos = false,
  hideCamera = false,
  chatId,
  clientId,
  clientName,
  caption = '',
}: AttachmentPickerRowProps) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Create translucent background color - more transparent since parent already has BlurView
  const translucentBg = backgroundColor ? hexToRgba(backgroundColor, 0.3) : hexToRgba(themeColors.headerBackground, 0.3);

  // WhatsApp-style colors for each attachment type
  const attachmentColors = {
    photos: '#7F66FF',   // Purple
    videos: '#25D366',   // Green
    documents: '#0088CC', // Blue
    camera: '#FF6B6B',   // Red/Coral
  };

  // Solid background for icon containers
  const iconBgColor = themeColors.primary + '20';

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handlePhotoPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your photos.');
        return;
      }

      // Open image picker for photos with multi-select enabled
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Convert selected images to ImageAttachment format
        const imageAttachments = result.assets
          .map((asset, index) => {
            if (!asset.uri) return null;
            return {
              uri: asset.uri,
              id: `photo-${Date.now()}-${index}-${Math.random()}`,
            };
          })
          .filter((img) => img !== null);

        if (imageAttachments.length > 0) {
          // Navigate to message-image-preview screen
          router.push({
            pathname: '/chats/message-image-preview',
            params: {
              images: JSON.stringify(imageAttachments),
              chatId: chatId || '',
              clientId: clientId || '',
              clientName: clientName || '',
              fromPicker: 'true', // Flag to indicate this is from the picker, not viewing a message
              caption: caption || '',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to load photos. Please try again.');
    }
  };

  const handleVideoPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your videos.');
        return;
      }

      // Open image picker for videos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          // Navigate to video preview screen
          router.push({
            pathname: '/chats/video-preview',
            params: {
              uri: asset.uri,
              duration: (asset.duration || 0).toString(),
              orientation: asset.width && asset.height && asset.width > asset.height ? 'landscape' : 'portrait',
              chatId: chatId || '',
              clientId: clientId || '',
              clientName: clientName || '',
              caption: caption || '',
              fromCamera: 'false',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
    }
  };

  const handleDocumentPress = async () => {
    try {
      // Open document picker - only allow PDFs
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Navigate to document preview screen
        router.push({
          pathname: '/chats/document-preview',
          params: {
            uri: asset.uri,
            name: asset.name || 'Document',
            mimeType: asset.mimeType || '',
            size: asset.size?.toString() || '',
            chatId: chatId || '',
            clientId: clientId || '',
            clientName: clientName || '',
            caption: caption || '',
          },
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleCameraPress = () => {
    router.push({
      pathname: '/camera/camera',
      params: {
        chatId: chatId || '',
        clientId: clientId || '',
        clientName: clientName || '',
        caption: caption || '',
      },
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: slideAnim,
        transform: [{ translateY }],
      }}
    >
      <View
        style={[styles.container, { backgroundColor: translucentBg }]}
      >
        <View style={styles.content}>
          <PressableOpacity
            style={styles.attachmentButton}
            onPress={handlePhotoPress}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
              <PlatformIcon
                sf="photo.on.rectangle"
                IconComponent={Image}
                size={iconSizes.tabBarIcons + 8}
                color={attachmentColors.photos}
              />
            </View>
            <Text style={[styles.subtitle, { color: themeColors.text }]}>Photos</Text>
          </PressableOpacity>

          {!hideVideos && (
            <PressableOpacity
              style={styles.attachmentButton}
              onPress={handleVideoPress}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                <PlatformIcon
                  sf="video"
                  IconComponent={Video}
                  size={iconSizes.tabBarIcons + 8}
                  color={attachmentColors.videos}
                />
              </View>
              <Text style={[styles.subtitle, { color: themeColors.text }]}>Videos</Text>
            </PressableOpacity>
          )}

          <PressableOpacity
            style={styles.attachmentButton}
            onPress={handleDocumentPress}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
              <PlatformIcon
                sf="doc.text"
                IconComponent={FileText}
                size={iconSizes.tabBarIcons + 8}
                color={attachmentColors.documents}
              />
            </View>
            <Text style={[styles.subtitle, { color: themeColors.text }]}>PDFs</Text>
          </PressableOpacity>

          {!hideCamera && (
            <PressableOpacity
              style={styles.attachmentButton}
              onPress={handleCameraPress}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                <PlatformIcon
                  sf="camera"
                  IconComponent={Camera}
                  size={iconSizes.tabBarIcons + 8}
                  color={attachmentColors.camera}
                />
              </View>
              <Text style={[styles.subtitle, { color: themeColors.text }]}>Camera</Text>
            </PressableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
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
