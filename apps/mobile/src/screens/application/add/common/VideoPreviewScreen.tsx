import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Asset } from 'expo-asset';
import { useTutorialTarget } from '../../../../context/TutorialContext';
import { generateVideoThumbnailWithMetadata } from '../../../../utils/generateVideoThumbnail';
import { track } from '../../../../services/analytics';
import i18n from '../../../../utils/i18n';

interface VideoPreviewScreenProps {
  videoUri: string | number;
  onSelectNewVideo: () => void;
  onContinue: () => void;
  onClose: () => void;
  title?: string;
  selectNewVideoText?: string;
}

interface VideoPlayerComponentProps {
  videoUri: string | number;
}

function VideoPlayerComponent({ videoUri }: VideoPlayerComponentProps) {
  const [actualVideoUri, setActualVideoUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      if (typeof videoUri === 'number') {
        // Convert require() number to actual URI
        const asset = Asset.fromModule(videoUri);
        await asset.downloadAsync();
        setActualVideoUri(asset.localUri || asset.uri);
      } else {
        setActualVideoUri(videoUri);
      }
    })();
  }, [videoUri]);

  const player = useVideoPlayer(actualVideoUri || '', (player) => {
    player.loop = true;
    player.play();
  });

  if (!actualVideoUri) {
    return (
      <View style={styles.noVideoContainer}>
        <Text style={styles.noVideoText}>{i18n.t('add.loadingVideo')}</Text>
      </View>
    );
  }

  return <VideoView player={player} style={styles.videoPreview} />;
}

export function VideoPreviewScreen({
  videoUri,
  onSelectNewVideo,
  onContinue,
  onClose,
  title = i18n.t('add.videoPreview'),
  selectNewVideoText = i18n.t('add.selectNewVideo'),
}: VideoPreviewScreenProps) {
  const { ref: continueButtonRef } = useTutorialTarget('video_preview_continue');
  const { height: screenHeight } = useWindowDimensions();
  const [videoRatio, setVideoRatio] = useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!videoUri) {
        setVideoRatio(null);
        return;
      }
      try {
        // Handle both string URIs and require() numbers
        let actualVideoUri: string;
        if (typeof videoUri === 'number') {
          // Convert require() number to actual URI
          const asset = Asset.fromModule(videoUri);
          await asset.downloadAsync();
          actualVideoUri = asset.localUri || asset.uri;
        } else {
          actualVideoUri = videoUri;
        }

        const meta = await generateVideoThumbnailWithMetadata(actualVideoUri, {
          time: 2000,
          quality: 0.5,
        });
        if (!cancelled && meta.width && meta.height) {
          setVideoRatio(meta.width / meta.height);
        }
      } catch (_) {
        if (!cancelled) setVideoRatio(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoUri]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.videoPreviewWrapper}>
          <View
            style={[
              styles.videoPreviewContainer,
              { width: '100%' },
              videoRatio
                ? { aspectRatio: videoRatio, maxHeight: screenHeight * 0.5 }
                : { height: 220 },
            ]}
            ref={continueButtonRef}
          >
            {videoUri ? (
              <VideoPlayerComponent videoUri={videoUri} />
            ) : (
              <View style={styles.noVideoContainer}>
                <Text style={styles.noVideoText}>{i18n.t('add.noVideoAvailable')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={styles.selectNewVideoButton}
            onPress={() => {
              // Track add analysis clicks for new video
              track('Add analysis', { event: 'New video' });
              onSelectNewVideo();
            }}
          >
            <Text style={styles.selectNewVideoButtonText}>{selectNewVideoText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              // Track add analysis clicks for proceed with video
              track('Add analysis', { event: 'Continue to movements' });
              onContinue();
            }}
          >
            <Text style={styles.continueButtonText}>{i18n.t('add.continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 0,
  },
  videoPreviewWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  videoPreviewContainer: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  noVideoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  bottomControls: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  buttonStack: {
    width: '100%',
  },
  selectNewVideoButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectNewVideoButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  continueButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
