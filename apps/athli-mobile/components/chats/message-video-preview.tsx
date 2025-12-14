import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, View, Image as RNImage, Dimensions } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { type ThemeColors } from '@/constants/theme';
import { typography, iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';
import { Play } from 'lucide-react-native';

export interface VideoAttachment {
  uri: string;
  thumbnailUri?: string;
  duration: number;
  orientation: 'portrait' | 'landscape';
}

type MessageVideoPreviewProps = {
  video: VideoAttachment;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onPress: () => void;
};

const screenWidth = Dimensions.get('window').width;
// Message bubble has maxWidth: '80%' and paddingHorizontal: 12px
// Calculate a safe video size that accounts for bubble padding
const BUBBLE_PADDING = 24; // 12px on each side
const VIDEO_SIZE = Math.floor(screenWidth * 0.75 - BUBBLE_PADDING);

export const MessageVideoPreview = ({
  video,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onPress,
}: MessageVideoPreviewProps) => {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(video.thumbnailUri || null);

  useEffect(() => {
    const generateThumbnail = async () => {
      // If thumbnail already exists, use it
      if (video.thumbnailUri) {
        setThumbnailUri(video.thumbnailUri);
        return;
      }

      // Generate thumbnail from video
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, {
          time: 1000, // 1 second into the video
          quality: 0.8,
        });
        setThumbnailUri(uri);
      } catch (error) {
        console.error('Error generating video thumbnail:', error);
        // Fallback to video URI if thumbnail generation fails
        setThumbnailUri(video.uri);
      }
    };

    generateThumbnail();
  }, [video.uri, video.thumbnailUri]);

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.videoContainer,
          { backgroundColor: parentBackgroundColor },
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        {thumbnailUri && (
          <RNImage
            source={{ uri: thumbnailUri }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
        )}
        {/* Shadow overlay to make play button stand out */}
        <View style={styles.shadowOverlay} />
        {/* Play button overlay - centered */}
        <View style={styles.playButtonOverlay} pointerEvents="none">
          <View style={[styles.playButton, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
            <PlatformIcon sf="play.fill" IconComponent={Play} size={32} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'stretch',
    paddingBottom: 4,
  },
  videoContainer: {
    width: VIDEO_SIZE,
    maxWidth: '100%',
    height: VIDEO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    // Slight shadow to make play button stand out
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    // Additional shadow for play button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pressed: {
    opacity: 0.9,
  },
});
