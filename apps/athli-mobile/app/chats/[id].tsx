import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Text,
} from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  File,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Notebook,
  Pencil,
  Repeat,
  Settings,
  Target,
} from 'lucide-react-native';
import { PressableScale, PressableOpacity } from 'pressto';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { type IWaveformRef, PlayerState, FinishMode } from '@/components/features/audio';

import { useThemePreference, useColorScheme } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { useTranslations } from '@/stores';
import { haptics } from '@/utils/haptics';
import { typography } from '@/constants/typography';
import { SlidingPanel, SlidingPanelRef } from '@/components/ui/sliding-panel';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';
import { MessageList } from '@/components/features/message/message-list-flashlist';
import { MessageReactionsSheet } from '@/components/features/message/message-reactions-sheet';
import { ReplyPreviewRow } from '@/components/features/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/features/chats/attachment-picker-row';
import { VoiceNoteRecordingContainer } from '@/components/features/chats/voice-note-recording-container';
import { ChatHeader } from '@/components/features/chats/chat-header';
import { ChatToolbar } from '@/components/features/chats/chat-toolbar';
import { ChatLoadingState } from '@/components/features/chats/chat-loading-state';
import { stopAllWaveformPlayers } from '@/components/features/message/message-audio-preview';
import {
  getChats,
  getArchivedChats,
  getChatMessages,
  sendMessage,
  markConversationAsRead,
  type Chat,
  type ChatMessage,
  type Message,
  type OptimisticMessage,
} from '@/services/chats-service';
import { createOptimisticMessage } from '@athli/shared-types';
import {
  useRealtimeMessages,
  useMessageMerging,
} from '@/hooks/use-realtime-messaging';
import { useSendMessageWithAttachment } from '@/hooks/use-file-upload';
import { supabase } from '@/lib/supabase';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';

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

type MenuItem = {
  id: string;
  icon: {
    sf: string;
    IconComponent: any;
  };
  title: string;
  route: string;
};

type ClientPanelContentProps = {
  clientId?: string;
  clientName?: string;
  clientAvatar?: string;
  onClose?: () => void;
};

const COLLAPSED_WIDTH_RATIO = 0.85;

