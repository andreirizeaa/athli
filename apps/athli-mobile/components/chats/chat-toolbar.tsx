import React, { RefObject } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { BlurView } from 'expo-blur';
import { Camera, Mic, Plus, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/contexts/useColorScheme';

import { iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/platform-icon';
import { MessageInputBar } from '@/components/message/message-input-bar';
import { ReplyPreviewRow } from '@/components/chats/reply-preview-row';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';
import { VoiceNoteRecordingContainer } from '@/components/chats/voice-note-recording-container';
import { type Chat, type ChatMessage } from '@/services/chats-service';
import { type InboxMessage } from '@/services/inbox-service';
import Animated, { useAnimatedStyle, type SharedValue, interpolate, Extrapolation } from 'react-native-reanimated';

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
  keyboardHeight?: SharedValue<number>;
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
  keyboardHeight,
}: ChatToolbarProps) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const headerBackgroundColor = themeColors.headerBackground;
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

  // Move toolbar up by keyboard height
  const toolbarAnimatedStyle = useAnimatedStyle(() => {
    const h = keyboardHeight?.value ?? 0;
    return {
      transform: [{ translateY: -h }],
    };
  });

  // Safe-area padding only when keyboard is closed
  const safePaddingStyle = useAnimatedStyle(() => {
    const h = keyboardHeight?.value ?? 0;
    const pb = interpolate(h, [0, 40], [bottomInset, 6], Extrapolation.CLAMP);
    return {
      paddingBottom: pb,
    };
  });

  return (
    <Animated.View style={[styles.absoluteContainer, toolbarAnimatedStyle]} pointerEvents="box-none">
      {/* Background extension below toolbar */}
      <View style={[styles.backgroundExtension, { backgroundColor: translucentHeaderBg }]} />
      <BlurView
        intensity={30}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.toolbarBlur, { backgroundColor: translucentHeaderBg }]}
      >
        <Animated.View style={safePaddingStyle}>
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
                <PressableOpacity style={styles.iconButton} onPress={onPlusPress}>
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
                      size={iconSizes.tabBarIconsIOS + 2}
                      color={themeColors.primary}
                    />
                  </PressableOpacity>
                ) : (
                  <>
                    <PressableOpacity
                      style={styles.iconButton}
                      onPress={() =>
                        router.push({
                          pathname: '/camera/camera',
                          params: {
                            chatId: participantInfo.chatId,
                            clientId: participantInfo.participantId,
                            clientName: participantInfo.participantName,
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
                    </PressableOpacity>

                    <PressableOpacity style={styles.iconButton} onPress={onMicrophonePress}>
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
        </Animated.View>
      </BlurView>
    </Animated.View>
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
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 36,
    borderRadius: 18,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flex: 1,
  },
});
