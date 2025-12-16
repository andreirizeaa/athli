import React, { RefObject } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Camera, Mic, Plus, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/contexts/useColorScheme';

import { iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/platform-icon';
import { MessageInputBar } from '@/components/message/message-input-bar';
import { KeyboardAwareToolbar } from '@/components/keyboard-aware-toolbar';
import { ReplyPreviewRow } from '@/components/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';
import { VoiceNoteRecordingContainer } from '@/components/chats/voice-note-recording-container';
import { type Chat, type ChatMessage } from '@/services/chats-service';

type ChatToolbarProps = {
  chat: Chat;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
  hasText: boolean;
  isMicrophoneMode: boolean;
  isStopped: boolean;
  showAttachmentPicker: boolean;
  replyingToMessage: ChatMessage | null;
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
};

export const ChatToolbar = ({
  chat,
  searchQuery,
  setSearchQuery,
  inputRef,
  hasText,
  isMicrophoneMode,
  isStopped,
  showAttachmentPicker,
  replyingToMessage,
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
}: ChatToolbarProps) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const headerBackgroundColor = themeColors.headerBackground;
  const iconColor = themeColors.text;
  const translucentHeaderBg = hexToRgba(headerBackgroundColor, 0.6);

  return (
    <View style={styles.toolbarContainer} pointerEvents="box-none">
      <BlurView
        intensity={100}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.toolbarBlur, { backgroundColor: translucentHeaderBg }]}
      >
        <KeyboardAwareToolbar
          backgroundColor="transparent"
          closedBaseHeight={isMicrophoneMode ? 108 : 40}
          openBaseHeight={isMicrophoneMode ? 80 : 12}
          contentStyle={{ paddingHorizontal: 16 }}
          replyPreview={
            replyingToMessage ? (
              <ReplyPreviewRow
                message={replyingToMessage}
                clientName={chat.clientName}
                onClose={onCancelReply}
                backgroundColor={translucentHeaderBg}
              />
            ) : undefined
          }
          attachmentPicker={
            showAttachmentPicker ? (
              <AttachmentPickerRow
                backgroundColor={translucentHeaderBg}
                chatId={chat?.id}
                clientId={chat?.clientId}
                clientName={chat?.clientName}
                caption={searchQuery}
              />
            ) : undefined
          }
        >
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
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={onPlusPress}>
                <PlatformIcon
                  sf={showAttachmentPicker ? "xmark.circle" : "plus"}
                  IconComponent={showAttachmentPicker ? X : Plus}
                  size={iconSizes.tabBarIcons - 2}
                  color={iconColor}
                />
              </TouchableOpacity>

              <View style={styles.searchBarContainer}>
                <MessageInputBar ref={inputRef as React.RefObject<TextInput>} value={searchQuery} onChangeText={setSearchQuery} placeholder="" />
              </View>

              {hasText ? (
                <TouchableOpacity style={styles.sendButton} activeOpacity={0.7} onPress={onSendMessage}>
                  <PlatformIcon
                    sf="paperplane.circle.fill"
                    IconComponent={Send}
                    size={iconSizes.tabBarIconsIOS + 2}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/camera',
                        params: {
                          chatId: chat.id,
                          clientId: chat.clientId,
                          clientName: chat.clientName,
                          caption: searchQuery,
                        },
                      })
                    }
                  >
                    <PlatformIcon
                      sf="camera"
                      IconComponent={Camera}
                      size={iconSizes.tabBarIcons - 2}
                      color={iconColor}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={onMicrophonePress}>
                    <PlatformIcon
                      sf="mic"
                      IconComponent={Mic}
                      size={iconSizes.tabBarIcons - 2}
                      color={iconColor}
                    />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </KeyboardAwareToolbar>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  toolbarBlur: {
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 44,
    borderRadius: 22,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flex: 1,
  },
});
