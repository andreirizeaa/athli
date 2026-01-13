import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Pressable, View, Text, ScrollView, Image as RNImage, Alert, Keyboard, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Download, Plus, Trash2, MoreHorizontal, CheckCircle2, Check } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import Share from 'react-native-share';

import { iconSizes, typography } from '@/constants/typography';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { IconButton } from '@/components/ui/icon-button';
import { type ImageAttachment } from '@/components/features/chats/message-image-preview';
import { AttachmentPreviewToolbar } from '@/components/features/camera/attachment-preview-toolbar';
import { sendImageMessage } from '@/services/chats-service';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useDarkModeTheme } from '@/components/ui/dark-mode-wrapper';
import { StatusBar } from 'expo-status-bar';

const ImagePreviewScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    images?: string; // JSON string of ImageAttachment[]
    senderName?: string;
    isSent?: string;
    chatId?: string;
    clientId?: string;
    clientName?: string;
    fromPicker?: string; // Flag to indicate this is from the picker
    messageTimestamp?: string; // ISO timestamp string for checking if within 1 hour
    caption?: string; // Initial caption text from chat input
  }>();

  const { colors: themeColors } = useDarkModeTheme();
  const insets = useSafeAreaInsets();
  const mutedSurfaceColor = themeColors.backgroundTertiary;
  const iconColor = themeColors.text;
  const showToolbar = fromPicker;

  const initialImages: ImageAttachment[] = params.images ? JSON.parse(params.images) : [];
  const senderName = params.senderName || 'Unknown';
  const isSent = params.isSent === 'true';
  const displayName = isSent ? 'You' : senderName;
  const fromPicker = params.fromPicker === 'true';
  const [caption, setCaption] = useState(params.caption || '');

  // Update caption when params change (for hydration)
  useEffect(() => {
    if (params.caption !== undefined) {
      setCaption(params.caption);
    }
  }, [params.caption]);
  const [images, setImages] = useState<ImageAttachment[]>(initialImages);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(initialImages[0]?.id || null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  const screenWidth = Dimensions.get('window').width;
  const thumbnailSize = 45;
  const addButtonWidth = 45;
  const horizontalPadding = 32; // 16 on each side
  const gap = 8;
  const scrollableWidth = screenWidth - addButtonWidth - horizontalPadding - gap;

  const selectedImage = images.find((img) => img.id === selectedImageId) || images[0];
  const inactiveBorderColor = '#FFFFFF';

  const handleClose = () => {
    if (fromPicker && params.chatId) {
      // If coming from attachment picker, go back to chat screen
      router.back();
    } else {
      router.back();
    }
  };

  const handleDownload = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share/download the first image
      await Sharing.shareAsync(images[0].uri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Download ${images.length === 1 ? 'image' : 'image'}`,
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const handleDownloadAll = async () => {
    try {
      if (images.length === 1) {
        // Single image - use expo-sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Error', 'Sharing is not available on this device');
          return;
        }
        await Sharing.shareAsync(images[0].uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Download image',
        });
      } else {
        // Multiple images - use react-native-share
        const uris = images.map((img) => img.uri);
        console.log('Sharing multiple images:', uris.length, uris);
        await Share.open({
          urls: uris,
          type: 'image/jpeg',
        }).catch((shareError: any) => {
          // Check if user cancelled
          const errorMessage = shareError?.message || shareError?.toString() || '';
          const errorCode = shareError?.code || '';
          console.log('Share error:', errorMessage, errorCode);

          if (errorMessage.includes('User did not share') ||
            errorMessage.includes('User cancelled') ||
            errorMessage.includes('cancelled') ||
            errorCode === 'E_USER_CANCELLED' ||
            errorCode === 'User did not share') {
            // User cancelled - silently ignore
            return;
          }
          // Real error - show alert
          console.error('Error sharing images:', shareError);
          Alert.alert('Error', 'Failed to share images. Please try again.');
        });
      }
    } catch (error: any) {
      console.error('Error in handleDownloadAll:', error);
      Alert.alert('Error', 'Failed to download images');
    }
  };

  const handleSelect = () => {
    setIsSelectionMode(true);
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedImageIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedImageIds.size === images.length) {
      // Deselect all
      setSelectedImageIds(new Set());
    } else {
      // Select all
      setSelectedImageIds(new Set(images.map((img) => img.id)));
    }
  };

  const handleImageSelect = (imageId: string) => {
    const newSelected = new Set(selectedImageIds);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImageIds(newSelected);
  };

  const handleDeleteSelected = () => {
    // TODO: Implement delete logic
    console.log('Delete selected:', Array.from(selectedImageIds));
  };

  const handleDownloadSelected = async () => {
    const selectedImages = images.filter((img) => selectedImageIds.has(img.id));
    if (selectedImages.length === 0) return;

    try {
      if (selectedImages.length === 1) {
        // Single image - use expo-sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Error', 'Sharing is not available on this device');
          return;
        }
        await Sharing.shareAsync(selectedImages[0].uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Download image',
        });
      } else {
        // Multiple images - use react-native-share
        const uris = selectedImages.map((img) => img.uri);
        console.log('Sharing selected images:', uris.length, uris);
        await Share.open({
          urls: uris,
          type: 'image/jpeg',
        }).catch((shareError: any) => {
          // Check if user cancelled
          const errorMessage = shareError?.message || shareError?.toString() || '';
          const errorCode = shareError?.code || '';
          if (errorMessage.includes('User did not share') ||
            errorMessage.includes('User cancelled') ||
            errorMessage.includes('cancelled') ||
            errorCode === 'E_USER_CANCELLED' ||
            errorCode === 'User did not share') {
            // User cancelled - silently ignore
            return;
          }
          // Real error - show alert
          console.error('Error sharing images:', shareError);
          Alert.alert('Error', 'Failed to share images. Please try again.');
        });
      }
    } catch (error: any) {
      console.error('Error in handleDownloadSelected:', error);
      Alert.alert('Error', 'Failed to share images');
    }
  };

  // Check if message is within 1 hour
  const isMessageWithinOneHour = (): boolean => {
    if (!params.messageTimestamp) return false;
    try {
      const messageTime = new Date(params.messageTimestamp);
      const now = new Date();
      const diffInMs = now.getTime() - messageTime.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      return diffInHours <= 1;
    } catch {
      return false;
    }
  };

  const canShowDelete = isSent && isMessageWithinOneHour();

  const handleDownloadAllFromDropdown = async () => {
    await handleDownloadAll();
  };

  const dropdownOptions: DropdownMenuOption[] = [
    {
      label: 'Select',
      icon: { sf: 'checkmark.circle', IconComponent: CheckCircle2 },
      onPress: handleSelect,
    },
    {
      label: 'Download all',
      icon: { sf: 'square.and.arrow.down', IconComponent: Download },
      onPress: handleDownloadAllFromDropdown,
    },
  ];

  const handleImagePress = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleDeletePress = (imageId: string, event: any) => {
    event.stopPropagation();
    const newImages = images.filter((img) => img.id !== imageId);
    setImages(newImages);
    if (selectedImageId === imageId) {
      setSelectedImageId(newImages[0]?.id || null);
    }
  };

  const handleAddMore = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your photos.');
        return;
      }

      // Get current image URIs to filter out duplicates
      const currentUris = images.map((img) => img.uri);

      // Open image picker with single selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.uri) return;

        // Check if this image is already in our list
        const existingImage = images.find((img) => img.uri === asset.uri);
        if (existingImage) {
          // Image already exists - just select it
          setSelectedImageId(existingImage.id);
          return;
        }

        // New image - add it to the list
        const newImage: ImageAttachment = {
          uri: asset.uri,
          id: `photo-${Date.now()}-${Math.random()}`,
        };

        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        setSelectedImageId(newImage.id);
      }
    } catch (error) {
      console.error('Error adding more images:', error);
      Alert.alert('Error', 'Failed to add images');
    }
  };

  const handleSend = async () => {
    if (!params.chatId) {
      console.error('No chatId provided');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    try {
      // Read all images as bytes
      const imageBytesArray = await Promise.all(
        images.map(async (image) => {
          const base64 = await FileSystem.readAsStringAsync(image.uri, {
            encoding: 'base64' as any,
          });

          // Convert base64 to Uint8Array
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          return bytes;
        })
      );

      // Send image message
      await sendImageMessage(
        params.chatId,
        imageBytesArray,
        caption.trim() || undefined
      );

      // Navigate back to chat screen - use back() to maintain slide animation
      if (fromPicker && params.chatId) {
        router.back();
      } else {
        router.back();
      }

      // Set params to add image message to list and close attachment picker
      setTimeout(() => {
        if (params.chatId) {
          router.setParams({
            imagesSent: 'true',
            sentImages: JSON.stringify(images),
            sentImagesCaption: caption.trim() || '',
          } as any);
        }
      }, 200);
    } catch (error) {
      console.error('Error sending images:', error);
      Alert.alert('Error', 'Failed to send images');
    }
  };

  // Viewing mode (not from picker) - show scrollable list
  if (!fromPicker) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
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
          {/* Top header */}
          <View style={styles.topHeader}>
            <View style={styles.leftHeaderContainer}>
              {isSelectionMode ? (
                <PressableOpacity
                  style={[styles.selectAllButton, { backgroundColor: mutedSurfaceColor }]}
                  onPress={handleSelectAll}
                >
                  <Text style={[styles.selectAllText, { color: iconColor }]} numberOfLines={1}>
                    {selectedImageIds.size === images.length ? 'Deselect all' : 'Select all'}
                  </Text>
                </PressableOpacity>
              ) : (
                <IconButton
                  icon={{ sf: 'xmark', IconComponent: X }}
                  onPress={handleClose}
                  size="md"
                  color={iconColor}
                />
              )}
            </View>

            {/* Center: Sender name and subtitle - absolutely positioned to stay centered */}
            <View style={styles.titleContainer}>
              <Text style={[styles.titleText, { color: themeColors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.subtitleText, { color: themeColors.mutedText }]}>
                {images.length} image{images.length > 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.rightHeaderContainer}>
              {isSelectionMode ? (
                <IconButton
                  icon={{ sf: 'checkmark', IconComponent: Check }}
                  onPress={handleExitSelectionMode}
                  size="md"
                  color={iconColor}
                />
              ) : (
                <>
                  {/* Download button - only show when there's a single image */}
                  {images.length === 1 && (
                    <PressableOpacity
                      style={[styles.downloadButton, { backgroundColor: themeColors.backgroundSecondary }]}
                      onPress={handleDownload}
                    >
                      <PlatformIcon
                        sf="square.and.arrow.down"
                        IconComponent={Download}
                        size={iconSizes.navigationChevrons}
                        color={iconColor}
                      />
                    </PressableOpacity>
                  )}
                  {/* Ellipsis button - show when there are multiple images */}
                  {images.length > 1 && (
                    <DropdownMenuWrapper options={dropdownOptions}>
                      <PressableOpacity
                        style={[styles.downloadButton, { backgroundColor: themeColors.backgroundSecondary }]}
                        onPress={() => { }}
                      >
                        <PlatformIcon
                          sf="ellipsis"
                          IconComponent={MoreHorizontal}
                          size={iconSizes.navigationChevrons}
                          color={iconColor}
                        />
                      </PressableOpacity>
                    </DropdownMenuWrapper>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Scrollable images */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60 }, // Start content below header
            isSelectionMode && { paddingBottom: 100 }, // Add padding for bottom actions
          ]}
          showsVerticalScrollIndicator={false}
        >
          {images.map((image, index) => {
            const isSelected = selectedImageIds.has(image.id);
            return (
              <Pressable
                key={image.id || index}
                style={[
                  styles.imageContainer,
                  isSelected && styles.imageContainerSelected,
                ]}
                onPress={() => isSelectionMode && handleImageSelect(image.id)}
              >
                {isSelectionMode && (
                  <View style={styles.imageCheckboxContainer}>
                    <View
                      style={[
                        styles.imageCheckbox,
                        {
                          borderColor: '#FFFFFF',
                          backgroundColor: isSelected ? themeColors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.imageCheckmark,
                            {
                              borderColor: themeColors.primaryForeground,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                )}
                <RNImage
                  source={{ uri: image.uri }}
                  style={[
                    styles.image,
                    isSelected && { opacity: 0.7 },
                  ]}
                  resizeMode="contain"
                />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Bottom selection actions - floating buttons centered */}
        {isSelectionMode && (
          <View
            style={[
              styles.bottomActions,
              {
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Download button */}
            <IconButton
              icon={{ sf: 'square.and.arrow.down', IconComponent: Download }}
              onPress={handleDownloadSelected}
              size="md"
              color={iconColor}
            />

            {/* Selected count (centered, not clickable) */}
            <View style={[styles.selectedCountButton, { backgroundColor: themeColors.backgroundSecondary }]}>
              <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                {selectedImageIds.size} item{selectedImageIds.size !== 1 ? 's' : ''} selected
              </Text>
            </View>

            {/* Trash button (only for sent messages within 1 hour) */}
            {canShowDelete && (
              <PressableOpacity
                style={[styles.closeButton, { backgroundColor: themeColors.backgroundSecondary }]}
                onPress={handleDeleteSelected}
              >
                <PlatformIcon
                  sf="trash"
                  IconComponent={Trash2}
                  size={iconSizes.navigationChevrons}
                  color={iconColor}
                />
              </PressableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // Picker mode - show camera preview style layout
  if (!selectedImage || images.length === 0) {
    return null;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {showToolbar && <StatusBar hidden />}
        <View style={styles.imagePreviewContainer}>
          <RNImage source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="contain" />
        </View>
        <View
          style={[
            styles.safeAreaPreview,
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
              onPress={handleClose}
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
          <View style={styles.addButtonWrapper}>
            <PressableOpacity
              style={[
                styles.addButtonContainer,
                {
                  borderColor: '#FFFFFF',
                  borderWidth: 2,
                },
              ]}
              onPress={handleAddMore}
            >
              <PlatformIcon sf="photo.badge.plus" IconComponent={Plus} size={24} color="#FFFFFF" />
            </PressableOpacity>
          </View>
        </View>

        {/* Bottom section with toolbar */}
        <AttachmentPreviewToolbar
          value={caption}
          onChangeText={setCaption}
          clientName={params.clientName}
          onSend={handleSend}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  safeAreaPreview: {
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
  leftHeaderContainer: {
    width: 120,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  rightHeaderContainer: {
    width: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 0,
    pointerEvents: 'none',
  },
  titleText: {
    ...typography.h5,
    fontWeight: '600',
  },
  subtitleText: {
    ...typography.p3,
    marginTop: 2,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
  },
  imageContainerSelected: {
    // Shadow removed
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  imageCheckboxContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  imageCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCheckmark: {
    width: 6,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginTop: -2,
  },
  selectAllButton: {
    minWidth: 100,
    maxWidth: 120,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectAllText: {
    ...typography.p1,
    fontWeight: '600',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
    zIndex: 20,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionButtonText: {
    ...typography.p2,
    fontWeight: '500',
  },
  selectedCountButton: {
    width: 140,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
  imagePreviewContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});

export default ImagePreviewScreen;