const ClientPanelContent = ({ clientId, clientName: initialClientName, clientAvatar: initialClientAvatar, onClose }: ClientPanelContentProps) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  const iconColor = themeColors.text;

  // State for client data - use initial values from chat, then fetch full details
  const [clientData, setClientData] = React.useState<{
    name: string;
    avatarUrl: string | null;
    isLoading: boolean;
  }>({
    name: initialClientName || '',
    avatarUrl: initialClientAvatar || null,
    isLoading: false,
  });

  // Fetch client details when clientId changes (only if we don't have full data)
  React.useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;

      // Only fetch if we don't have a name (indicating we need fresh data)
      if (initialClientName) {
        setClientData({
          name: initialClientName,
          avatarUrl: initialClientAvatar || null,
          isLoading: false,
        });
        return;
      }

      setClientData((prev) => ({ ...prev, isLoading: true }));

      try {
        // Dynamic import to avoid circular dependencies
        const { getClientDetails } = await import('@/services/client');
        const details = await getClientDetails(clientId);
        setClientData({
          name: details.name,
          avatarUrl: details.avatarUrl || null,
          isLoading: false,
        });
      } catch (error) {
        console.error('[ClientPanel] Failed to fetch client details:', error);
        setClientData((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchClientData();
  }, [clientId, initialClientName, initialClientAvatar]);

  // Use fetched data or fallback to props
  const clientName = clientData.name || initialClientName;
  const clientAvatar = clientData.avatarUrl || initialClientAvatar;

  // Calculate right padding to account for the hidden portion of the sidebar
  const hiddenWidth = screenWidth * (1 - COLLAPSED_WIDTH_RATIO);
  const rightPadding = hiddenWidth + 16; // Add extra 16 for margin

  const handleEditProfilePress = () => {
    haptics.medium();
    // Don't close sidebar - modal opens on top
    router.push(`/modals/client/edit-client-details-modal?id=${clientId}`);
  };

  const menuItems: MenuItem[] = [
    // Quick Actions
    {
      id: 'activity',
      icon: { sf: 'figure.walk', IconComponent: Activity },
      title: t('clientDetail.overview.activity'),
      route: `/client/${clientId}/activity?fromChat=true`,
    },
    {
      id: 'goals',
      icon: { sf: 'target', IconComponent: Target },
      title: t('clientDetail.overview.goals'),
      route: `/client/${clientId}/goals?fromChat=true`,
    },
    {
      id: 'injuries',
      icon: { sf: 'heart', IconComponent: Heart },
      title: t('clientDetail.overview.injuries'),
      route: `/client/${clientId}/injuries?fromChat=true`,
    },
    {
      id: 'notes',
      icon: { sf: 'note.text', IconComponent: Notebook },
      title: t('clientDetail.sections.notes'),
      route: `/client/${clientId}/notes?fromChat=true`,
    },
    {
      id: 'training',
      icon: { sf: 'figure.run', IconComponent: Dumbbell },
      title: t('clientDetail.sections.training'),
      route: `/client/${clientId}/training?fromChat=true`,
    },
    // Data
    {
      id: 'metrics',
      icon: { sf: 'chart.bar', IconComponent: BarChart3 },
      title: t('clientDetail.sections.metrics'),
      route: `/client/${clientId}/metrics?fromChat=true`,
    },
    {
      id: 'habits',
      icon: { sf: 'repeat', IconComponent: Repeat },
      title: t('clientDetail.sections.habits'),
      route: `/client/${clientId}/habits?fromChat=true`,
    },
    {
      id: 'photos',
      icon: { sf: 'photo', IconComponent: ImageIcon },
      title: t('clientDetail.sections.photos'),
      route: `/client/${clientId}/photos?fromChat=true`,
    },
    {
      id: 'files',
      icon: { sf: 'doc', IconComponent: File },
      title: t('clientDetail.sections.files'),
      route: `/client/${clientId}/files?fromChat=true`,
    },
    // Forms & Settings
    {
      id: 'check-ins',
      icon: { sf: 'checkmark.circle', IconComponent: ClipboardCheck },
      title: t('clientDetail.sections.checkIns'),
      route: `/client/${clientId}/check-ins?fromChat=true`,
    },
    {
      id: 'questionnaires',
      icon: { sf: 'questionmark.circle', IconComponent: HelpCircle },
      title: t('clientDetail.sections.questionnaires'),
      route: `/client/${clientId}/questionaires?fromChat=true`,
    },
    {
      id: 'settings',
      icon: { sf: 'gear', IconComponent: Settings },
      title: t('clientDetail.sections.settings'),
      route: `/client/${clientId}/settings?fromChat=true`,
    },
  ];

  const handleMenuItemPress = (route: string) => {
    haptics.medium();
    // Don't close sidebar - let the new page push in smoothly
    // When user goes back, sidebar will still be open
    router.push(route as any);
  };

  return (
    <View style={[panelStyles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <StatusBarBlur />
      <ScrollView
        style={panelStyles.scrollView}
        contentContainerStyle={[panelStyles.scrollContent, { paddingRight: rightPadding, paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[panelStyles.profileCard, { backgroundColor: themeColors.surfacePrimary, marginRight: 0 }]}>
          <View style={panelStyles.avatarLarge}>
            {clientAvatar ? (
              <Image
                source={{ uri: clientAvatar }}
                style={panelStyles.avatarLargeImage}
                contentFit="cover"
                contentPosition="center"
              />
            ) : (
              <View style={[panelStyles.avatarLargeImage, panelStyles.avatarPlaceholder, { backgroundColor: themeColors.border }]}>
                <Text style={[panelStyles.avatarInitial, { color: themeColors.mutedText }]}>
                  {clientName?.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[panelStyles.profileName, { color: themeColors.text }]}>
            {clientName}
          </Text>
          <PressableOpacity
            style={[
              panelStyles.editButton,
              { backgroundColor: themeColors.surfaceSecondary },
            ]}
            onPress={handleEditProfilePress}
          >
            <Pencil {...({ size: 16, color: themeColors.primary } as any)} />
            <Text style={[panelStyles.editButtonText, { color: themeColors.primary }]}>
              {t('clientDetail.editProfile')}
            </Text>
          </PressableOpacity>
        </View>

        {/* Menu Items */}
        <View style={panelStyles.menuContainer}>
          {menuItems.map((item) => (
            <View key={item.id}>
              <PressableScale onPress={() => handleMenuItemPress(item.route)}>
                <View style={panelStyles.menuItem}>
                  <View style={panelStyles.menuItemLeft}>
                    <PlatformIcon
                      sf={item.icon.sf}
                      IconComponent={item.icon.IconComponent}
                      size={24}
                      color={iconColor}
                    />
                    <Text style={[panelStyles.menuItemTitle, { color: themeColors.text }]}>
                      {item.title}
                    </Text>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableScale>
              <Separator />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    marginLeft: 16,
    marginRight: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatarLargeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h3,
    fontWeight: '600',
  },
  profileName: {
    ...typography.h6,
    fontWeight: '500',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignSelf: 'center',
  },
  editButtonText: {
    ...typography.p2,
    fontWeight: '500',
  },
  menuContainer: {
    paddingTop: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemTitle: {
    ...typography.p1,
    fontWeight: '500',
  },
});

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

  // Dynamic toolbar height - tracks actual height for proper scroll offset
  const [toolbarHeight, setToolbarHeight] = useState(60 + insets.bottom);

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
          timestamp: new Date(msg.sent_at),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(!chatParam || !messagesParam);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [selectedMessageForReactions, setSelectedMessageForReactions] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isMicrophoneMode, setIsMicrophoneMode] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Panel ref for sliding sidebar
  const panelRef = useRef<SlidingPanelRef>(null);

  const handleOpenPanel = () => {
    Keyboard.dismiss();
    panelRef.current?.open();
  };

  const handleClosePanel = () => {
    panelRef.current?.close();
  };

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

  // File upload hook for sending messages with attachments
  const { sendWithAttachment, isUploading: isUploadingAttachment } = useSendMessageWithAttachment();

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

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Realtime messages subscription
  const { realtimeMessages } = useRealtimeMessages({
    conversationId: id,
    onMessageReceived: (message) => {
      console.log('[Realtime] New message received:', message.id);
    },
  });

  // Merge saved, realtime, and optimistic messages
  const allMessages = useMessageMerging(messages, realtimeMessages, optimisticMessages);

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

  // Handle document sent - upload to Supabase and send message
  useEffect(() => {
    if (documentSent === 'true' && sentDocument && currentUserId && id) {
      const uploadDocument = async () => {
        try {
          const documentData = JSON.parse(sentDocument);

          console.log('[ChatDetail] Uploading document...', documentData.name);

          // Upload document and create message in one atomic operation
          await sendWithAttachment(
            id, // conversationId
            currentUserId, // senderId
            documentData.uri, // fileUri
            documentData.mimeType || 'application/pdf', // mimeType
            documentData.caption || undefined, // caption
          );

          console.log('[ChatDetail] Document uploaded successfully');

          // Clear draft text in input bar
          setSearchQuery('');

          // Close attachment picker
          setShowAttachmentPicker(false);
        } catch (error) {
          console.error('[ChatDetail] Error uploading document:', error);
          Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
        } finally {
          // Clear the params
          router.setParams({
            documentSent: '',
            sentDocument: '',
          });
        }
      };

      uploadDocument();
    }
  }, [documentSent, sentDocument, currentUserId, id, sendWithAttachment, router]);

  // Handle images sent - upload to Supabase and send message
  useEffect(() => {
    if (imagesSent === 'true' && sentImages && currentUserId && id) {
      const uploadImages = async () => {
        try {
          const imageAttachments = JSON.parse(sentImages);

          console.log('[ChatDetail] Uploading images...', imageAttachments.length);

          // Upload each image separately (multiple messages, one per image)
          // This matches WhatsApp behavior where each image is a separate message
          for (const image of imageAttachments) {
            await sendWithAttachment(
              id, // conversationId
              currentUserId, // senderId
              image.uri, // fileUri
              'image/jpeg', // mimeType
              sentImagesCaption || undefined, // caption (only first image gets caption)
            );
          }

          console.log('[ChatDetail] Images uploaded successfully');

          // Clear draft text in input bar
          setSearchQuery('');

          // Close attachment picker
          setShowAttachmentPicker(false);
        } catch (error) {
          console.error('[ChatDetail] Error uploading images:', error);
          Alert.alert('Upload Failed', 'Could not upload images. Please try again.');
        } finally {
          // Clear the params
          router.setParams({
            imagesSent: '',
            sentImages: '',
            sentImagesCaption: '',
          });
        }
      };

      uploadImages();
    }
  }, [imagesSent, sentImages, sentImagesCaption, currentUserId, id, sendWithAttachment, router]);

  // Handle video sent - upload to Supabase and send message
  useEffect(() => {
    if (videoSent === 'true' && sentVideo && currentUserId && id) {
      const uploadVideo = async () => {
        try {
          const videoData = JSON.parse(sentVideo);

          console.log('[ChatDetail] Uploading video...');

          // Upload video and create message in one atomic operation
          await sendWithAttachment(
            id, // conversationId
            currentUserId, // senderId
            videoData.uri, // fileUri
            'video/mp4', // mimeType
            videoData.caption || undefined, // caption
          );

          console.log('[ChatDetail] Video uploaded successfully');

          // Clear draft text in input bar
          setSearchQuery('');

          // Close attachment picker
          setShowAttachmentPicker(false);
        } catch (error) {
          console.error('[ChatDetail] Error uploading video:', error);
          Alert.alert('Upload Failed', 'Could not upload video. Please try again.');
        } finally {
          // Clear the params
          router.setParams({
            videoSent: '',
            sentVideo: '',
          });
        }
      };

      uploadVideo();
    }
  }, [videoSent, sentVideo, currentUserId, id, sendWithAttachment, router]);

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

  // Mark conversation as read when opening/viewing
  useEffect(() => {
    if (!id || !currentUserId) return;

    const markAsRead = async () => {
      try {
        console.log('[ChatDetail] Marking conversation as read:', id);
        await markConversationAsRead(id);
      } catch (error) {
        console.error('[ChatDetail] Failed to mark conversation as read:', error);
      }
    };

    // Mark as read immediately when opening
    markAsRead();
  }, [id, currentUserId]);


  const handleBackPress = () => {
    router.back();
  };

  const handleUserProfilePress = () => {
    if (chat?.client_id) {
      router.push(`/client/${chat.client_id}`);
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
    if (!isMicrophoneMode || !pathToSend || !currentUserId || !id) return;

    try {
      // Stop preview player and close microphone mode
      previewWaveRef.current?.stopPlayer?.();
      setIsMicrophoneMode(false);

      // Use captured duration (recorderState can be 0 depending on platform)
      const durationMs = lastVoiceNoteDurationMsRef.current;
      const durationSeconds = Math.floor(durationMs / 1000);
      const audioUri = pathToSend.startsWith('file://') ? pathToSend : `file://${pathToSend}`;

      console.log('[ChatDetail] Uploading audio...', { durationMs, durationSeconds });

      // Upload audio and create message in one atomic operation
      await sendWithAttachment(
        id, // conversationId
        currentUserId, // senderId
        audioUri, // fileUri
        'audio/mp4', // mimeType
        undefined, // no caption for audio
      );

      console.log('[ChatDetail] Audio uploaded successfully');
    } catch (e) {
      console.error('[ChatDetail] Failed to send voice note:', e);
      Alert.alert('Upload Failed', 'Could not upload voice note. Please try again.');
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

  const handleSendMessage = async () => {
    const text = searchQuery.trim();
    if (!text || !currentUserId) return;

    // Clear input and exit reply mode immediately
    setSearchQuery('');
    const parentMessageId = replyingToMessage?.id;
    setReplyingToMessage(null);

    // Create optimistic message
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
      // Send to database
      await sendMessage(id, text, {
        messageType: 'text',
        parentMessageId,
      });

      // Remove optimistic message (realtime will add the real one)
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      // Mark as failed (keep in optimistic list but update status)
      setOptimisticMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: 'failed' as const } : m
        )
      );
      // TODO: Show error toast
    }
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
        clientId: chat?.client_id || '',
        clientName: chat?.other_user_name || '',
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

  if (isLoading) {
    return <ChatLoadingState />;
  }

  if (!chat) {
    return <ChatLoadingState message={t('chats.chatNotFound')} />;
  }


  return (
    <SlidingPanel
      ref={panelRef}
      collapsedWidthRatio={0.85}
      overlayColor={isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.5)'}
      borderColor={themeColors.surfacePrimary}
      renderPanel={() => (
        <ClientPanelContent
          clientId={chat?.client_id}
          clientName={chat?.other_user_name}
          clientAvatar={chat?.other_user_avatar}
          onClose={handleClosePanel}
        />
      )}
    >
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
          onPanelOpen={handleOpenPanel}
        />

        {/* ROW 2: SCROLL WINDOW - Fills space between header and toolbar */}
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <MessageList
            messages={allMessages}
            backgroundColor="transparent"
            themeColors={themeColors}
            clientName={chat.other_user_name || 'Client'}
            keyboardHeight={keyboardHeight}
            onReply={handleMessageReply}
            onEdit={handleMessageEdit}
            onDelete={handleMessageDelete}
            onReactionPress={handleReactionPress}
            onDocumentPress={handleDocumentPress}
            onImagePress={handleImagePress}
            onVideoPress={handleVideoPress}
            headerHeight={insets.top + 60}
            bottomOffset={toolbarHeight}
          />
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
          onHeightChange={setToolbarHeight}
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
    </SlidingPanel>
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
