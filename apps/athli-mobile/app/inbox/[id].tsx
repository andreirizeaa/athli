import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { type IWaveformRef, PlayerState, FinishMode } from '@/components/audio';

import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { MessageList } from '@/components/message/message-list';
import { MessageReactionsSheet } from '@/components/message/message-reactions-sheet';
import { ChatHeader } from '@/components/chats/chat-header';
import { ChatToolbar } from '@/components/chats/chat-toolbar';
import { ChatLoadingState } from '@/components/chats/chat-loading-state';
import { stopAllWaveformPlayers } from '@/components/message/message-audio-preview';
import {
  getCoach,
  getCoaches,
  getInboxMessages,
  sendInboxMessage,
  type Coach,
  type InboxMessage,
} from '@/services/inbox-service';

const BAR_INTERVAL_MS = 100;
const { width: SCREEN_W } = Dimensions.get('window');
const MAX_BARS = Math.max(40, Math.floor((SCREEN_W - 110) / 5));

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const meterToNorm = (db: number) => {
  const noiseFloorDb = -55;
  const peakDb = -5;
  if (db <= noiseFloorDb) return 0;
  return clamp01((db - noiseFloorDb) / (peakDb - noiseFloorDb));
};

const toNativeFilePath = (uri: string) => {
  if (!uri) return uri;
  if (uri.startsWith('file://')) return uri.replace('file://', '');
  return uri;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ensureFileReady = async (uri: string) => {
  for (let i = 0; i < 20; i++) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info.size ?? 0) > 1024) return;
    await sleep(30);
  }
};

