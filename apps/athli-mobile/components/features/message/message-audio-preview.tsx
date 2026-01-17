import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Play, Square } from 'lucide-react-native';
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

type MessageAudioPreviewProps = {
  audio: any;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
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

const formatDuration = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const MessageAudioPreview = ({
  audio,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onLongPress,
  onPressIn,
  onPressOut,
}: MessageAudioPreviewProps) => {
  const waveformRef = useRef<ExtendedWaveformRef>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.stopped);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  useEffect(() => {
    waveformRefs.add(waveformRef);
    return () => {
      waveformRefs.delete(waveformRef);
    };
  }, []);

  const handleTogglePlay = async () => {
    const ref = waveformRef.current;
    if (!ref) return;

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

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  const handleSpeedButtonPress = async () => {
    const speeds = [1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    setPlaybackSpeed(nextSpeed);

    // Let React apply the new playbackSpeed prop before we start/resume playback.
    await new Promise((r) => setTimeout(r, 0));

    // If not currently playing, act as a start/resume button too
    const ref = waveformRef.current;
    if (!ref) return;

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

  // Convert URI to waveform path format (remove file:// if present)
  const waveformPath = audio.uri.startsWith('file://') ? audio.uri.replace('file://', '') : audio.uri;

  return (
    <Pressable
      style={[styles.container, { borderColor }]}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <PressableOpacity
        style={styles.playButton}
        onLongPress={onLongPress}
        onPress={handleTogglePlay}
      >
        <PlatformIcon
          sf={playerState === PlayerState.playing ? 'pause.fill' : 'play.fill'}
          IconComponent={playerState === PlayerState.playing ? Square : Play}
          size={iconSizes.smallIcons}
          color={foregroundColor}
        />
      </PressableOpacity>

      <View style={styles.waveformContainer}>
        <WaveformPlayer
          ref={waveformRef}
          mode="static"
          path={waveformPath}
          playbackSpeed={playbackSpeed as any}
          candleWidth={3}
          candleSpace={2}
          waveColor={baseWaveColor}
          scrubColor={scrubWaveColor}
          onPlayerStateChange={(state: PlayerState) => setPlayerState(state)}
          onError={(e: Error) => {
            console.log('waveform error:', e);
          }}
          style={styles.waveform}
        />
      </View>

      <PressableOpacity
        style={[styles.speedButton, { backgroundColor: withAlpha(foregroundColor, 0.14) }]}
        onLongPress={onLongPress}
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
          {formatDuration(audio.duration)}
        </Text>
      </View>
    </Pressable>
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

