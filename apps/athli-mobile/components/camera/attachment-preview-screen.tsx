import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Pressable, View, Keyboard, TouchableWithoutFeedback, Image as RNImage, ScrollView, Dimensions } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, Plus, Trash2 } from 'lucide-react-native';

import { iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';
import { AttachmentPreviewToolbar } from '@/components/camera/attachment-preview-toolbar';
import { useDarkModeTheme } from '../dark-mode-wrapper';

type ImageData = {
  uri: string;
  bytes: Uint8Array;
  id: string;
};

type AttachmentPreviewScreenProps = {
  images?: ImageData[];
  selectedImageId?: string;
  caption: string;
  onCaptionChange: (text: string) => void;
  clientName?: string;
  onClose: () => void;
  onSend: () => void;
  onAddMore?: () => void;
  onImageSelected?: (imageId: string) => void;
  onDeleteImage?: (imageId: string) => void;
};

export const AttachmentPreviewScreen = ({
  images,
  selectedImageId,
  caption,
  onCaptionChange,
  clientName,
  onClose,
  onSend,
  onAddMore,
  onImageSelected,
  onDeleteImage,
}: AttachmentPreviewScreenProps) => {
  const { colors: themeColors } = useDarkModeTheme();
  const insets = useSafeAreaInsets();
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const screenWidth = Dimensions.get('window').width;
  const thumbnailSize = 45;
  const addButtonWidth = 45;
  const horizontalPadding = 32; // 16 on each side
  const gap = 8;
  const scrollableWidth = screenWidth - addButtonWidth - horizontalPadding - gap;

  const selectedImage = images?.find((img: ImageData) => img.id === selectedImageId) || images?.[0];
  const inactiveBorderColor = '#FFFFFF';

  const handleImagePress = (imageId: string) => {
    onImageSelected?.(imageId);
  };

  const handleDeletePress = (imageId: string, event: any) => {
    event.stopPropagation();
    onDeleteImage?.(imageId);
  };

  // Image preview mode
  if (!images || images.length === 0 || !selectedImage) {
    return null;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar hidden />
        <RNImage source={{ uri: selectedImage.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

        {/* Keyboard overlay - blocks image interaction when keyboard is open */}
        {isKeyboardVisible && (
          <Pressable
            style={styles.keyboardOverlay}
            onPress={Keyboard.dismiss}
          />
        )}
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            },
          ]}
        >
          {/* Top header - only X button */}
          <View style={styles.topHeader}>
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={onClose}
              size="md"
              color={iconColor}
            />
          </View>
        </View>

        {/* Image gallery row above toolbar */}
        <View style={styles.galleryContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryScrollContent}
            style={styles.galleryScroll}
          >
            {images.map((image: ImageData) => {
              const isSelected = selectedImageId === image.id;
              return (
                <PressableOpacity
                  key={image.id}
                  style={[
                    styles.thumbnailContainer,
                    {
                      borderColor: '#FFFFFF',
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleImagePress(image.id)}
                >
                  <RNImage source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
                  {isSelected && (
                    <View style={styles.trashOverlay}>
                      <PressableOpacity
                        style={styles.trashButton}
                        onPress={(e) => handleDeletePress(image.id, e)}
                      >
                        <PlatformIcon
                          sf="trash"
                          IconComponent={Trash2}
                          size={18}
                          color="#FFFFFF"
                        />
                      </PressableOpacity>
                    </View>
                  )}
                </PressableOpacity>
              );
            })}
          </ScrollView>
          {onAddMore && (
            <View style={styles.addButtonWrapper}>
              <PressableOpacity
                style={[
                  styles.addButtonContainer,
                  {
                    borderColor: inactiveBorderColor,
                    borderWidth: 2,
                  },
                ]}
                onPress={onAddMore}
              >
                <PlatformIcon sf="photo.badge.plus" IconComponent={Plus} size={24} color={inactiveBorderColor} />
              </PressableOpacity>
            </View>
          )}
        </View>

        {/* Bottom section with toolbar */}
        <AttachmentPreviewToolbar
          value={caption}
          onChangeText={onCaptionChange}
          clientName={clientName}
          onSend={onSend}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
    height: 45,
  },
  galleryScroll: {
    flex: 1,
    marginRight: 8,
    height: 45,
  },
  galleryScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 53, // Space for add button (45 + 8 gap)
    height: 45,
  },
  thumbnailContainer: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  addButtonWrapper: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  trashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonContainer: {
    width: 45,
    height: 45,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toolbarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 15, // Above image but below toolbar
  },
});

