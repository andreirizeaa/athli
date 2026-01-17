import React, { RefObject, useCallback } from 'react';
import { StyleSheet, TextInput, View, Alert, InteractionManager } from 'react-native';
import { PressableOpacity } from 'pressto';
import { BlurView } from 'expo-blur';
import { Camera, Mic, Plus, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme, useTranslations } from '@/stores';

import { iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { MessageInputBar } from '@/components/features/message/message-input-bar';
import { ReplyPreviewRow } from '@/components/features/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/features/chats/attachment-picker-row';
import { VoiceNoteRecordingContainer } from '@/components/features/chats/voice-note-recording-container';
import { type Chat, type ChatMessage } from '@/services/chats-service';
import { type InboxMessage } from '@/services/inbox-service';

// Generic participant type that works for both Chat and Coach
type ParticipantInfo = {
  chatId: string;
  participantId: string;
  participantName: string;
};

type ChatToolbarProps = {
  // Support both Chat and Coach via participant info
  chat?: Chat;
  coach?: { id: string; name: string };
  // Message can be either ChatMessage or InboxMessage
  replyingToMessage?: ChatMessage | InboxMessage | null;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
  hasText: boolean;
  isMicrophoneMode: boolean;
  isStopped: boolean;
  showAttachmentPicker: boolean;
  durationLabel: string;
  waveform: number[];
  previewPath: string | null;
  previewPlayerState: import('@/components/audio').PlayerState;
  onPlayerStateChange: (state: import('@/components/audio').PlayerState) => void;
  onTogglePreviewPlay: () => void;
  previewWaveRef: React.RefObject<import('@/components/audio').IWaveformRef | null>;
  onPlusPress: () => void;
  onMicrophonePress: () => void;
  onSendMessage: () => void;
  onTrashPress: () => void;
  onStopToggle: () => Promise<string | null | void>;
  onSendPress: (pathOverride?: string | null) => void;
  onCancelReply: () => void;
  bottomInset?: number;
};

export const ChatToolbar = ({
  chat,
  coach,
  replyingToMessage,
  searchQuery,
  setSearchQuery,
  inputRef,
  hasText,
  isMicrophoneMode,
  isStopped,
  showAttachmentPicker,
  durationLabel,
  waveform,
  previewPath,
  previewPlayerState,
  onPlayerStateChange,
  onTogglePreviewPlay,
  previewWaveRef,
  onPlusPress,
  onMicrophonePress,
  onSendMessage,
  onTrashPress,
  onStopToggle,
  onSendPress,
  onCancelReply,
  bottomInset = 0,
}: ChatToolbarProps) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslations();

  const headerBackgroundColor = themeColors.translucentBackground;
  const iconColor = themeColors.text;
  const translucentHeaderBg = hexToRgba(headerBackgroundColor, 0.95);

  // Determine participant info from either chat or coach
  const participantInfo: ParticipantInfo = chat
    ? {
      chatId: chat.id,
      participantId: chat.clientId,
      participantName: chat.clientName,
    }
    : coach
      ? {
        chatId: 'inbox',
        participantId: coach.id,
        participantName: coach.name,
      }
      : {
        chatId: '',
        participantId: '',
        participantName: '',
      };


  const handleCameraPress = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('general.permissionRequired'), t('camera.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';

      // Wait for JS bridge to fully restore after returning from native camera
      InteractionManager.runAfterInteractions(() => {
        if (isVideo) {
          router.push({
            pathname: '/chats/video-preview',
            params: {
              uri: asset.uri,
              duration: (asset.duration || 0).toString(),
              orientation: asset.width && asset.height && asset.width > asset.height ? 'landscape' : 'portrait',
              chatId: participantInfo.chatId,
              clientId: participantInfo.participantId,
              clientName: participantInfo.participantName,
              caption: searchQuery,
              fromCamera: 'true',
            },
          });
        } else {
          const imageAttachment = {
            uri: asset.uri,
            id: `photo-${Date.now()}-${Math.random()}`,
          };
          router.push({
            pathname: '/chats/message-image-preview',
            params: {
              images: JSON.stringify([imageAttachment]),
              chatId: participantInfo.chatId,
              clientId: participantInfo.participantId,
              clientName: participantInfo.participantName,
              fromPicker: 'true',
              caption: searchQuery,
            },
          });
        }
      });
    }
  }, [participantInfo, router, searchQuery, t]);

  return (
    <View style={styles.absoluteContainer} pointerEvents="box-none">
      {/* Background extension below toolbar */}
      <View style={[styles.backgroundExtension, { backgroundColor: translucentHeaderBg }]} />
      <BlurView
        intensity={30}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.toolbarBlur, { backgroundColor: translucentHeaderBg }]}
      >
        <View style={{ paddingBottom: bottomInset }}>
          {replyingToMessage && (
            <ReplyPreviewRow
              message={replyingToMessage}
              clientName={participantInfo.participantName}
              onClose={onCancelReply}
              backgroundColor={translucentHeaderBg}
            />
          )}

          <View style={styles.content}>
            {isMicrophoneMode ? (
              <VoiceNoteRecordingContainer
                isStopped={isStopped}
                durationLabel={durationLabel}
                waveform={waveform}
                previewPath={previewPath}
                previewPlayerState={previewPlayerState}
                onPlayerStateChange={onPlayerStateChange}
                onTogglePreviewPlay={onTogglePreviewPlay}
                previewWaveRef={previewWaveRef}
                onTrashPress={onTrashPress}
                onStopToggle={onStopToggle}
                onSendPress={onSendPress}
              />
            ) : (
              <>
                <PressableOpacity style={styles.backgroundSecondary} onPress={onPlusPress}>
                  <PlatformIcon
                    sf={showAttachmentPicker ? "xmark.circle" : "plus"}
                    IconComponent={showAttachmentPicker ? X : Plus}
                    size={iconSizes.tabBarIcons - 2}
                    color={iconColor}
                  />
                </PressableOpacity>

                <View style={styles.searchBarContainer}>
                  <MessageInputBar ref={inputRef as React.RefObject<TextInput>} value={searchQuery} onChangeText={setSearchQuery} placeholder="" />
                </View>

                {hasText ? (
                  <PressableOpacity style={styles.sendButton} onPress={onSendMessage}>
                    <PlatformIcon
                      sf="paperplane.circle.fill"
                      IconComponent={Send}
                      size={iconSizes.tabBarIconsIOS + 6}
                      color={themeColors.primary}
                    />
                  </PressableOpacity>
                ) : (
                  <>
                    <PressableOpacity
                      style={styles.backgroundSecondary}
                      onPress={handleCameraPress}
                    >
                      <PlatformIcon
                        sf="camera"
                        IconComponent={Camera}
                        size={iconSizes.tabBarIcons + 2}
                        color={iconColor}
                      />
                    </PressableOpacity>

                    <PressableOpacity style={styles.backgroundSecondary} onPress={onMicrophonePress}>
                      <PlatformIcon
                        sf="mic"
                        IconComponent={Mic}
                        size={iconSizes.tabBarIcons - 2}
                        color={iconColor}
                      />
                    </PressableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          {showAttachmentPicker && (
            <AttachmentPickerRow
              backgroundColor={translucentHeaderBg}
              chatId={participantInfo.chatId}
              clientId={participantInfo.participantId}
              clientName={participantInfo.participantName}
              caption={searchQuery}
            />
          )}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundExtension: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 1000, // Large enough to fill below toolbar
  },
  toolbarBlur: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backgroundSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 38,
    borderRadius: 18,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
  },
  searchBarContainer: {
    flex: 1,
  },
});
