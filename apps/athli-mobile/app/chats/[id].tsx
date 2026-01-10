import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Trash2 } from 'lucide-react-native';
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
import { hexToRgba } from '@/utils/colorUtils';
import { useTranslations } from '@/contexts/useTranslations';
import { type DropdownMenuOption } from '@/components/dropdown-menu';
import { MessageList } from '@/components/message/message-list';
import { MessageReactionsSheet } from '@/components/message/message-reactions-sheet';
import { ReplyPreviewRow } from '@/components/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';
import { VoiceNoteRecordingContainer } from '@/components/chats/voice-note-recording-container';
import { ChatHeader } from '@/components/chats/chat-header';
import { ChatToolbar } from '@/components/chats/chat-toolbar';
import { ChatLoadingState } from '@/components/chats/chat-loading-state';
import { stopAllWaveformPlayers } from '@/components/message/message-audio-preview';
import {
  getChats,
  getArchivedChats,
  archiveChat,
  deleteChat,
  getChatMessages,
  type Chat,
  type ChatMessage,
} from '@/services/chats-service';

const BAR_INTERVAL_MS = 100; // ✅ 10 bars/sec
const { width: SCREEN_W } = Dimensions.get('window');

// rough: (barWidth 3 + gap 2) => ~5px per bar. subtract ~110px for timer area + padding
const MAX_BARS = Math.max(40, Math.floor((SCREEN_W - 110) / 5));

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** maps dBFS-ish metering into 0..1 with a noise gate */
const meterToNorm = (db: number) => {
  const noiseFloorDb = -55;
  const peakDb = -5;
  if (db <= noiseFloorDb) return 0;
  return clamp01((db - noiseFloorDb) / (peakDb - noiseFloorDb));
};

// Convert Expo file URI to native file path
const toNativeFilePath = (uri: string) => {
  if (!uri) return uri;
  // "file:///var/..." -> "/var/..."
  if (uri.startsWith('file://')) return uri.replace('file://', '');
  return uri;
};

// Helper to wait for file to be ready
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ensureFileReady = async (uri: string) => {
  for (let i = 0; i < 20; i++) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info.size ?? 0) > 1024) return; // >1KB
    await sleep(30);
  }
};

