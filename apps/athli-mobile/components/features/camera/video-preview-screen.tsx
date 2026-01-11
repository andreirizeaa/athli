import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, View, Text, Alert, Keyboard } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import * as Sharing from 'expo-sharing';
import { X, Play, Download } from 'lucide-react-native';

import { iconSizes, typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { IconButton } from '@/components/ui/icon-button';
import { AttachmentPreviewToolbar } from '@/components/features/camera/attachment-preview-toolbar';
import { sendVideoMessage } from '@/services/chats-service';
import { useDarkModeTheme } from '@/components/ui/dark-mode-wrapper';

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
    fromCamera?: string; // 'true' if coming from in-app camera
    senderName?: string;
    isSent?: string;
    caption?: string; // Initial caption text from chat input
  }>();

  const { colors: themeColors } = useDarkModeTheme();
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const [caption, setCaption] = useState(params.caption || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  if (!params.uri) {
    return null;
  }

  const video: VideoData = {
    uri: params.uri,
    duration: params.duration ? parseInt(params.duration, 10) : 0,
    orientation: (params.orientation as 'portrait' | 'landscape') || 'portrait',
  };

  const fromMessage = params.fromMessage === 'true';
  const fromCamera = params.fromCamera === 'true';
  const showToolbar = !fromMessage;
  const senderName = params.senderName || 'Unknown';
  const isSent = params.isSent === 'true';
  const displayName = isSent ? 'You' : senderName;

  // Create video player
  const player = useVideoPlayer(video.uri, (player) => {
    // Pause video initially to show thumbnail
    player.pause();
  });

  // Listen to playing state changes
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoPress = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleClose = () => {
    if (fromMessage || !params.chatId) {
      // Viewing from message or no chat context: just close preview
      router.back();
      return;
    }

    if (fromCamera) {
      // Came from in-app camera: close preview and camera, return to chat
      router.back();
      router.back();
      return;
    }

    // Came from attachment picker: only close preview and return to chat
    router.back();
  };

  const handleDownload = async () => {
    if (!video.uri) return;

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

      // Navigate back after sending
      if (!params.chatId) {
        // No chat context, just close preview
        router.back();
      } else if (fromCamera) {
        // From in-app camera: close preview and camera, return to chat
        router.back();
        router.back();
      } else {
        // From attachment picker: just close preview and return to chat
        router.back();
      }

      // Set params after a delay to ensure navigation completes
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

  const videoMarginTop = 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {showToolbar && <StatusBar hidden />}
      <VideoView
        player={player}
        style={[
          styles.video,
          video.orientation === 'portrait' ? styles.videoPortrait : styles.videoLandscape,
          {
            marginTop: videoMarginTop,
            marginBottom: 0,
            paddingBottom: 0,
          },
        ]}
        contentFit="contain"
        allowsPictureInPicture={false}
      />

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
        pointerEvents="box-none"
      >
        {/* Top header */}
        <View style={styles.topHeader} pointerEvents="box-none">
          <View style={styles.leftHeaderContainer}>
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={handleClose}
              size="md"
              scheme="light"
            />
          </View>

          {/* Center: Title - absolutely positioned to stay centered */}
          <View style={styles.titleContainer}>
            {fromMessage ? (
              <>
                <Text style={[styles.titleText, { color: themeColors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.subtitleText, { color: themeColors.mutedText }]}>
                  1 video
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.rightHeaderContainer}>
            {fromMessage ? (
              <PressableOpacity
                style={[styles.downloadButton, { backgroundColor: mutedSurfaceColor }]}
                onPress={handleDownload}
              >
                <PlatformIcon
                  sf="square.and.arrow.down"
                  IconComponent={Download}
                  size={iconSizes.navigationChevrons + 2}
                  color={iconColor}
                />
              </PressableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>
        </View>
      </View>

      {/* Play button overlay - centered */}
      {!isPlaying && !isKeyboardVisible && (
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

      {/* Keyboard overlay - blocks video interaction when keyboard is open */}
      {isKeyboardVisible && (
        <Pressable
          style={styles.keyboardOverlay}
          onPress={Keyboard.dismiss}
        />
      )}

      {/* Video tap area */}
      {!isKeyboardVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleVideoPress}
        />
      )}
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  leftHeaderContainer: {
    width: 120,
    alignItems: 'flex-start',
  },
  rightHeaderContainer: {
    width: 120,
    alignItems: 'flex-end',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  spacer: {
    width: 44,
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
  keyboardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 15, // Above video but below toolbar
  },
});
