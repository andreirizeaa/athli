import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { type IWaveformRef, PlayerState, FinishMode } from '@/components/features/audio';

import { useThemePreference, useColorScheme, useAuthSessionStore, useClientProfileStore } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { useTranslations } from '@/stores';
import { haptics } from '@/utils/haptics';
import { MessageList } from '@/components/features/message/message-list-flashlist';
import { ChatHeader } from '@/components/features/chats/chat-header';
import { ChatToolbar } from '@/components/features/chats/chat-toolbar';
import { ChatLoadingState } from '@/components/features/chats/chat-loading-state';
import { stopAllWaveformPlayers } from '@/components/features/message/message-audio-preview';
import {
  getCoach,
  getCoaches,
  getInboxMessages,
  sendInboxMessage,
  type Coach,
  type InboxMessage,
  type Message,
  type OptimisticMessage,
} from '@/services/inbox-service';
import { createOptimisticMessage } from '@athli/shared-types';
import {
  useRealtimeMessages,
  useMessageMerging,
  useSyncReadReceipt,
  useRealtimeReadReceipts,
} from '@/hooks/use-realtime-messaging';
import { useSendMessageWithAttachment } from '@/hooks/use-file-upload';

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
        // Snap to final position to prevent lag at the end
        keyboardHeight.value = event.height;
      },
    },
    []
  );

  // Single animated style for the entire chat content (messages + toolbar move together)
  const chatContentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  // Animated bottom offset for toolbar - smoothly transitions as keyboard opens/closes
  // When keyboard fully closed: bottom = insets.bottom (toolbar above safe area)
  // When keyboard opens past insets.bottom: bottom = 0 (toolbar flush with keyboard)
  const toolbarBottomStyle = useAnimatedStyle(() => {
    'worklet';
    const bottom = Math.max(0, insets.bottom - keyboardHeight.value);
    return { bottom };
  });

  // Dynamic toolbar height - tracks actual height including reply preview and attachment picker
  const [toolbarHeight, setToolbarHeight] = useState(60 + insets.bottom);
  const toolbarHeightAnimated = useSharedValue(60 + insets.bottom);
  const prevToolbarHeightRef = useRef(toolbarHeight);

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
          timestamp: new Date(msg.sent_at),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);

  // Get current user ID synchronously from auth store (already available)
  const currentUserId = useAuthSessionStore((state) => state.userId);

  // Get client profile for reactions display
  const clientProfile = useClientProfileStore((state) => state.profile);

  // File upload hook for sending messages with attachments
  const { sendWithAttachment, sendWithMultipleAttachments, isUploading: isUploadingAttachment } = useSendMessageWithAttachment();

  const [isLoading, setIsLoading] = useState(!coachParam || !messagesParam);
  const [replyingToMessage, setReplyingToMessage] = useState<InboxMessage | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isMicrophoneMode, setIsMicrophoneMode] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [showUploadErrorDialog, setShowUploadErrorDialog] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');

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

  // Refetch messages helper for inbox
  const refetchInboxMessages = async () => {
    try {
      const inboxMessages = await getInboxMessages(id);
      setMessages(inboxMessages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.sent_at),
      })));
    } catch (error) {
      console.error('[Inbox] Failed to refetch messages:', error);
    }
  };

  // Realtime messages subscription (uses broadcast events for scalability)
  const { realtimeMessages } = useRealtimeMessages({
    conversationId: id,
    onMessageReceived: (message) => {
      console.log('[Inbox Detail] onMessageReceived:', message.message_type, message.id, 'attachments:', message.attachments?.length || 0);
      // Message now includes attachments from enhanced broadcast trigger - no refetch needed

      // Remove matching optimistic message now that real message is in state
      setOptimisticMessages((prev) => {
        const optimisticMatch = prev.find((opt) => opt.id === message.id);

        if (!optimisticMatch) {
          // No matching optimistic message - nothing to remove
          return prev;
        }

        // For messages with attachments, only remove if the real message 
        // has attachments_ready=true (all attachments uploaded)
        const hasAttachments = optimisticMatch.attachments && optimisticMatch.attachments.length > 0;
        const isReady = (message as any).attachments_ready !== false;

        if (hasAttachments && !isReady) {
          // Keep optimistic - wait for attachments to be ready
          return prev;
        }

        // Safe to remove - the real message is now in realtimeMessages
        return prev.filter((opt) => opt.id !== message.id);
      });
    },
    onMessageUpdated: (message) => {
      console.log('[Inbox Detail] onMessageUpdated:', message.message_type, message.id, 'attachments:', message.attachments?.length || 0, 'is_deleted:', message.is_deleted);
      // If message is soft-deleted, remove from local state
      if (message.is_deleted === true) {
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
      }
    },
    onMessageDeleted: (messageId) => {
      // Remove the deleted message from local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
  });

  // Merge saved, realtime, and optimistic messages - transforms to UIMessage[]
  const mergedMessages = useMessageMerging(messages, realtimeMessages, optimisticMessages, currentUserId, 'client');

  // Subscribe to read receipt updates for this conversation
  // This allows the sender to see when their messages are read in realtime
  const { readReceipts } = useRealtimeReadReceipts({
    conversationId: id,
    onReadReceiptUpdated: (receipt) => {
      console.log('[Inbox Detail] Read receipt updated:', receipt.user_id, 'at', receipt.last_read_at);
    },
  });

  // Compute final message status using read receipts
  // For sent messages, check if recipient has read them based on their read receipt
  // This enhances the database-computed isRead with real-time read receipt data
  const isSelfConversation = coach?.coach_id === coach?.client_id;
  const allMessages = useMemo(() => {
    if (!currentUserId) return mergedMessages;

    // Find the recipient's read receipt (not the current user's)
    // For self-conversations (demo: coach_id === client_id), use the only receipt available
    const recipientReceipt = isSelfConversation
      ? readReceipts[0]
      : readReceipts.find((r) => r.user_id !== currentUserId);

    return mergedMessages.map((msg) => {
      // Only update read status for own sent messages
      if (!msg.isSent) return msg;

      // If already marked as read from database, preserve it
      if (msg.isRead) return msg;

      // If recipient has a read receipt and it's after this message was sent
      if (recipientReceipt?.last_read_at) {
        const msgSentAt = new Date(msg.sent_at).getTime();
        const readAt = new Date(recipientReceipt.last_read_at).getTime();

        if (readAt >= msgSentAt) {
          return { ...msg, isRead: true };
        }
      }

      return msg;
    });
  }, [mergedMessages, readReceipts, currentUserId, isSelfConversation]);

  // Auto-sync read receipt when screen is focused or when new messages arrive
  // This hook handles marking the conversation as read - no need for manual useEffect
  // Pass allMessages.length to re-sync when new messages arrive
  useSyncReadReceipt({
    conversationId: id,
    userId: currentUserId || '',
    enabled: !!id && !!currentUserId,
    messageCount: allMessages.length,
  });

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

  // Handle document sent - upload to Supabase and send message
  useEffect(() => {
    if (documentSent === 'true' && sentDocument && currentUserId && id) {
      const uploadDocument = async () => {
        const documentData = JSON.parse(sentDocument);
        const mimeType = documentData.mimeType || 'application/pdf';

        // Create optimistic message for instant display
        const optimisticMsg = createOptimisticMessage(
          id,
          currentUserId,
          documentData.caption || '',
          'file',
          undefined,
          [{ local_uri: documentData.uri, mime_type: mimeType, filename: documentData.name || 'document.pdf' }]
        );

        setOptimisticMessages((prev) => [...prev, optimisticMsg]);

        // Clear UI immediately
        setSearchQuery('');
        setShowAttachmentPicker(false);

        try {
          // Use the optimistic message ID for deduplication
          await sendWithAttachment(
            id,
            currentUserId,
            documentData.uri,
            mimeType,
            documentData.caption || undefined,
            undefined, // durationSeconds
            undefined, // onProgress
            optimisticMsg.id, // client-provided message ID
            optimisticMsg.idempotency_key, // client-provided idempotency key
          );

          // Don't remove optimistic message here - onMessageReceived will handle it
        } catch (error) {
          console.error('[Inbox] Error uploading document:', error);
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
          setUploadErrorMessage('Could not upload document. Please try again.');
          setShowUploadErrorDialog(true);
        } finally {
          router.setParams({
            documentSent: '',
            sentDocument: '',
          });
        }
      };

      uploadDocument();
    }
  }, [documentSent, sentDocument, currentUserId, id, sendWithAttachment, router]);

  // Handle images sent - upload to Supabase and send as ONE message with all attachments
  useEffect(() => {
    if (imagesSent === 'true' && sentImages && currentUserId && id) {
      const uploadImages = async () => {
        const imageAttachments = JSON.parse(sentImages);

        // Create ONE optimistic message with ALL attachments for instant UI feedback
        const optimisticMsg = createOptimisticMessage(
          id,
          currentUserId,
          sentImagesCaption || '',
          'image',
          undefined,
          imageAttachments.map((img: { uri: string; id: string; isVideo?: boolean }) => ({
            local_uri: img.uri,
            mime_type: img.isVideo ? 'video/mp4' : 'image/jpeg',
            filename: img.isVideo ? 'video.mp4' : 'photo.jpg',
          }))
        );

        setOptimisticMessages((prev) => [...prev, optimisticMsg]);

        // Clear draft text and close picker immediately
        setSearchQuery('');
        setShowAttachmentPicker(false);

        // Clear params immediately to prevent re-triggering
        router.setParams({
          imagesSent: '',
          sentImages: '',
          sentImagesCaption: '',
        });

        try {
          // Upload ALL images as ONE message with multiple attachments
          await sendWithMultipleAttachments(
            id,
            currentUserId,
            imageAttachments.map((img: { uri: string; isVideo?: boolean }) => ({
              uri: img.uri,
              mimeType: img.isVideo ? 'video/mp4' : 'image/jpeg',
            })),
            sentImagesCaption || undefined,
            undefined, // onProgress
            optimisticMsg.id, // client-provided message ID
            optimisticMsg.idempotency_key, // client-provided idempotency key
          );

          // Don't remove optimistic message here - onMessageReceived will handle it
        } catch (error) {
          console.error('[Inbox] Error uploading images:', error);
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
          setUploadErrorMessage('Could not upload images. Please try again.');
          setShowUploadErrorDialog(true);
        }
      };

      uploadImages();
    }
  }, [imagesSent, sentImages, sentImagesCaption, currentUserId, id, sendWithMultipleAttachments, router]);

  // Handle video sent - upload to Supabase and send message
  useEffect(() => {
    if (videoSent === 'true' && sentVideo && currentUserId && id) {
      const uploadVideo = async () => {
        const videoData = JSON.parse(sentVideo);

        // Clear params IMMEDIATELY to prevent re-triggering and navigation race condition
        router.setParams({
          videoSent: '',
          sentVideo: '',
        });

        // Create optimistic message for instant display
        const optimisticMsg = createOptimisticMessage(
          id,
          currentUserId,
          videoData.caption || '',
          'video',
          undefined,
          [{ local_uri: videoData.uri, mime_type: 'video/mp4', filename: 'video.mp4' }]
        );

        setOptimisticMessages((prev) => [...prev, optimisticMsg]);

        // Clear UI immediately
        setSearchQuery('');
        setShowAttachmentPicker(false);

        try {
          // Use the optimistic message ID for deduplication
          await sendWithAttachment(
            id,
            currentUserId,
            videoData.uri,
            'video/mp4',
            videoData.caption || undefined,
            undefined, // durationSeconds
            undefined, // onProgress
            optimisticMsg.id, // client-provided message ID
            optimisticMsg.idempotency_key, // client-provided idempotency key
          );

          // Don't remove optimistic message here - onMessageReceived will handle it
        } catch (error) {
          console.error('[Inbox] Error uploading video:', error);
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
          setUploadErrorMessage('Could not upload video. Please try again.');
          setShowUploadErrorDialog(true);
        }
      };

      uploadVideo();
    }
  }, [videoSent, sentVideo, currentUserId, id, sendWithAttachment, router]);

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
          timestamp: new Date(msg.sent_at),
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

  const handleMessageReply = (message: any) => {
    setReplyingToMessage(message);
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
      setShowAttachmentPicker(false);
      return;
    }

    setShowAttachmentPicker(true);
  };

  const handleMicrophonePress = async () => {
    setIsMicrophoneMode(true);

    try {
      await startRecording();
    } catch (e) {
      console.warn('Failed to start recording:', e);
      setIsMicrophoneMode(false);
    }
  };

  const handleTrashPress = async () => {
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
    if (!isMicrophoneMode || !pathToSend || !currentUserId || !id) return;

    // Stop preview player and close microphone mode immediately
    previewWaveRef.current?.stopPlayer?.();
    setIsMicrophoneMode(false);

    const audioUri = pathToSend.startsWith('file://') ? pathToSend : `file://${pathToSend}`;

    // Create optimistic message for instant display
    const optimisticMsg = createOptimisticMessage(
      id,
      currentUserId,
      '',
      'audio',
      undefined,
      [{ local_uri: audioUri, mime_type: 'audio/mp4', filename: 'voicenote.m4a', duration: lastVoiceNoteDurationMsRef.current }]
    );

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Convert duration from ms to seconds for database storage
      const durationMs = lastVoiceNoteDurationMsRef.current;
      const durationSeconds = Math.round(durationMs / 1000);

      // Use the optimistic message ID for deduplication
      await sendWithAttachment(
        id,
        currentUserId,
        audioUri,
        'audio/mp4',
        undefined, // caption
        durationSeconds, // duration in seconds for DB
        undefined, // onProgress
        optimisticMsg.id, // client-provided message ID
        optimisticMsg.idempotency_key, // client-provided idempotency key
      );

      // Don't remove optimistic message here - onMessageReceived will handle it
    } catch (e) {
      console.error('[Inbox] Failed to send voice note:', e);
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMsg.id)
      );
      setUploadErrorMessage('Could not upload voice note. Please try again.');
      setShowUploadErrorDialog(true);
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

  const findOriginalMessage = (message: any): any => {
    if (!message.replyTo) {
      return message;
    }
    return findOriginalMessage(message.replyTo);
  };

  const handleSendMessage = async () => {
    const text = searchQuery.trim();
    if (!text || !currentUserId) return;

    // Clear input and exit reply mode immediately
    setSearchQuery('');
    const parentMessageId = replyingToMessage?.id;
    setReplyingToMessage(null);

    // Create optimistic message for immediate UI update
    // IMPORTANT: The optimistic message ID will be the REAL message ID
    const optimisticMsg = createOptimisticMessage(
      id, // conversationId
      currentUserId,
      text,
      'text',
      parentMessageId
    );

    // Add to optimistic messages for immediate UI update
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Send to database with client-provided ID for deduplication
      // The message ID matches the optimistic message ID
      await sendInboxMessage(id, text, {
        messageType: 'text',
        parentMessageId,
        messageId: optimisticMsg.id,
        idempotencyKey: optimisticMsg.idempotency_key,
      });

      // Don't remove optimistic message here - onMessageReceived will handle it
      // when the realtime broadcast arrives with the same ID
    } catch (error) {
      console.error('[Inbox] Failed to send message:', error);
      // Remove failed message from optimistic list
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMsg.id)
      );
      // TODO: Show error toast and allow retry
    }
  };

  const handleMessageDelete = async (message: any) => {
    // Remove from ALL local states (messages and optimisticMessages)
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  const handleReactionPress = (message: any) => {
    if (!message.reactions || message.reactions.length === 0) return;

    haptics.light();
    router.push({
      pathname: '/modals/message/reactions-modal',
      params: {
        messageId: message.id,
        reactions: JSON.stringify(message.reactions),
        currentUserId: currentUserId || '',
        otherUserName: coach?.other_user_name || 'Coach',
        otherUserAvatarUrl: coach?.other_user_avatar || '',
        currentUserName: clientProfile?.name || t('general.you'),
        currentUserAvatarUrl: clientProfile?.profile_picture_url || '',
      },
    });
  };

  const handleDocumentPress = (document: any) => {
    const uri = document.uri || document.url || '';
    const mimeType = document.mimeType || document.mime_type || 'application/pdf';
    const filename = document.name || document.filename || 'document.pdf';

    router.push({
      pathname: '/modals/files/file-viewer-modal',
      params: { uri, mimeType, filename },
    });
  };

  const handleImagePress = (
    images: any[],
    _senderName: string,
    _isSent: boolean,
    _messageTimestamp?: Date | string
  ) => {
    // For simplicity, open the first image in the viewer
    // Multi-image gallery can be added later if needed
    const firstImage = images[0];
    if (!firstImage) return;

    const uri = firstImage.uri || firstImage.url || '';
    const mimeType = firstImage.mimeType || firstImage.mime_type || 'image/jpeg';
    const filename = firstImage.filename || 'image.jpg';

    router.push({
      pathname: '/modals/files/file-viewer-modal',
      params: { uri, mimeType, filename },
    });
  };

  const handleVideoPress = (
    video: any,
    _senderName: string,
    _isSent: boolean,
    _messageTimestamp?: Date | string
  ) => {
    const uri = video.uri || video.url || '';
    const mimeType = video.mimeType || video.mime_type || 'video/mp4';
    const filename = video.filename || 'video.mp4';

    router.push({
      pathname: '/modals/files/file-viewer-modal',
      params: { uri, mimeType, filename },
    });
  };

  const handleToolbarHeightChange = (height: number) => {
    setToolbarHeight(height);
    toolbarHeightAnimated.value = withTiming(height, { duration: 150 });
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

      {/* Messages + Toolbar container - moves together with keyboard */}
      <Animated.View style={[{ flex: 1 }, chatContentAnimatedStyle]}>
        {/* SCROLL WINDOW - Fills space between header and toolbar */}
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <MessageList
            messages={allMessages}
            backgroundColor="transparent"
            themeColors={themeColors}
            clientName={coach.other_user_name || 'Coach'}
            onReply={handleMessageReply}
            onDelete={handleMessageDelete}
            onReactionPress={handleReactionPress}
            onDocumentPress={handleDocumentPress}
            onImagePress={handleImagePress}
            onVideoPress={handleVideoPress}
            headerHeight={insets.top + 60}
            bottomOffset={toolbarHeight + 8 + insets.bottom}
          />
        </View>

        {/* TOOLBAR - Absolutely positioned within this container */}
        <ChatToolbar
          coach={coach ? { id: coach.id, name: coach.other_user_name || '' } : undefined}
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
          bottomInset={0}
          animatedBottomStyle={toolbarBottomStyle}
          onHeightChange={handleToolbarHeightChange}
        />
      </Animated.View>

      {/* Fixed bottom filler - doesn't move with keyboard */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: insets.bottom,
          overflow: 'hidden',
        }}
        pointerEvents="none"
      >
        <BlurView
          intensity={30}
          tint={isDark ? 'dark' : 'light'}
          style={{
            flex: 1,
            backgroundColor: hexToRgba(themeColors.translucentBackground, 0.95),
          }}
        />
      </View>

      <Dialog
        visible={showUploadErrorDialog}
        onClose={() => setShowUploadErrorDialog(false)}
        title="Upload Failed"
        message={uploadErrorMessage}
        showCloseIcon={false}
        buttons={[{ label: 'OK', onPress: () => setShowUploadErrorDialog(false), variant: 'primary' }]}
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
