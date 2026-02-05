import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, InteractionManager } from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { PressableOpacity } from 'pressto';
import { Image, Video, FileText, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';

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
  const { t } = useTranslations();
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Create translucent background color - more transparent since parent already has BlurView
  const translucentBg = backgroundColor ? hexToRgba(backgroundColor, 0.3) : hexToRgba(themeColors.translucentBackground, 0.3);

  // Maximum number of media files allowed per message
  const MAX_MEDIA_FILES = 4;

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        setErrorMessage('Please grant permission to access your photos.');
        setShowErrorDialog(true);
        return;
      }

      // Open image picker for photos with multi-select enabled (limited to 4)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA_FILES,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Enforce max limit (in case selectionLimit isn't respected on some platforms)
        const selectedAssets = result.assets.slice(0, MAX_MEDIA_FILES);

        // Convert selected images to ImageAttachment format
        const imageAttachments = selectedAssets
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
      setErrorMessage('Failed to load photos. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleVideoPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Please grant permission to access your videos.');
        setShowErrorDialog(true);
        return;
      }

      // Open image picker for videos with multi-select enabled
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA_FILES,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Enforce max limit
        const selectedAssets = result.assets.slice(0, MAX_MEDIA_FILES);

        // Convert selected videos to MediaAttachment format with thumbnails
        const videoAttachments = await Promise.all(
          selectedAssets.map(async (asset, index) => {
            if (!asset.uri) return null;

            // Generate thumbnail for the video
            let thumbnailUri: string | undefined;
            try {
              const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, {
                time: 500,
                quality: 0.8,
              });
              thumbnailUri = thumbnail.uri;
            } catch (thumbnailError) {
              console.warn('Failed to generate video thumbnail:', thumbnailError);
            }

            return {
              uri: asset.uri,
              id: `video-${Date.now()}-${index}-${Math.random()}`,
              isVideo: true,
              thumbnailUri,
            };
          })
        );

        const validAttachments = videoAttachments.filter((v) => v !== null);

        if (validAttachments.length > 0) {
          // Navigate to message-image-preview screen (unified preview)
          router.push({
            pathname: '/chats/message-image-preview',
            params: {
              images: JSON.stringify(validAttachments),
              chatId: chatId || '',
              clientId: clientId || '',
              clientName: clientName || '',
              fromPicker: 'true',
              caption: caption || '',
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

  const handleCameraPress = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage(t('camera.permissionMessage'));
      setShowErrorDialog(true);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';

      // Wait for JS bridge to fully restore after returning from native camera
      InteractionManager.runAfterInteractions(async () => {
        if (isVideo) {
          // Generate thumbnail for the video
          let thumbnailUri: string | undefined;
          try {
            const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, {
              time: 500,
              quality: 0.8,
            });
            thumbnailUri = thumbnail.uri;
          } catch (thumbnailError) {
            console.warn('Failed to generate video thumbnail:', thumbnailError);
          }

          const videoAttachment = {
            uri: asset.uri,
            id: `video-${Date.now()}-${Math.random()}`,
            isVideo: true,
            thumbnailUri,
          };
          router.push({
            pathname: '/chats/message-image-preview',
            params: {
              images: JSON.stringify([videoAttachment]),
              chatId: chatId || '',
              clientId: clientId || '',
              clientName: clientName || '',
              fromPicker: 'true',
              caption: caption || '',
            },
          });
        } else {
          const imageAttachment = {
            uri: asset.uri,
            id: `photo-${Date.now()}-${Math.random()}`,
          };
          router.push({
            pathname: '/chats/message-image-preview',
            params: {
              images: JSON.stringify([imageAttachment]),
              chatId: chatId || '',
              clientId: clientId || '',
              clientName: clientName || '',
              fromPicker: 'true',
              caption: caption || '',
            },
          });
        }
      });
    }
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

        <Dialog
          visible={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          title={t('general.error')}
          message={errorMessage}
          showCloseIcon={false}
          buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
        />
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
