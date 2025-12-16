import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { RotateCcw, Square, Play, Send, Trash2 } from 'lucide-react-native';
import { WaveformPlayer, type IWaveformRef, PlayerState } from '@/components/audio';

import { iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { hexToRgba } from '@/utils/colorUtils';

type VoiceNoteRecordingContainerProps = {
  isStopped: boolean;
  durationLabel: string;
  waveform: number[];
  previewPath: string | null;
  previewPlayerState: PlayerState;
  onPlayerStateChange: (state: PlayerState) => void;
  onTogglePreviewPlay: () => void;
  previewWaveRef: React.RefObject<IWaveformRef | null>;
  onTrashPress: () => void;
  onStopToggle: () => Promise<string | null | void>;
  onSendPress: (pathOverride?: string | null) => void;
};

export const VoiceNoteRecordingContainer = ({
  isStopped,
  durationLabel,
  waveform,
  previewPath,
  previewPlayerState,
  onPlayerStateChange,
  onTogglePreviewPlay,
  previewWaveRef,
  onTrashPress,
  onStopToggle,
  onSendPress,
}: VoiceNoteRecordingContainerProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const iconColor = themeColors.text;
  const [pillWidth, setPillWidth] = React.useState(0);
  // Initialize with safe left position to prevent overflow
  const [timerPillLeft, setTimerPillLeft] = React.useState(8);
  const [isPositioned, setIsPositioned] = React.useState(false);
  const trashButtonRef = React.useRef<View>(null);
  const containerRef = React.useRef<View>(null);

  const measureTrashButton = React.useCallback(() => {
    if (!trashButtonRef.current || !containerRef.current) return;
    
    trashButtonRef.current.measureInWindow((x: number, y: number, width: number) => {
      containerRef.current?.measureInWindow((containerX: number) => {
        const trashCenterX = x - containerX + width / 2;
        const MIN_LEFT = 8; // Minimum padding from left edge
        let calculatedLeft: number;
        
        if (pillWidth > 0) {
          calculatedLeft = trashCenterX - pillWidth / 2;
        } else {
          // If pill width not measured yet, use approximate position
          calculatedLeft = trashCenterX - 40; // Approximate pill width
        }
        
        // Ensure timer doesn't overflow left edge
        setTimerPillLeft(Math.max(MIN_LEFT, calculatedLeft));
        setIsPositioned(true);
      });
    });
  }, [pillWidth]);

  // Measure once when component mounts and when pill width changes
  React.useEffect(() => {
    // Small delay to ensure layout is complete
    const timer = setTimeout(() => {
      measureTrashButton();
    }, 50);
    return () => clearTimeout(timer);
  }, [measureTrashButton]);

  // Also measure when trash button layout changes
  const handleTrashLayout = React.useCallback(() => {
    measureTrashButton();
  }, [measureTrashButton]);

  return (
    <View ref={containerRef} style={styles.container}>
      <View style={styles.topRow}>
        {isStopped ? (
          // ✅ STOPPED PREVIEW TOP ROW
          <View style={[styles.previewPill, { backgroundColor: themeColors.surface, borderColor: themeColors.border || 'rgba(0, 0, 0, 0.1)' }]}>
            <TouchableOpacity
              style={styles.playButton}
              activeOpacity={0.7}
              onPress={onTogglePreviewPlay}
            >
              <PlatformIcon
                sf={previewPlayerState === PlayerState.playing ? "pause.fill" : "play.fill"}
                IconComponent={previewPlayerState === PlayerState.playing ? Square : Play}
                size={20}
                color={themeColors.text}
              />
            </TouchableOpacity>

            <View style={styles.previewWaveformWrap}>
              {!!previewPath ? (
                <WaveformPlayer
                  ref={previewWaveRef}
                  mode="static"
                  path={previewPath}
                  candleWidth={3}
                  candleSpace={2}
                  scrubColor="white"
                  onPlayerStateChange={onPlayerStateChange}
                  onError={(e: any) => {
                    console.log('waveform error:', e);
                  }}
                  style={{ height: 32, width: '100%' }}
                />
              ) : (
                <View style={{ height: 32, flex: 1 }} />
              )}
            </View>

            <Text style={[styles.previewDurationText, { color: themeColors.text }]}>
              {durationLabel}
            </Text>
          </View>
        ) : (
          // ✅ RECORDING TOP ROW (existing timer pill + conveyor waveform)
          <>
            <BlurView
              intensity={80}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={[
                styles.timerPill,
                {
                  backgroundColor: hexToRgba(themeColors.headerBackground, 0.35),
                  left: timerPillLeft,
                  opacity: isPositioned || pillWidth > 0 ? 1 : 0,
                },
              ]}
              onLayout={(e) => {
                const width = e.nativeEvent.layout.width;
                if (width > 0 && width !== pillWidth) {
                  setPillWidth(width);
                }
              }}
            >
              <Text style={[styles.timerText, { color: themeColors.text }]}>
                {durationLabel}
              </Text>
            </BlurView>

            <View style={[styles.waveformWrap, { paddingLeft: Math.max(pillWidth + 8, timerPillLeft + pillWidth + 8) }]}>
              {waveform.map((a, idx) => {
                const isSilent = a < 0.03;
                if (isSilent) return <View key={idx} style={styles.dot} />;

                const h = 6 + Math.round(a * 22);
                return <View key={idx} style={[styles.bar, { height: h }]} />;
              })}
            </View>
          </>
        )}
      </View>
      <View style={styles.bottomRow}>
        <TouchableOpacity
          ref={trashButtonRef}
          style={styles.trashButton}
          activeOpacity={0.7}
          onPress={onTrashPress}
          onLayout={handleTrashLayout}
        >
          <PlatformIcon
            sf="trash"
            IconComponent={Trash2}
            size={iconSizes.tabBarIcons}
            color={iconColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerButton}
          activeOpacity={0.7}
          onPress={onStopToggle}
        >
          <PlatformIcon
            sf={isStopped ? "arrow.counterclockwise" : "stop.fill"}
            IconComponent={isStopped ? RotateCcw : Square}
            size={iconSizes.tabBarIcons}
            color="#EF4444"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
          activeOpacity={0.7}
          onPress={async () => {
            const pathFromStop = !isStopped ? await onStopToggle() : undefined;
            onSendPress(typeof pathFromStop === 'string' ? pathFromStop : undefined);
          }}
        >
          <PlatformIcon
            sf="paperplane.fill"
            IconComponent={Send}
            size={iconSizes.tabBarIcons}
            color={themeColors.primaryForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
  },
  topRow: {
    position: 'relative',
    minHeight: 68,
    width: '100%',
    justifyContent: 'center',
    overflow: 'hidden', // ✅ clip overflow so waveform grows left, not right
  },
  timerPill: {
    position: 'absolute',
    left: 8, // Default safe position
    top: 18,
    height: 32,
    marginLeft: -14,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 2,
    minWidth: 60, // Ensure minimum width to prevent layout shift
  },
  timerText: {
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  waveformWrap: {
    width: '100%',
    height: 68,
    paddingRight: 0,
    paddingVertical: 10,
    marginLeft: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end', // ✅ anchor to right edge
    alignItems: 'center',
    flexWrap: 'nowrap', // ✅ single line
    overflow: 'hidden', // ✅ clip left overflow (under/behind timer pill)
    gap: 2,
    zIndex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  trashButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPill: {
    height: 52,
    width: '100%',
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWaveformWrap: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  previewDurationText: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
});
