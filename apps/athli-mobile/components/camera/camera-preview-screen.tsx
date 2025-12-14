import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Keyboard, TouchableWithoutFeedback, Image as RNImage, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Trash2 } from 'lucide-react-native';

import { iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { CameraPreviewToolbar } from '@/components/camera/camera-preview-toolbar';

type ImageData = {
  uri: string;
  bytes: Uint8Array;
  id: string;
};

type CameraPreviewScreenProps = {
  images: ImageData[];
  selectedImageId: string;
  caption: string;
  onCaptionChange: (text: string) => void;
  clientName?: string;
  onClose: () => void;
  onSend: () => void;
  onAddMore: () => void;
  onImageSelected: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
};

export const CameraPreviewScreen = ({
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
}: CameraPreviewScreenProps) => {
  const { colors: themeColors } = useThemePreference();
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const thumbnailSize = 45;
  const addButtonWidth = 45;
  const horizontalPadding = 32; // 16 on each side
  const gap = 8;
  const scrollableWidth = screenWidth - addButtonWidth - horizontalPadding - gap;

  const selectedImage = images.find((img) => img.id === selectedImageId) || images[0];
  const inactiveBorderColor = '#FFFFFF';

  const handleImagePress = (imageId: string) => {
    onImageSelected(imageId);
  };

  const handleDeletePress = (imageId: string, event: any) => {
    event.stopPropagation();
    onDeleteImage(imageId);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <RNImage source={{ uri: selectedImage.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Top header - only X button */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: mutedSurfaceColor }]}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <PlatformIcon sf="xmark" IconComponent={X} size={iconSizes.navigationChevrons} color={iconColor} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Image gallery row above toolbar */}
        <View style={styles.galleryContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryScrollContent}
            style={styles.galleryScroll}
          >
            {images.map((image) => {
              const isSelected = selectedImageId === image.id;
              return (
                <TouchableOpacity
                  key={image.id}
                  style={[
                    styles.thumbnailContainer,
                    {
                      borderColor: isSelected ? themeColors.primary : inactiveBorderColor,
                      borderWidth: 2,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleImagePress(image.id)}
                >
                <RNImage source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
                {isSelected && (
                  <View style={styles.trashOverlay}>
                    <TouchableOpacity
                      style={styles.trashButton}
                      activeOpacity={0.7}
                      onPress={(e) => handleDeletePress(image.id, e)}
                    >
                      <PlatformIcon
                        sf="trash"
                        IconComponent={Trash2}
                        size={18}
                        color={iconColor}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
            })}
          </ScrollView>
          <View style={styles.addButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.addButtonContainer,
                {
                  borderColor: inactiveBorderColor,
                  borderWidth: 2,
                },
              ]}
              activeOpacity={0.7}
              onPress={onAddMore}
            >
              <PlatformIcon sf="photo.badge.plus" IconComponent={Plus} size={24} color={inactiveBorderColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom section with toolbar */}
        <CameraPreviewToolbar
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
    paddingHorizontal: 20,
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
});