const copyToCacheWithExtension = async (uri: string) => {
  // keep extension if present; fallback to .m4a
  const ext = uri.split('.').pop();
  const safeExt = ext && ext.length <= 4 ? ext : 'm4a';
  const dest = `${FileSystem.cacheDirectory}voice-${Date.now()}.${safeExt}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
};

// The waveform lib often prefers raw paths (no file://) on iOS.
const toWaveformPath = (uri: string) => uri.startsWith('file://') ? uri.replace('file://', '') : uri;

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id, chat: chatParam, messages: messagesParam, documentSent, sentDocument, imagesSent, sentImages, sentImagesCaption, videoSent, sentVideo } = useLocalSearchParams<{
    id: string;
    chat?: string;
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

  // Keyboard animation following Expo guide
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';
        keyboardHeight.value = withTiming(event.height, {
          duration: 250,
          easing: Easing.out(Easing.quad),
        });
      },
    },
    []
  );

  const [chat, setChat] = useState<Chat | null>(() => {
    if (chatParam) {
      try {
        return JSON.parse(chatParam) as Chat;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (messagesParam) {
      try {
        const parsed = JSON.parse(messagesParam) as ChatMessage[];
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

  const [isLoading, setIsLoading] = useState(!chatParam || !messagesParam);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [selectedMessageForReactions, setSelectedMessageForReactions] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
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

  // faster polling for better metering fidelity
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

  // Voice note duration
  const [durationLabel, setDurationLabel] = useState('0:00');
  const lastVoiceNoteDurationMsRef = useRef(0);
  const recordingStartedAtMsRef = useRef<number | null>(null);


  useEffect(() => {
    const handleKeyboardHide = () => {
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
    } catch { }
    setIsStopped(false);
    waveformRef.current = [];
    setWaveform([]);
    await previewWaveRef.current?.stopPlayer();
    setPreviewPlayerState(PlayerState.stopped);
    setPreviewPath(null);
  };

  // stop+discard when microphone UI closes (start is handled in handleMicrophonePress)
  useEffect(() => {
    if (!isMicrophoneMode) {
      stopAndDiscard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicrophoneMode]);

  // Update timer continuously while recording
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

  // ✅ conveyor-belt waveform values, emitted ~10/sec, derived from metering
  useEffect(() => {
    if (!recorderState.isRecording) return;
    if (isStopped) return;

    const metering = recorderState.metering;
    if (typeof metering !== 'number') return;

    // 1) real input level
    const v = meterToNorm(metering);

    // 2) smoothing (fast attack, slow decay)
    const prev = smoothRef.current;
    const alpha = v > prev ? 0.45 : 0.12;
    const smoothed = prev + (v - prev) * alpha;
    smoothRef.current = smoothed;

    // 3) bucket max over 100ms => 10 bars/sec
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

  // Handle document sent - add to message list and close attachment picker
  useEffect(() => {
    if (documentSent === 'true' && sentDocument) {
      try {
        const documentData = JSON.parse(sentDocument);

        // Create new message with document attachment
        const newMessage: ChatMessage = {
          id: `m-${Date.now()}`,
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

        // Add message to the list
        setMessages((prev) => [...prev, newMessage]);

        // Clear draft text in input bar
        setSearchQuery('');

        // Close attachment picker
        setShowAttachmentPicker(false);

        // Clear the params
        router.setParams({
          documentSent: '',
          sentDocument: '',
        });
      } catch (error) {
        console.error('Error parsing sent document:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({
          documentSent: '',
          sentDocument: '',
        });
      }
    }
  }, [documentSent, sentDocument, router]);

  // Handle images sent - add to message list and close attachment picker
  useEffect(() => {
    if (imagesSent === 'true' && sentImages) {
      try {
        const imageAttachments = JSON.parse(sentImages);

        // Create new message with image attachments
        const newMessage: ChatMessage = {
          id: `m-${Date.now()}`,
          text: sentImagesCaption || '',
          timestamp: new Date(),
          isSent: true,
          isRead: false,
          images: imageAttachments,
        };

        // Add message to the list
        setMessages((prev) => [...prev, newMessage]);

        // Clear draft text in input bar
        setSearchQuery('');

        // Close attachment picker
        setShowAttachmentPicker(false);

        // Clear the params
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });
      } catch (error) {
        console.error('Error parsing sent images:', error);
        // Still close the picker even if parsing fails
        setShowAttachmentPicker(false);
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });
      }
    }
  }, [imagesSent, sentImages, sentImagesCaption, router]);

  // Handle video sent - add to message list and close attachment picker
  useEffect(() => {
    if (videoSent === 'true' && sentVideo) {
      try {
        const videoData = JSON.parse(sentVideo);

        // Create new message with video attachment
        const newMessage: ChatMessage = {
          id: `m-${Date.now()}`,
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

        // Add message to the list
        setMessages((prev) => [...prev, newMessage]);

        // Clear draft text in input bar
        setSearchQuery('');

        // Close attachment picker
        setShowAttachmentPicker(false);

        // Clear the params
        router.setParams({
          videoSent: '',
          sentVideo: '',
        });
      } catch (error) {
        console.error('Error parsing sent video:', error);
        // Still close the picker even if parsing fails
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
    // Only load if not provided via params
    if (chatParam && messagesParam) return;

    let mounted = true;

    const loadChat = async () => {
      setIsLoading(true);
      try {
        const chats = await getChats();
        let foundChat = chats.find((c) => c.id === id);

        if (!foundChat) {
          const archivedChats = await getArchivedChats();
          foundChat = archivedChats.find((c) => c.id === id);
        }

        if (!foundChat) return;

        const chatMessages = await getChatMessages(foundChat.id);
        if (!mounted) return;

        setChat(foundChat);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (id) loadChat();

    return () => {
      mounted = false;
    };
  }, [id, chatParam, messagesParam]);


  const handleBackPress = () => {
    router.back();
  };

  const handleUserProfilePress = () => {
    if (chat?.clientId) {
      router.push(`/client/${chat.clientId}`);
    }
  };


  const handleArchivePress = async () => {
    if (chat?.id) {
      await archiveChat(chat.id);
      router.back();
    }
  };

  const handleDeletePress = async () => {
    if (chat?.id) {
      await deleteChat(chat.id);
      router.back();
    }
  };

  const handleMessageReply = (message: ChatMessage) => {
    setReplyingToMessage(message);
    // Focus the input to open keyboard
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
    Keyboard.dismiss();
  };

  const handlePlusPress = () => {
    if (showAttachmentPicker) {
      // Close attachment picker (keep current keyboard state)
      setShowAttachmentPicker(false);
      return;
    }

    // Open attachment picker row without changing keyboard state
    setShowAttachmentPicker(true);
  };

  const handleMicrophonePress = async () => {
    setIsMicrophoneMode(true);

    // Start recording immediately (resets accumulatedMs inside startRecording)
    try {
      await startRecording();
    } catch (e) {
      console.warn('Failed to start recording:', e);
      setIsMicrophoneMode(false);
    }
  };

  const handleTrashPress = async () => {
    // tear down + reset
    try {
      await audioRecorder.stop();
    } catch { }
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
      // Stop preview player and close microphone mode
      previewWaveRef.current?.stopPlayer?.();
      setIsMicrophoneMode(false);

      // Use captured duration (recorderState can be 0 depending on platform)
      const duration = lastVoiceNoteDurationMsRef.current;
      const audioUri = pathToSend.startsWith('file://') ? pathToSend : `file://${pathToSend}`;

      // Create and send the message
      const newMessage: ChatMessage = {
        id: `m-${Date.now()}`,
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

  // stop/redo toggle (center button)
  const handleStopToggle = async (): Promise<string | null | void> => {
    if (!isMicrophoneMode) return;

    // RECORDING -> STOP (show preview)
    if (!isStopped) {
      // capture duration BEFORE stopping (recorderState can be 0 depending on platform)
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

        // copy to stable cache location
        const cachedUri = await copyToCacheWithExtension(uri);
        const waveformPath = toWaveformPath(cachedUri);
        setPreviewPath(waveformPath);
        return waveformPath;
      } catch (e) {
        console.warn('Stop failed:', e);
        setPreviewPath(null);
        return null;
      }
    }

    // STOPPED -> REDO (restart from fresh)
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

  // Play/pause preview using library's ref methods
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

  // Helper function to find the original message in a reply chain
  const findOriginalMessage = (message: ChatMessage): ChatMessage => {
    if (!message.replyTo) {
      return message;
    }
    // Traverse the reply chain to find the original message
    return findOriginalMessage(message.replyTo);
  };

  const handleSendMessage = () => {
    const text = searchQuery.trim();
    if (!text) return;

    // If replying, find the original message (not the immediate reply)
    const originalMessage = replyingToMessage
      ? findOriginalMessage(replyingToMessage)
      : null;

    // Create new message
    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      text: text,
      timestamp: new Date(),
      isSent: true,
      isRead: false,
      ...(originalMessage && { replyTo: originalMessage }),
    };

    // Add message to the list
    setMessages((prev) => [...prev, newMessage]);

    // Clear input and exit reply mode
    setSearchQuery('');
    setReplyingToMessage(null);
  };

  const handleMessageEdit = (message: ChatMessage) => {
    // TODO: Implement edit functionality
    // This could set the message to edit mode and populate the input with the message text
    console.log('Edit message:', message);
    setSearchQuery(message.text);
  };

  const handleMessageDelete = async (message: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  const handleReactionPress = (message: ChatMessage) => {
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
        chatId: chat?.id || '',
        clientId: chat?.clientId || '',
        clientName: chat?.clientName || '',
        fromMessage: 'true', // Flag to show download icon
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

  const dropdownOptions: DropdownMenuOption[] = [
    {
      label: t('chats.archive'),
      icon: { sf: 'archivebox', IconComponent: Archive },
      onPress: handleArchivePress,
    },
    {
      label: t('chats.delete'),
      icon: { sf: 'trash', IconComponent: Trash2 },
      destructive: true,
      onPress: () => {
        Alert.alert(
          t('chats.delete'),
          t('library.deleteConfirmMessage'),
          [
            { text: t('general.cancel'), style: 'cancel' },
            {
              text: t('general.delete'),
              style: 'destructive',
              onPress: handleDeletePress
            },
          ]
        );
      },
    },
  ];

  if (isLoading) {
    return <ChatLoadingState />;
  }

  if (!chat) {
    return <ChatLoadingState message={t('chats.chatNotFound')} />;
  }


  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      {/* Background image covering entire screen */}
      <Image
        source={isDark ? require('@/assets/chat/bg-dark.png') : require('@/assets/chat/bg-light.png')}
        style={styles.fullScreenBackgroundImage}
        contentFit="cover"
      />

      {/* ROW 1: HEADER - Absolutely positioned with blur (extends into status bar area) */}
      <ChatHeader
        chat={chat}
        onBackPress={handleBackPress}
        onUserProfilePress={handleUserProfilePress}
        dropdownOptions={dropdownOptions}
      />

      <View
        style={{ flex: 1 }}
      >
        {/* ROW 2: SCROLL WINDOW - Fills space between header and toolbar */}
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <MessageList
            messages={messages}
            backgroundColor="transparent"
            themeColors={themeColors}
            clientName={chat.clientName}
            keyboardHeight={keyboardHeight}
            onReply={handleMessageReply}
            onEdit={handleMessageEdit}
            onDelete={handleMessageDelete}
            onReactionPress={handleReactionPress}
            onDocumentPress={handleDocumentPress}
            onImagePress={handleImagePress}
            onVideoPress={handleVideoPress}
            headerHeight={insets.top + 60}
            bottomOffset={60 + insets.bottom}
            disableKeyboardOffset={true}
          />
        </View>
      </View>

      {/* ROW 3: TOOLBAR - Absolutely positioned */}
      <ChatToolbar
        chat={chat}
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
        bottomInset={insets.bottom}
        keyboardHeight={keyboardHeight}
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