const copyToCacheWithExtension = async (uri: string) => {
  const ext = uri.split('.').pop();
  const safeExt = ext && ext.length <= 4 ? ext : 'm4a';
  const dest = `${FileSystem.cacheDirectory}voice-${Date.now()}.${safeExt}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
};

const toWaveformPath = (uri: string) => uri.startsWith('file://') ? uri.replace('file://', '') : uri;

export default function InboxDetailScreen() {
  const router = useRouter();
  const { id, coach: coachParam, messages: messagesParam, documentSent, sentDocument, imagesSent, sentImages, sentImagesCaption, videoSent, sentVideo } = useLocalSearchParams<{
    id: string;
    coach?: string;
    messages?: string;
    documentSent?: string;
    sentDocument?: string;
    imagesSent?: string;
    sentImages?: string;
    sentImagesCaption?: string;
    videoSent?: string;
    sentVideo?: string;
  }>();

  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [coach, setCoach] = useState<Coach | null>(() => {
    if (coachParam) {
      try {
        return JSON.parse(coachParam) as Coach;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [messages, setMessages] = useState<InboxMessage[]>(() => {
    if (messagesParam) {
      try {
        const parsed = JSON.parse(messagesParam) as InboxMessage[];
        return parsed.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(!coachParam || !messagesParam);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [selectedMessageForReactions, setSelectedMessageForReactions] = useState<InboxMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<InboxMessage | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isMicrophoneMode, setIsMicrophoneMode] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const formatMmSs = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const recorderOptions = useMemo(() => {
    const base = RecordingPresets.HIGH_QUALITY;
    return {
      ...base,
      ios: {
        ...base.ios,
        isMeteringEnabled: true,
      },
    };
  }, []);

  const audioRecorder = useAudioRecorder(recorderOptions);
  const recorderState = useAudioRecorderState(audioRecorder, 50);

  const [waveform, setWaveform] = useState<number[]>([]);
  const waveformRef = useRef<number[]>([]);
  const lastBarAtRef = useRef(0);
  const bucketMaxRef = useRef(0);
  const smoothRef = useRef(0);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewPlayerState, setPreviewPlayerState] = useState<PlayerState>(PlayerState.stopped);
  const previewWaveRef = React.useRef<IWaveformRef | null>(null);
  const [isStopped, setIsStopped] = useState(false);

  const [durationLabel, setDurationLabel] = useState('0:00');
  const lastVoiceNoteDurationMsRef = useRef(0);
  const recordingStartedAtMsRef = useRef<number | null>(null);

  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
      onEnd: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    []
  );

  const scrollWindowAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          translateY: -keyboardHeight.value,
        },
      ],
    };
  });

  useEffect(() => {
    const handleKeyboardHide = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowAttachmentPicker(false);
    };

    const willHideSub = Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    const didHideSub = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      willHideSub.remove();
      didHideSub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  useEffect(() => {
    return () => {
      stopAllWaveformPlayers();
    };
  }, []);

  const resetWaveformCompletely = () => {
    waveformRef.current = [];
    setWaveform([]);
    smoothRef.current = 0;
    bucketMaxRef.current = 0;
    lastBarAtRef.current = Date.now();
  };

  const startRecording = async () => {
    setIsStopped(false);
    setPreviewPath(null);
    resetWaveformCompletely();

    lastVoiceNoteDurationMsRef.current = 0;
    recordingStartedAtMsRef.current = Date.now();

    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopAndDiscard = async () => {
    try {
      await audioRecorder.stop();
    } catch {}
    setIsStopped(false);
    waveformRef.current = [];
    setWaveform([]);
    await previewWaveRef.current?.stopPlayer();
    setPreviewPlayerState(PlayerState.stopped);
    setPreviewPath(null);
  };

  useEffect(() => {
    if (!isMicrophoneMode) {
      stopAndDiscard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicrophoneMode]);

  useEffect(() => {
    if (!isMicrophoneMode) return;

    const fromRecorder = recorderState.durationMillis ?? 0;
    const fromWallClock = recordingStartedAtMsRef.current
      ? Date.now() - recordingStartedAtMsRef.current
      : 0;

    const durationMs = fromRecorder > 0 ? fromRecorder : fromWallClock;
    lastVoiceNoteDurationMsRef.current = durationMs;

    if (!isStopped) {
      setDurationLabel(formatMmSs(durationMs));
    }
  }, [recorderState.durationMillis, isMicrophoneMode, isStopped]);

  useEffect(() => {
    if (!recorderState.isRecording) return;
    if (isStopped) return;

    const metering = recorderState.metering;
    if (typeof metering !== 'number') return;

    const v = meterToNorm(metering);

    const prev = smoothRef.current;
    const alpha = v > prev ? 0.45 : 0.12;
    const smoothed = prev + (v - prev) * alpha;
    smoothRef.current = smoothed;

    bucketMaxRef.current = Math.max(bucketMaxRef.current, smoothed);

    const now = Date.now();
    if (now - lastBarAtRef.current >= BAR_INTERVAL_MS) {
      lastBarAtRef.current = now;

      const nextVal = bucketMaxRef.current;
      bucketMaxRef.current = 0;

      const arr = waveformRef.current;
      arr.push(nextVal);
      if (arr.length > MAX_BARS) arr.splice(0, arr.length - MAX_BARS);

      setWaveform([...arr]);
    }
  }, [recorderState.metering, recorderState.isRecording, isStopped]);

  useEffect(() => {
    if (documentSent === 'true' && sentDocument) {
      try {
        const documentData = JSON.parse(sentDocument);
        
        const newMessage: InboxMessage = {
          id: `inbox-${Date.now()}`,
          text: documentData.caption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          document: {
            uri: documentData.uri,
            name: documentData.name,
            mimeType: documentData.mimeType,
            size: documentData.size ? parseInt(documentData.size) : undefined,
          },
        };

        setMessages((prev) => [...prev, newMessage]);
        setSearchQuery('');
        setShowAttachmentPicker(false);
        router.setParams({
          documentSent: '',
          sentDocument: '',
        });
      } catch (error) {
        console.error('Error parsing sent document:', error);
        setShowAttachmentPicker(false);
        router.setParams({
          documentSent: '',
          sentDocument: '',
        });
      }
    }
  }, [documentSent, sentDocument, router]);

  useEffect(() => {
    if (imagesSent === 'true' && sentImages) {
      try {
        const imageAttachments = JSON.parse(sentImages);
        
        const newMessage: InboxMessage = {
          id: `inbox-${Date.now()}`,
          text: sentImagesCaption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          images: imageAttachments,
        };

        setMessages((prev) => [...prev, newMessage]);
        setSearchQuery('');
        setShowAttachmentPicker(false);
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });
      } catch (error) {
        console.error('Error parsing sent images:', error);
        setShowAttachmentPicker(false);
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });
      }
    }
  }, [imagesSent, sentImages, sentImagesCaption, router]);

  useEffect(() => {
    if (videoSent === 'true' && sentVideo) {
      try {
        const videoData = JSON.parse(sentVideo);
        
        const newMessage: InboxMessage = {
          id: `inbox-${Date.now()}`,
          text: videoData.caption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          video: {
            uri: videoData.uri,
            duration: videoData.duration,
            orientation: videoData.orientation,
          },
        };

        setMessages((prev) => [...prev, newMessage]);
        setSearchQuery('');
        setShowAttachmentPicker(false);
        router.setParams({
          videoSent: '',
          sentVideo: '',
        });
      } catch (error) {
        console.error('Error parsing sent video:', error);
        setShowAttachmentPicker(false);
        router.setParams({
          videoSent: '',
          sentVideo: '',
        });
      }
    }
  }, [videoSent, sentVideo, router]);

  const hasText = searchQuery.trim().length > 0;

  useEffect(() => {
    if (coachParam && messagesParam) return;

    let mounted = true;

    const loadInbox = async () => {
      setIsLoading(true);
      try {
        const coaches = await getCoaches();
        let foundCoach = coaches.find((c) => c.id === id);

        if (!foundCoach) {
          foundCoach = await getCoach(id);
        }

        if (!foundCoach) return;

        const inboxMessages = await getInboxMessages(foundCoach.id);
        if (!mounted) return;

        setCoach(foundCoach);
        setMessages(inboxMessages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } catch (error) {
        console.error('Failed to load inbox:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (id) loadInbox();

    return () => {
      mounted = false;
    };
  }, [id, coachParam, messagesParam]);

  const handleBackPress = () => {
    router.back();
  };

  const handleMessageReply = (message: InboxMessage) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReplyingToMessage(message);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReplyingToMessage(null);
    Keyboard.dismiss();
  };

  const handlePlusPress = () => {
    if (showAttachmentPicker) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowAttachmentPicker(false);
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAttachmentPicker(true);
  };

  const handleMicrophonePress = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setIsMicrophoneMode(true);
    
    try {
      await startRecording();
    } catch (e) {
      console.warn('Failed to start recording:', e);
      setIsMicrophoneMode(false);
    }
  };

  const handleTrashPress = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    try {
      await audioRecorder.stop();
    } catch {}
    previewWaveRef.current?.stopPlayer?.();

    setPreviewPath(null);
    setIsStopped(false);
    resetWaveformCompletely();

    setIsMicrophoneMode(false);
  };

  const handleSendPress = async (pathOverride?: string | null) => {
    const pathToSend = pathOverride ?? previewPath;
    if (!isMicrophoneMode || !pathToSend) return;

    try {
      previewWaveRef.current?.stopPlayer?.();
      setIsMicrophoneMode(false);

      const duration = lastVoiceNoteDurationMsRef.current;
      const audioUri = pathToSend.startsWith('file://') ? pathToSend : `file://${pathToSend}`;

      const newMessage: InboxMessage = {
        id: `inbox-${Date.now()}`,
        text: '',
        timestamp: new Date(),
        isSent: true,
        isRead: false,
        audio: {
          uri: audioUri,
          duration: duration,
        },
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (e) {
      console.warn('Failed to send voice note:', e);
      setIsMicrophoneMode(false);
    }
  };

  const handleStopToggle = async (): Promise<string | null | void> => {
    if (!isMicrophoneMode) return;

    if (!isStopped) {
      {
        const fromRecorder = recorderState.durationMillis ?? 0;
        const fromWallClock = recordingStartedAtMsRef.current
          ? Date.now() - recordingStartedAtMsRef.current
          : 0;
        lastVoiceNoteDurationMsRef.current = fromRecorder > 0 ? fromRecorder : fromWallClock;
      }

      setIsStopped(true);
      setPreviewPlayerState(PlayerState.stopped);

      try {
        await audioRecorder.stop();

        const uri = audioRecorder.uri;
        if (!uri) {
          setPreviewPath(null);
          return null;
        }

        await ensureFileReady(uri);
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || (info.size ?? 0) < 1024) {
          console.warn('Empty recording after stop, skipping');
          setPreviewPath(null);
          return null;
        }

        const cachedUri = await copyToCacheWithExtension(uri);
        const waveformPath = toWaveformPath(cachedUri);
        setPreviewPath(waveformPath);
        return waveformPath;
      } catch (e) {
        console.warn('Stop failed:', e);
        setPreviewPath(null);
        return null;
      }

      return;
    }

    setIsStopped(false);
    setPreviewPath(null);
    previewWaveRef.current?.stopPlayer?.();
    resetWaveformCompletely();

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e) {
      console.warn('Redo failed:', e);
    }
  };

  const handleTogglePreviewPlay = async () => {
    const ref = previewWaveRef.current;
    if (!ref || !previewPath) return;

    try {
      if (previewPlayerState === PlayerState.playing) {
        await ref.pausePlayer();
      } else if (previewPlayerState === PlayerState.paused) {
        await ref.resumePlayer();
      } else {
        await ref.startPlayer({ finishMode: FinishMode.stop as any });
      }
    } catch (e) {
      console.warn('Failed to toggle preview playback:', e);
    }
  };

  const findOriginalMessage = (message: InboxMessage): InboxMessage => {
    if (!message.replyTo) {
      return message;
    }
    return findOriginalMessage(message.replyTo);
  };

  const handleSendMessage = async () => {
    const text = searchQuery.trim();
    if (!text) return;

    const originalMessage = replyingToMessage
      ? findOriginalMessage(replyingToMessage)
      : null;

    try {
      const newMessage = await sendInboxMessage(text, {
        ...(originalMessage && { replyTo: originalMessage }),
      });

      setMessages((prev) => [...prev, newMessage]);
      setSearchQuery('');
      setReplyingToMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMessageEdit = (message: InboxMessage) => {
    console.log('Edit message:', message);
    setSearchQuery(message.text);
  };

  const handleMessageDelete = async (message: InboxMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  const handleReactionPress = (message: InboxMessage) => {
    setSelectedMessageForReactions(message);
    setReactionsSheetVisible(true);
  };

  const handleDocumentPress = (document: import('@/services/chats-service').DocumentAttachment) => {
    router.push({
      pathname: '/chats/document-preview',
      params: {
        uri: document.uri,
        name: document.name,
        mimeType: document.mimeType,
        size: document.size?.toString() || '',
        chatId: 'inbox',
        clientId: coach?.id || '',
        clientName: coach?.name || '',
        fromMessage: 'true',
      },
    });
  };

  const handleImagePress = (
    images: import('@/services/chats-service').ImageAttachment[],
    senderName: string,
    isSent: boolean,
    messageTimestamp?: Date
  ) => {
    router.push({
      pathname: '/chats/message-image-preview',
      params: {
        images: JSON.stringify(images),
        senderName: senderName,
        isSent: isSent.toString(),
        messageTimestamp: messageTimestamp?.toISOString() || '',
      },
    });
  };

  const handleVideoPress = (
    video: import('@/services/chats-service').VideoAttachment,
    senderName: string,
    isSent: boolean,
    messageTimestamp?: Date
  ) => {
    router.push({
      pathname: '/chats/video-preview',
      params: {
        uri: video.uri,
        duration: video.duration.toString(),
        orientation: video.orientation,
        fromMessage: 'true',
        senderName: senderName,
        isSent: isSent.toString(),
        messageTimestamp: messageTimestamp?.toISOString() || '',
      },
    });
  };

  const handleReactionRemoved = (messageId: string, isSender: boolean) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            ...(isSender ? { senderReaction: undefined } : { recipientReaction: undefined }),
          };
        }
        return msg;
      })
    );
  };

  if (isLoading) {
    return <ChatLoadingState />;
  }

  if (!coach) {
    return <ChatLoadingState message={t('inbox.coachNotFound')} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      
      <Image
        source={isDark ? require('@/assets/chat/bg-dark.png') : require('@/assets/chat/bg-light.png')}
        style={styles.fullScreenBackgroundImage}
        contentFit="cover"
      />
      
      <ChatHeader
        coach={coach}
        onBackPress={handleBackPress}
      />

      <Animated.View
        style={[{ flex: 1, backgroundColor: 'transparent' }, scrollWindowAnimatedStyle]}
      >
        <MessageList
          messages={messages}
          backgroundColor="transparent"
          themeColors={themeColors}
          clientName={coach.name}
          onReply={handleMessageReply}
          onEdit={handleMessageEdit}
          onDelete={handleMessageDelete}
          onReactionPress={handleReactionPress}
          onDocumentPress={handleDocumentPress}
          onImagePress={handleImagePress}
          onVideoPress={handleVideoPress}
          headerHeight={insets.top + 60}
          toolbarHeight={
            (replyingToMessage ? 54 : 0) +
            (showAttachmentPicker ? 112 : 0) +
            (isMicrophoneMode ? 68 : 0) +
            40 +
            insets.bottom
          }
        />
      </Animated.View>

      <ChatToolbar
        coach={coach}
        replyingToMessage={replyingToMessage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        inputRef={inputRef}
        hasText={hasText}
        isMicrophoneMode={isMicrophoneMode}
        isStopped={isStopped}
        showAttachmentPicker={showAttachmentPicker}
        durationLabel={durationLabel}
        waveform={waveform}
        previewPath={previewPath}
        previewPlayerState={previewPlayerState}
        onPlayerStateChange={setPreviewPlayerState}
        onTogglePreviewPlay={handleTogglePreviewPlay}
        previewWaveRef={previewWaveRef}
        onPlusPress={handlePlusPress}
        onMicrophonePress={handleMicrophonePress}
        onSendMessage={handleSendMessage}
        onTrashPress={handleTrashPress}
        onStopToggle={handleStopToggle}
        onSendPress={handleSendPress}
        onCancelReply={handleCancelReply}
      />

      <MessageReactionsSheet
        visible={reactionsSheetVisible}
        onClose={() => {
          setReactionsSheetVisible(false);
          setSelectedMessageForReactions(null);
        }}
        message={selectedMessageForReactions}
        onReactionRemoved={handleReactionRemoved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  fullScreenBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
