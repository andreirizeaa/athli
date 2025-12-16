import React from 'react';
import { StyleSheet, Pressable, View, Text, Image as RNImage, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { type ThemeColors } from '@/constants/theme';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';
import { typography, iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';

export interface ImageAttachment {
  uri: string;
  id: string;
}

type MessageImagePreviewProps = {
  images: ImageAttachment[];
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
};

const screenWidth = Dimensions.get('window').width;
// Message bubble has maxWidth: '80%' and paddingHorizontal: 12px
// Calculate a safe image size that accounts for bubble padding
// Using a conservative approach: 75% of screen width minus padding
const BUBBLE_PADDING = 24; // 12px on each side
const IMAGE_SIZE = Math.floor(screenWidth * 0.75 - BUBBLE_PADDING);

export const MessageImagePreview = ({
  images,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
}: MessageImagePreviewProps) => {
  const imageCount = images.length;
  const hasMoreThanFour = imageCount > 4;
  const displayImages = hasMoreThanFour ? images.slice(0, 4) : images;
  const remainingCount = hasMoreThanFour ? imageCount - 4 : 0;

  // Gap between images - use parent bubble background color
  const GAP_SIZE = 4; // Increased from 2 to 4

  const renderImageGrid = () => {
    if (imageCount === 1) {
      // Single image: full width square
      return (
        <Pressable
          style={({ pressed }) => [
            styles.singleImageContainer,
            { backgroundColor: parentBackgroundColor },
            pressed && styles.pressed,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <RNImage source={{ uri: images[0].uri }} style={styles.singleImage} resizeMode="cover" />
        </Pressable>
      );
    }

    if (imageCount === 2) {
      // Two images: 2 rows, each 50% height
      return (
        <Pressable
          style={({ pressed }) => [
            styles.gridContainer,
            { backgroundColor: parentBackgroundColor },
            pressed && styles.pressed,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View style={[styles.twoImageRow, { height: (IMAGE_SIZE - GAP_SIZE) / 2, marginBottom: GAP_SIZE }]}>
            <RNImage source={{ uri: images[0].uri }} style={styles.gridImage} resizeMode="cover" />
          </View>
          <View style={[styles.twoImageRow, { height: (IMAGE_SIZE - GAP_SIZE) / 2 }]}>
            <RNImage source={{ uri: images[1].uri }} style={styles.gridImage} resizeMode="cover" />
          </View>
        </Pressable>
      );
    }

    if (imageCount === 3) {
      // Three images: first row 1 image, second row 2 images (50/50)
      return (
        <Pressable
          style={({ pressed }) => [
            styles.gridContainer,
            { backgroundColor: parentBackgroundColor },
            pressed && styles.pressed,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View style={[styles.threeImageFirstRow, { height: (IMAGE_SIZE - GAP_SIZE) / 2, marginBottom: GAP_SIZE }]}>
            <RNImage source={{ uri: images[0].uri }} style={styles.gridImage} resizeMode="cover" />
          </View>
          <View style={styles.threeImageSecondRow}>
            <View style={[styles.threeImageSecondRowItem, { height: (IMAGE_SIZE - GAP_SIZE) / 2, marginRight: GAP_SIZE }]}>
              <RNImage source={{ uri: images[1].uri }} style={styles.gridImage} resizeMode="cover" />
            </View>
            <View style={[styles.threeImageSecondRowItem, { height: (IMAGE_SIZE - GAP_SIZE) / 2 }]}>
              <RNImage source={{ uri: images[2].uri }} style={styles.gridImage} resizeMode="cover" />
            </View>
          </View>
        </Pressable>
      );
    }

    // 4 or more images: 2x2 grid
    return (
      <Pressable
        style={({ pressed }) => [
          styles.gridContainer,
          { backgroundColor: parentBackgroundColor },
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={[styles.fourImageRow, { marginBottom: GAP_SIZE }]}>
          <View style={[styles.fourImageItem, { height: (IMAGE_SIZE - GAP_SIZE) / 2, marginRight: GAP_SIZE }]}>
            <RNImage source={{ uri: displayImages[0].uri }} style={styles.gridImage} resizeMode="cover" />
          </View>
          <View style={[styles.fourImageItem, { height: (IMAGE_SIZE - GAP_SIZE) / 2 }]}>
            <RNImage source={{ uri: displayImages[1].uri }} style={styles.gridImage} resizeMode="cover" />
          </View>
        </View>
        <View style={styles.fourImageRow}>
          <View style={[styles.fourImageItem, { height: (IMAGE_SIZE - GAP_SIZE) / 2, marginRight: GAP_SIZE }]}>
            <RNImage source={{ uri: displayImages[2].uri }} style={styles.gridImage} resizeMode="cover" />
          </View>
          <View style={[styles.fourImageItem, { height: (IMAGE_SIZE - GAP_SIZE) / 2 }]}>
            <RNImage source={{ uri: displayImages[3].uri }} style={styles.gridImage} resizeMode="cover" />
            {hasMoreThanFour && (
              <>
                <BlurView
                  intensity={20}
                  style={styles.blurOverlay}
                  tint="dark"
                />
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{remainingCount}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      {renderImageGrid()}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'stretch',
    paddingBottom: 4,
  },
  singleImageContainer: {
    width: IMAGE_SIZE,
    maxWidth: '100%',
    height: IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  gridContainer: {
    width: IMAGE_SIZE,
    maxWidth: '100%',
    height: IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  twoImageRow: {
    width: '100%',
  },
  threeImageFirstRow: {
    width: '100%',
  },
  threeImageSecondRow: {
    flexDirection: 'row',
    width: '100%',
  },
  threeImageSecondRowItem: {
    flex: 1,
  },
  fourImageRow: {
    flexDirection: 'row',
    width: '100%',
    flex: 1,
  },
  fourImageItem: {
    flex: 1,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  moreImagesText: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.9,
  },
});

