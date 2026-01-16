import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Pressable, View, Keyboard, TouchableWithoutFeedback, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSharedValue } from 'react-native-reanimated';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';

import { IconButton } from '@/components/ui/icon-button';
import { AttachmentPreviewToolbar } from '@/components/features/camera/attachment-preview-toolbar';
import { useDarkModeTheme } from '@/components/ui/dark-mode-wrapper';
import { haptics } from '@/utils/haptics';

type ImageData = {
  uri: string;
  bytes: Uint8Array;
  id: string;
};

const MAX_MEDIA_FILES = 4;

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const pagerRef = useRef<PagerView>(null);
  const isProgrammaticChange = useRef(false);

  // Keyboard animation - use onMove for frame-by-frame tracking
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = event.height;
      },
      onEnd: (event) => {
        'worklet';
        keyboardHeight.value = event.height;
      },
    },
    []
  );

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const selectedImage = images?.find((img: ImageData) => img.id === selectedImageId) || images?.[0];

  // Helper functions for ID↔index conversion
  const getIndexFromId = (id: string | undefined) => {
    if (!id || !images) return 0;
    const index = images.findIndex((img) => img.id === id);
    return index >= 0 ? index : 0;
  };

  const getIdFromIndex = (index: number) => {
    return images?.[index]?.id;
  };

  // Sync pager when selectedImageId prop changes (from thumbnail tap)
  useEffect(() => {
    if (selectedImageId && images && images.length > 0) {
      const targetIndex = getIndexFromId(selectedImageId);
      pagerRef.current?.setPage(targetIndex);
    }
  }, [selectedImageId, images]);

  const handleImagePress = (imageId: string) => {
    isProgrammaticChange.current = true;
    const index = images?.findIndex((img) => img.id === imageId) ?? 0;
    pagerRef.current?.setPage(index);
    onImageSelected?.(imageId);
  };

  const handlePageSelected = (event: PagerViewOnPageSelectedEvent) => {
    const index = event.nativeEvent.position;
    const expectedIndex = getIndexFromId(selectedImageId);

    // Skip if this is a programmatic change (thumbnail tap)
    if (isProgrammaticChange.current) {
      if (index === expectedIndex) {
        isProgrammaticChange.current = false;
      }
      return;
    }

    // User swipe - update thumbnail selection
    const newId = getIdFromIndex(index);
    if (newId && newId !== selectedImageId) {
      haptics.selection();
      onImageSelected?.(newId);
    }
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
      <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
        <StatusBar hidden />
        <PagerView
          ref={pagerRef}
          style={StyleSheet.absoluteFill}
          initialPage={getIndexFromId(selectedImageId)}
          onPageSelected={handlePageSelected}
        >
          {images?.map((image) => (
            <View key={image.id} style={styles.pagerPage}>
              <RNImage source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </View>
          ))}
        </PagerView>

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
              scheme="light"
            />
          </View>
        </View>

        {/* Bottom section with toolbar (includes gallery) */}
        <AttachmentPreviewToolbar
          value={caption}
          onChangeText={onCaptionChange}
          clientName={clientName}
          onSend={onSend}
          keyboardHeight={keyboardHeight}
          images={images}
          selectedImageId={selectedImageId}
          onImageSelect={handleImagePress}
          onDeleteImage={handleDeletePress}
          onAddMore={onAddMore}
          maxImages={MAX_MEDIA_FILES}
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
  keyboardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 15,
  },
  pagerPage: {
    flex: 1,
  },
});

