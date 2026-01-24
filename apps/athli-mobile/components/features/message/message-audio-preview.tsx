import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Play, Pause, Square } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { WaveformPlayer, type IWaveformRef, PlayerState } from '@/components/features/audio';
import { iconSizes, typography } from '@/constants/typography';
import { type ThemeColors } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { type AudioAttachment } from '@/services/chats-service';

interface ExtendedWaveformRef extends IWaveformRef {
}

const waveformRefs = new Set<React.RefObject<ExtendedWaveformRef | null>>();

export const stopAllWaveformPlayers = async () => {
  const anyRef = Array.from(waveformRefs).find((r) => !!r.current);
  const current: any = anyRef?.current;
  if (current?.stopAllPlayers) {
    try {
      await current.stopAllPlayers();
      return;
    } catch { }
  }

  for (const r of waveformRefs) {
    try {
      await (r.current as any)?.stopPlayer?.();
    } catch { }
  }
};

// Simple in-memory cache for downloaded audio files
const downloadCache: Record<string, string> = {};

type MessageAudioPreviewProps = {
  audio: any;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
};

const withAlpha = (color: string, alpha: number) => {
  if (!color) return `rgba(0, 0, 0, ${alpha})`;

  if (color.startsWith('rgba(') || color.startsWith('rgb(')) return color;

  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatDuration = (ms: number | undefined) => {
  if (ms === undefined || ms === null || isNaN(ms)) {
    return '0:00';
  }
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Get duration in ms from audio object (handles both duration in ms and duration_seconds from DB)
const getAudioDurationMs = (audio: any): number | undefined => {
  // Check for duration in milliseconds (optimistic messages)
  if (typeof audio.duration === 'number' && !isNaN(audio.duration)) {
    return audio.duration;
  }
  // Check for duration_seconds from database (convert to ms)
  if (typeof audio.duration_seconds === 'number' && !isNaN(audio.duration_seconds)) {
    return audio.duration_seconds * 1000;
  }
  return undefined;
};

// Check if URI is a remote URL
const isRemoteUrl = (uri: string) => uri.startsWith('http://') || uri.startsWith('https://');

// Get file extension from URL (handling query params)
const getExtensionFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop();
    return ext && ext.length <= 5 ? ext : 'm4a';
  } catch {
    return 'm4a';
  }
};

