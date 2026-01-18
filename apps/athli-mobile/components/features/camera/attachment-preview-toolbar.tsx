import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image as RNImage } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Send, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, type SharedValue, interpolate, Extrapolation } from 'react-native-reanimated';

import { iconSizes, typography } from '@/constants/typography';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { MessageInputBar } from '@/components/features/message/message-input-bar';
import { useDarkModeTheme } from '@/components/ui/dark-mode-wrapper';

type ImageItem = {
  uri: string;
  id: string;
};

type AttachmentPreviewToolbarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  keyboardHeight?: SharedValue<number>;
  // Gallery props
  images?: ImageItem[];
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string) => void;
  onDeleteImage?: (imageId: string, event: any) => void;
  onAddMore?: () => void;
  maxImages?: number;
};

const MAX_MEDIA_FILES = 4;

export const AttachmentPreviewToolbar = ({
  value,
  onChangeText,
  onSend,
  keyboardHeight,
  images,
  selectedImageId,
  onImageSelect,
  onDeleteImage,
  onAddMore,
  maxImages = MAX_MEDIA_FILES,
}: AttachmentPreviewToolbarProps) => {
  const { colors: themeColors } = useDarkModeTheme();
  const insets = useSafeAreaInsets();

  // Create translucent background color for frosted glass effect (60% opacity)
  const translucentHeaderBg = hexToRgba(themeColors.translucentBackground, 0.6);
  const hasGallery = images && images.length > 0;

  // Move toolbar up by keyboard height
  const toolbarAnimatedStyle = useAnimatedStyle(() => {
    const h = keyboardHeight?.value ?? 0;
    return {
      transform: [{ translateY: -h }],
    };
  });

  // Safe-area padding only when keyboard is closed
  const safePaddingStyle = useAnimatedStyle(() => {
    const h = keyboardHeight?.value ?? 0;
    const pb = interpolate(h, [0, 40], [insets.bottom + 8, 8], Extrapolation.CLAMP);
    return {
      paddingBottom: pb,
    };
  });

  // Hide background when keyboard is open
  const backgroundOpacityStyle = useAnimatedStyle(() => {
    const h = keyboardHeight?.value ?? 0;
    const opacity = interpolate(h, [0, 50], [1, 0], Extrapolation.CLAMP);
    return {
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.absoluteContainer, toolbarAnimatedStyle]} pointerEvents="box-none">
      {/* Background extension below toolbar - hidden when keyboard open */}
      <Animated.View style={[styles.backgroundWrapper, backgroundOpacityStyle]}>
        <View style={[styles.backgroundExtension, { backgroundColor: translucentHeaderBg }]} />
        <BlurView
          intensity={100}
          tint="dark"
          style={[styles.blurContainer, { backgroundColor: translucentHeaderBg }]}
        />
      </Animated.View>

      {/* Content always visible */}
      <Animated.View style={[styles.container, safePaddingStyle]}>
        {/* Image gallery row */}
        {hasGallery && (
          <View style={styles.galleryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScrollContent}
              style={styles.galleryScroll}
            >
              {images.map((image) => {
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
                    onPress={() => onImageSelect?.(image.id)}
                  >
                    <RNImage source={{ uri: image.uri }} style={styles.thumbnail} resizeMode="cover" />
                    {isSelected && (
                      <View style={styles.trashOverlay}>
                        <PressableOpacity
                          style={styles.trashButton}
                          onPress={(e) => onDeleteImage?.(image.id, e)}
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
            {onAddMore && images.length < maxImages && (
              <View style={styles.addButtonWrapper}>
                <PressableOpacity
                  style={styles.addButtonContainer}
                  onPress={onAddMore}
                >
                  <PlatformIcon sf="plus" IconComponent={Plus} size={20} color="#FFFFFF" />
                </PressableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Input row with send button on the right */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <MessageInputBar
              value={value}
              onChangeText={onChangeText}
              placeholder="Add a caption..."
              style={[styles.messageInputBar, { backgroundColor: themeColors.surfacePrimary, borderWidth: 1, borderColor: themeColors.border }]}
              textColor="#FFFFFF"
            />
          </View>

          <PressableOpacity
            style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
            onPress={onSend}
          >
            <PlatformIcon
              sf="paperplane.fill"
              IconComponent={Send}
              size={iconSizes.navigationChevrons + 2}
              color={themeColors.primaryForeground}
            />
          </PressableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundExtension: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 1000, // Large enough to fill below toolbar
  },
  blurContainer: {
    width: '100%',
    height: 200, // Tall enough to cover toolbar area
  },
  container: {
    width: '100%',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  messageInputBar: {
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Gallery styles
  galleryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    height: 45,
  },
  galleryScroll: {
    flexGrow: 0,
    flexShrink: 1,
    height: 45,
  },
  galleryScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
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
  addButtonWrapper: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonContainer: {
    width: 45,
    height: 45,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});

