import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import * as Sharing from 'expo-sharing';
import { X, Play, Download } from 'lucide-react-native';

import { iconSizes, typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { AttachmentPreviewToolbar } from '@/components/camera/attachment-preview-toolbar';
import { sendVideoMessage } from '@/services/chats-service';

type VideoData = {
  uri: string;
  duration: number;
  orientation: 'portrait' | 'landscape';
};

export const VideoPreviewScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    uri?: string;
    duration?: string;
    orientation?: 'portrait' | 'landscape';
    chatId?: string;
    clientId?: string;
    clientName?: string;
    fromMessage?: string; // 'true' if viewing from message bubble
  }>();

  const { colors: themeColors } = useThemePreference();
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const [caption, setCaption] = useState('');

  const video: VideoData | null = params.uri
    ? {
        uri: params.uri,
        duration: params.duration ? parseInt(params.duration, 10) : 0,
        orientation: (params.orientation as 'portrait' | 'landscape') || 'portrait',
      }
    : null;

  const fromMessage = params.fromMessage === 'true';
  const showToolbar = !fromMessage;

  // Create video player (only if video exists)
  const player = useVideoPlayer(video?.uri || '', (player) => {
    // Pause video initially to show thumbnail
    if (player) {
      player.pause();
    }
  });

  // Listen to playing state changes
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoPress = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleDownload = async () => {
    if (!video?.uri) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(video.uri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Download video',
      });
    } catch (error: any) {
      console.error('Error sharing video:', error);
      Alert.alert('Error', 'Failed to share video');
    }
  };

  const handleSend = async () => {
    if (!video || !params.chatId) return;

    try {
      await sendVideoMessage(params.chatId, video.uri, caption.trim() || undefined);
      router.back();
      setTimeout(() => {
        if (params.chatId) {
          router.setParams({
            videoSent: 'true',
            sentVideo: JSON.stringify({
              uri: video.uri,
              duration: video.duration,
              orientation: video.orientation,
              caption: caption.trim() || '',
            }),
          } as any);
        }
      }, 200);
    } catch (error) {
      console.error('Error sending video:', error);
      Alert.alert('Error', 'Failed to send video');
    }
  };

  const headerHeight = insets.top + 60; // Safe area + header content
  const toolbarHeight = showToolbar ? 112 : 0; // AttachmentPreviewToolbar closedBaseHeight
  const bottomMargin = showToolbar ? toolbarHeight + insets.bottom : 0;
  const paddingBottom = fromMessage ? 56 : 0;

  // For portrait videos, start underneath the header
  const videoMarginTop = video.orientation === 'portrait' ? headerHeight : 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <VideoView
        player={player}
        style={[
          styles.video,
          video.orientation === 'portrait' ? styles.videoPortrait : styles.videoLandscape,
          {
            marginTop: videoMarginTop,
            marginBottom: bottomMargin,
            paddingBottom: paddingBottom,
          },
        ]}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']} pointerEvents="box-none">
        {/* Top header */}
        <View style={styles.topHeader} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleClose}
          >
            <PlatformIcon sf="xmark" IconComponent={X} size={iconSizes.navigationChevrons} color={iconColor} />
          </TouchableOpacity>

          {fromMessage && (
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: mutedSurfaceColor }]}
              activeOpacity={0.7}
              onPress={handleDownload}
            >
              <PlatformIcon
                sf="square.and.arrow.down"
                IconComponent={Download}
                size={iconSizes.navigationChevrons + 2}
                color={iconColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Play button overlay - centered */}
      {!isPlaying && (
        <View style={styles.playButtonOverlay} pointerEvents="none">
          <View style={[styles.playButton, { backgroundColor: mutedSurfaceColor }]}>
            <PlatformIcon sf="play.fill" IconComponent={Play} size={32} color={iconColor} />
          </View>
        </View>
      )}

      {/* Bottom section with toolbar (only if not from message) */}
      {showToolbar && (
        <View style={styles.toolbarWrapper} pointerEvents="box-none">
          <AttachmentPreviewToolbar
            value={caption}
            onChangeText={setCaption}
            clientName={params.clientName}
            onSend={handleSend}
          />
        </View>
      )}

      {/* Video tap area */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleVideoPress}
      />
    </View>
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
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    ...typography.p2,
    fontWeight: '600',
  },
  video: {
    flex: 1,
  },
  videoPortrait: {
    width: '100%',
    height: '100%',
  },
  videoLandscape: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