// Generate a cache key from URL (hash the URL to avoid long filenames)
const getCacheKey = (url: string): string => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const MessageAudioPreview = ({
  audio,
  themeColors,
  parentBackgroundColor,
  isParentSent,
}: MessageAudioPreviewProps) => {
  const waveformRef = useRef<ExtendedWaveformRef>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.stopped);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    waveformRefs.add(waveformRef);
    return () => {
      waveformRefs.delete(waveformRef);
    };
  }, []);

  // Download remote audio to local cache
  useEffect(() => {
    const downloadAudio = async () => {
      console.log('[MessageAudioPreview] Starting download, audio object:', JSON.stringify(audio, null, 2));

      if (!audio.uri) {
        console.log('[MessageAudioPreview] No audio.uri, returning');
        return;
      }

      // If it's a local file, use it directly
      if (!isRemoteUrl(audio.uri)) {
        const path = audio.uri.startsWith('file://')
          ? audio.uri.replace('file://', '')
          : audio.uri;
        console.log('[MessageAudioPreview] Local file, using path:', path);
        setLocalPath(path);
        return;
      }

      // Check if already cached in memory
      const cacheKey = getCacheKey(audio.uri);
      if (downloadCache[cacheKey]) {
        const cachedPath = downloadCache[cacheKey];
        // Verify file still exists
        try {
          const info = await FileSystem.getInfoAsync(cachedPath);
          if (info.exists) {
            console.log('[MessageAudioPreview] Using cached file:', cachedPath);
            setLocalPath(cachedPath.replace('file://', ''));
            return;
          }
        } catch {}
      }

      // Download the file
      setIsDownloading(true);
      setDownloadError(false);

      try {
        // First do a HEAD request to get the actual content type
        const headResponse = await fetch(audio.uri, { method: 'HEAD' });
        const contentType = headResponse.headers.get('content-type') || '';

        // Map content type to extension
        let ext = 'm4a'; // default
        if (contentType.includes('wav')) ext = 'wav';
        else if (contentType.includes('webm')) ext = 'webm';
        else if (contentType.includes('mp4')) ext = 'm4a';
        else if (contentType.includes('mpeg') || contentType.includes('mp3')) ext = 'mp3';
        else if (contentType.includes('aac')) ext = 'aac';

        const localUri = `${FileSystem.cacheDirectory}audio-${cacheKey}.${ext}`;

        console.log('[MessageAudioPreview] Downloading from:', audio.uri);
        console.log('[MessageAudioPreview] Content-Type:', contentType);
        console.log('[MessageAudioPreview] Extension:', ext);
        console.log('[MessageAudioPreview] Saving to:', localUri);

        const downloadResult = await FileSystem.downloadAsync(audio.uri, localUri);

        console.log('[MessageAudioPreview] Download result:', {
          status: downloadResult.status,
          uri: downloadResult.uri,
          headers: downloadResult.headers,
        });

        if (downloadResult.status === 200) {
          const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
          console.log('[MessageAudioPreview] Downloaded file info:', fileInfo);

          downloadCache[cacheKey] = downloadResult.uri;
          setLocalPath(downloadResult.uri.replace('file://', ''));
        } else {
          console.warn('[MessageAudioPreview] Download failed with status:', downloadResult.status);
          setDownloadError(true);
        }
      } catch (e) {
        console.warn('[MessageAudioPreview] Failed to download audio:', e);
        setDownloadError(true);
      } finally {
        setIsDownloading(false);
      }
    };

    downloadAudio();
  }, [audio.uri]);

  const handleTogglePlay = async () => {
    const ref = waveformRef.current;
    if (!ref || !localPath) return;

    try {
      if (playerState === PlayerState.playing) {
        await ref.pausePlayer();
      } else if (playerState === PlayerState.paused) {
        await stopAllWaveformPlayers();
        await ref.resumePlayer();
      } else {
        await stopAllWaveformPlayers();
        await ref.startPlayer({ finishMode: 'stop' as any });
      }
    } catch (e) {
      console.warn('Failed to toggle audio playback:', e);
    }
  };

  const handleSpeedButtonPress = async () => {
    const speeds = [1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    setPlaybackSpeed(nextSpeed);

    await new Promise((r) => setTimeout(r, 0));

    const ref = waveformRef.current;
    if (!ref || !localPath) return;

    try {
      if (playerState === PlayerState.paused) {
        await stopAllWaveformPlayers();
        await ref.resumePlayer();
      } else if (playerState !== PlayerState.playing) {
        await stopAllWaveformPlayers();
        await ref.startPlayer({ finishMode: 'stop' as any });
      }
    } catch (e) {
      console.warn('Failed to start/resume audio from speed button:', e);
    }
  };

  const foregroundColor = isParentSent ? themeColors.primaryForeground : themeColors.text;
  const borderColor = withAlpha(foregroundColor, 0.55);
  const baseWaveColor = withAlpha(foregroundColor, 0.28);
  const scrubWaveColor = playerState === PlayerState.playing ? foregroundColor : baseWaveColor;

  // Show loading state while downloading or waiting for URI
  if (isDownloading || !audio.uri) {
    return (
      <View style={[styles.container, { borderColor }]}>
        <View style={styles.playButton}>
          <ActivityIndicator size="small" color={foregroundColor} />
        </View>
        <View style={styles.waveformContainer}>
          <View style={[styles.loadingBar, { backgroundColor: baseWaveColor }]} />
        </View>
        <View style={styles.durationButton}>
          <Text style={[styles.durationText, { color: foregroundColor }]}>
            {formatDuration(getAudioDurationMs(audio))}
          </Text>
        </View>
      </View>
    );
  }

  // Show error state if download failed
  if (downloadError || !localPath) {
    return (
      <View style={[styles.container, { borderColor, opacity: 0.5 }]}>
        <View style={styles.playButton}>
          <PlatformIcon
            sf="play.fill"
            IconComponent={Play}
            size={iconSizes.smallIcons}
            color={foregroundColor}
          />
        </View>
        <View style={styles.waveformContainer}>
          <Text style={[styles.errorText, { color: foregroundColor }]}>
            Audio unavailable
          </Text>
        </View>
        <View style={styles.durationButton}>
          <Text style={[styles.durationText, { color: foregroundColor }]}>
            {formatDuration(getAudioDurationMs(audio))}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { borderColor }]}
    >
      <PressableOpacity
        style={styles.playButton}
        onPress={handleTogglePlay}
      >
        <PlatformIcon
          sf={playerState === PlayerState.playing ? 'pause.fill' : 'play.fill'}
          IconComponent={playerState === PlayerState.playing ? Pause : Play}
          size={iconSizes.smallIcons}
          color={foregroundColor}
        />
      </PressableOpacity>

      <View style={styles.waveformContainer}>
        <WaveformPlayer
          ref={waveformRef}
          mode="static"
          path={localPath}
          playbackSpeed={playbackSpeed as any}
          candleWidth={3}
          candleSpace={2}
          waveColor={baseWaveColor}
          scrubColor={scrubWaveColor}
          onPlayerStateChange={(state: PlayerState) => setPlayerState(state)}
          onError={(e: Error) => {
            console.log('[MessageAudioPreview] waveform error:', e);
          }}
          style={styles.waveform}
        />
      </View>

      <PressableOpacity
        style={[styles.speedButton, { backgroundColor: withAlpha(foregroundColor, 0.14) }]}
        onPress={handleSpeedButtonPress}
      >
        <Text style={[styles.speedButtonText, { color: foregroundColor }]}>
          {playbackSpeed}x
        </Text>
      </PressableOpacity>

      <View
        style={styles.durationButton}
      >
        <Text style={[styles.durationText, { color: foregroundColor }]}>
          {formatDuration(getAudioDurationMs(audio))}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    borderWidth: 0.5,
    borderRadius: 18,
    paddingVertical: 0,
    paddingHorizontal: 4,
    height: 52,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  waveform: {
    height: 32,
    width: '100%',
  },
  loadingBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  errorText: {
    ...typography.p5,
    opacity: 0.7,
  },
  speedButton: {
    height: 28,
    minWidth: 40,
    paddingHorizontal: 4,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  speedButtonText: {
    ...typography.p5,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  durationButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  durationText: {
    ...typography.p2,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
});
