import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
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

import { useThemePreference, useColorScheme, useChatsStore, useAuthSessionStore, useCoachProfileStore, useClientDetailStore } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { useTranslations } from '@/stores';
import { haptics } from '@/utils/haptics';
import { typography } from '@/constants/typography';
import { SlidingPanel, SlidingPanelRef } from '@/components/ui/sliding-panel';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';
import { MessageList } from '@/components/features/message/message-list-flashlist';
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
  sendMessage,
  markConversationAsRead,
  deleteMessage,
  type Chat,
  type ChatMessage,
  type Message,
  type OptimisticMessage,
} from '@/services/chats-service';
import { type UIMessage } from '@athli/shared-types';
import { createOptimisticMessage } from '@athli/shared-types';
import {
  useRealtimeMessages,
  useMessageMerging,
} from '@/hooks/use-realtime-messaging';
import { useSendMessageWithAttachment } from '@/hooks/use-file-upload';
import { useInfiniteMessages } from '@/hooks/use-infinite-messages';
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

  // Use Zustand store for client data (same pattern as client detail screen)
  const client = useClientDetailStore((state) => state.client);
  const isLoadingClient = useClientDetailStore((state) => state.isLoadingClient);
  const error = useClientDetailStore((state) => state.error);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Load client data when panel opens or clientId changes
  React.useEffect(() => {
    if (clientId) {
      loadClientData(clientId);
    }
  }, [clientId, loadClientData]);

  // Use store data when available, fallback to initial props for immediate display
  const clientName = client?.name || initialClientName;
  const clientAvatar = client?.avatarUrl || initialClientAvatar;

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

  // Loading state - show while client data is being fetched
  if (isLoadingClient && !client) {
    return (
      <View style={[panelStyles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <StatusBarBlur />
        <View style={[panelStyles.loadingContainer, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[panelStyles.loadingText, { color: themeColors.mutedText }]}>
            {t('general.loading')}
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !client) {
    return (
      <View style={[panelStyles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <StatusBarBlur />
        <View style={[panelStyles.errorContainer, { paddingTop: insets.top + 60, paddingRight: rightPadding }]}>
          <Text style={[panelStyles.errorText, { color: themeColors.mutedText }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[panelStyles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <StatusBarBlur />
      <ScrollView
        style={panelStyles.scrollView}
        contentContainerStyle={[panelStyles.scrollContent, { paddingRight: rightPadding, paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    ...typography.p2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    ...typography.p1,
    textAlign: 'center',
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
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
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

  // Parse initial messages from navigation params (prefetched by list screen)
  const initialMessages = useMemo(() => {
    if (messagesParam) {
      try {
        return JSON.parse(messagesParam) as Message[];
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [messagesParam]);

  // Use infinite scroll for messages
  const {
    messages: savedMessages,
    isLoadingInitial,
    isLoadingMore,
    hasMore: hasMoreMessages,
    loadMore: loadMoreMessages,
    removeMessage: removeSavedMessage,
    updateMessage: updateSavedMessage,
    refetch: refetchMessages,
  } = useInfiniteMessages({
    conversationId: id,
    enabled: !!id,
    initialMessages,
  });

  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);

  // Get current user ID synchronously from auth store (already available)
  const currentUserId = useAuthSessionStore((state) => state.userId);

  // Get coach profile for reactions display
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Use isLoadingInitial from infinite messages hook
  const isLoading = isLoadingInitial && !chatParam;
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isMicrophoneMode, setIsMicrophoneMode] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic toolbar height - calculated from current state
  // Base toolbar: ~46px (input row with buttons)
  // Reply preview: adds ~50px
  // Attachment picker: adds ~110px (32px padding + 56px icon + 8px gap + 14px text)
  const toolbarHeight = useMemo(() => {
    let height = 46;
    if (replyingToMessage) height += 50;
    if (showAttachmentPicker) height += 110;
    return height;
  }, [replyingToMessage, showAttachmentPicker]);

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
  const { sendWithAttachment, sendWithMultipleAttachments, isUploading: isUploadingAttachment } = useSendMessageWithAttachment();

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

  // Keep a ref to optimistic messages for shouldSkipInsert callback
  const optimisticMessagesRef = useRef<OptimisticMessage[]>([]);
  useEffect(() => {
    optimisticMessagesRef.current = optimisticMessages;
  }, [optimisticMessages]);

  // Realtime messages subscription (uses broadcast events for scalability)
  // CRITICAL: Use shouldSkipInsert to prevent duplicates ONLY for attachment messages
  const { realtimeMessages } = useRealtimeMessages({
    conversationId: id,
    userId: currentUserId || undefined,
    // Only skip insert for ATTACHMENT messages that aren't ready yet
    // For text-only messages, let the realtime message be added - deduplication handles it
    shouldSkipInsert: (message) => {
      const currentOptimistic = optimisticMessagesRef.current;
      if (currentOptimistic.length === 0) return false;
      
      const optimisticMatch = currentOptimistic.find((opt) => opt.id === message.id);
      if (!optimisticMatch) return false;
      
      // For text-only messages, DON'T skip - let realtime be added, then remove optimistic
      const hasAttachments = optimisticMatch.attachments && optimisticMatch.attachments.length > 0;
      if (!hasAttachments) return false;
      
      // For attachment messages, only skip if NOT ready yet (waiting for uploads)
      const isReady = (message as any).attachments_ready !== false;
      return !isReady; // Skip only if attachments are NOT ready
    },
    onMessageReceived: (message) => {
      console.log('[Chat Detail] onMessageReceived:', message.message_type, message.id, 'attachments:', message.attachments?.length || 0);
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
      console.log('[Chat Detail] onMessageUpdated:', message.message_type, message.id, 'attachments:', message.attachments?.length || 0, 'is_deleted:', message.is_deleted);
      // Message now includes attachments from enhanced broadcast trigger - no refetch needed

      // If a message is soft-deleted (is_deleted=true), remove it from local state
      // Use explicit true check to handle any type coercion issues
      if (message.is_deleted === true) {
        removeSavedMessage(message.id);
      } else {
        // Otherwise, update the message in local state
        updateSavedMessage(message.id, message);
      }
    },
    onMessageDeleted: (messageId) => {
      // Remove the deleted message from local state
      removeSavedMessage(messageId);
    },
  });

  // Merge saved, realtime, and optimistic messages - transforms to UIMessage[]
  const allMessages = useMessageMerging(savedMessages, realtimeMessages, optimisticMessages, currentUserId);

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

    // Debug logging - only log occasionally to avoid spam
    if (durationMs > 0 && durationMs % 1000 < 100) {
      console.log('[ChatDetail] Duration update - fromRecorder:', fromRecorder, 'fromWallClock:', fromWallClock, 'using:', durationMs);
    }

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

        const optMsgSentAt = optimisticMsg.sent_at.getTime();
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
          // when the realtime broadcast arrives with attachments_ready=true
          useChatsStore.getState().loadChats();
        } catch (error) {
          console.error('[ChatDetail] Error uploading document:', error);
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
          Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
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

        const optMsgSentAt = optimisticMsg.sent_at.getTime();
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
          // Use the optimistic message ID for deduplication
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
          // when the realtime broadcast arrives with attachments_ready=true

          // Refresh chats list
          useChatsStore.getState().loadChats();
        } catch (error) {
          console.error('[ChatDetail] Error uploading images:', error);
          // Remove optimistic message on error
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
          Alert.alert('Upload Failed', 'Could not upload images. Please try again.');
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

        const optMsgSentAt = optimisticMsg.sent_at.getTime();
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
          // when the realtime broadcast arrives with attachments_ready=true
          useChatsStore.getState().loadChats();
        } catch (error) {
          console.error('[ChatDetail] Error uploading video:', error);
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
          Alert.alert('Upload Failed', 'Could not upload video. Please try again.');
        }
      };

      uploadVideo();
    }
  }, [videoSent, sentVideo, currentUserId, id, sendWithAttachment, router]);

  const hasText = searchQuery.trim().length > 0;

  // Load chat metadata if not provided via params
  useEffect(() => {
    if (chatParam) return;

    let mounted = true;

    const loadChat = async () => {
      try {
        const chats = await getChats();
        let foundChat = chats.find((c) => c.id === id);

        if (!foundChat) {
          const archivedChats = await getArchivedChats();
          foundChat = archivedChats.find((c) => c.id === id);
        }

        if (!foundChat || !mounted) return;

        setChat(foundChat);
      } catch (error) {
        console.error('Failed to load chat:', error);
      }
    };

    if (id) loadChat();

    return () => {
      mounted = false;
    };
  }, [id, chatParam]);

  // Mark conversation as read when opening/viewing
  useEffect(() => {
    if (!id || !currentUserId) return;

    const markAsRead = async () => {
      try {
        await markConversationAsRead(id);
      } catch {
        // Silently handle mark as read errors - not critical
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

  const handleMessageReply = (message: UIMessage) => {
    setReplyingToMessage(message as unknown as ChatMessage);
    // Focus the input to open keyboard
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
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

    const optMsgSentAt = optimisticMsg.sent_at.getTime();
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Convert duration from ms to seconds for database storage
      const durationMs = lastVoiceNoteDurationMsRef.current;
      const durationSeconds = Math.round(durationMs / 1000);
      console.log('[ChatDetail] Sending voice note - durationMs:', durationMs, 'durationSeconds:', durationSeconds);

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
      // when the realtime broadcast arrives with attachments_ready=true
      useChatsStore.getState().loadChats();
    } catch (e) {
      console.error('[ChatDetail] Failed to send voice note:', e);
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMsg.id)
      );
      Alert.alert('Upload Failed', 'Could not upload voice note. Please try again.');
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
        const finalDuration = fromRecorder > 0 ? fromRecorder : fromWallClock;
        console.log('[ChatDetail] Stop recording - fromRecorder:', fromRecorder, 'fromWallClock:', fromWallClock, 'using:', finalDuration);
        lastVoiceNoteDurationMsRef.current = finalDuration;
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
  const findOriginalMessage = (message: UIMessage): UIMessage => {
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
      await sendMessage(id, text, {
        messageType: 'text',
        parentMessageId,
        messageId: optimisticMsg.id,
        idempotencyKey: optimisticMsg.idempotency_key,
      });

      // Don't remove optimistic message here - onMessageReceived will handle it
      // when the realtime broadcast arrives with the same ID

      // Refresh chats list to update last_message_preview and last_message_at
      useChatsStore.getState().loadChats();
    } catch (error) {
      // Mark as failed (keep in optimistic list but update status)
      // Note: We remove failed messages from the optimistic list since the type doesn't support 'failed' status
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMsg.id)
      );
      // TODO: Show error toast and allow retry
    }
  };

  const handleMessageDelete = async (message: UIMessage) => {
    // Optimistically remove from ALL local states for instant UI feedback
    // This includes savedMessages and optimisticMessages (for audio/attachment messages that stay longer)
    removeSavedMessage(message.id);
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== message.id));

    try {
      // Call the real delete API (soft delete)
      await deleteMessage(message.id);
    } catch (error) {
      console.error('[ChatDetail] Error deleting message:', error);
      // Optionally: restore the message on error, or show a toast
      // For now, the realtime subscription will sync the correct state
    }
  };

  const handleReactionPress = (message: UIMessage) => {
    if (!message.reactions || message.reactions.length === 0) return;

    haptics.light();
    router.push({
      pathname: '/modals/message/reactions-modal',
      params: {
        messageId: message.id,
        reactions: JSON.stringify(message.reactions),
        currentUserId: currentUserId || '',
        otherUserName: chat?.other_user_name || 'Client',
        otherUserAvatarUrl: chat?.other_user_avatar || '',
        currentUserName: coachProfile?.name || t('general.you'),
        currentUserAvatarUrl: coachProfile?.profile_picture_url || '',
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
          clientAvatar={chat?.other_user_avatar ?? undefined}
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

        {/* Messages + Toolbar container - moves together with keyboard */}
        <Animated.View style={[{ flex: 1 }, chatContentAnimatedStyle]}>
          {/* SCROLL WINDOW - Fills space between header and toolbar */}
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <MessageList
              messages={allMessages}
              backgroundColor="transparent"
              themeColors={themeColors}
              clientName={chat.other_user_name || 'Client'}
              onReply={handleMessageReply}
              onDelete={handleMessageDelete}
              onReactionPress={handleReactionPress}
              onDocumentPress={handleDocumentPress}
              onImagePress={handleImagePress}
              onVideoPress={handleVideoPress}
              headerHeight={insets.top + 60}
              bottomOffset={toolbarHeight + 8 + insets.bottom}
              onLoadMore={loadMoreMessages}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
            />
          </View>

          {/* TOOLBAR - Absolutely positioned within this container */}
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
            bottomInset={0}
            animatedBottomStyle={toolbarBottomStyle}
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
