import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { iconSizes, typography } from '@/constants/typography';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/platform-icon';
import { MessageInputBar } from '@/components/message/message-input-bar';
import { useDarkModeTheme } from '../dark-mode-wrapper';

type AttachmentPreviewToolbarProps = {
  value: string;
  onChangeText: (text: string) => void;
  clientName?: string;
  onSend: () => void;
};

export const AttachmentPreviewToolbar = ({
  value,
  onChangeText,
  clientName,
  onSend,
}: AttachmentPreviewToolbarProps) => {
  const { colors: themeColors } = useDarkModeTheme();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = true; // Always dark mode
  const mutedSurfaceColor = themeColors.surfaceSecondary;

  // Create translucent background color for frosted glass effect (60% opacity)
  const translucentHeaderBg = hexToRgba(themeColors.headerBackground, 0.6);

  return (
    <>
      {/* Caption input bar - transparent, above the bottom bar */}
      <View style={styles.inputContainer}>
        <MessageInputBar
          value={value}
          onChangeText={onChangeText}
          placeholder="Add a caption..."
          style={[styles.messageInputBar, { backgroundColor: mutedSurfaceColor, borderColor: 'transparent' }]}
          textColor="#FFFFFF"
        />
      </View>

      {/* Bottom bar with frosted glass effect */}
      <BlurView
        intensity={100}
        tint="dark"
        style={[styles.blurContainer, { backgroundColor: translucentHeaderBg }]}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: 'transparent',
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.content}>
            {clientName && (
              <View style={[styles.clientNameContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
                <Text style={[styles.clientNameText, { color: themeColors.text }]} numberOfLines={1}>
                  {clientName}
                </Text>
              </View>
            )}

            <PressableOpacity
              style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
              onPress={onSend}
            >
              <PlatformIcon
                sf="paperplane.fill"
                IconComponent={Send}
                size={iconSizes.navigationChevrons + 2}
                color={themeColors.primaryForeground}
              />
            </PressableOpacity>
          </View>
        </View>
      </BlurView>
    </>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    width: '100%',
  },
  inputContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  messageInputBar: {
    minHeight: 44,
    height: 44,
  },
  container: {
    width: '100%',
    paddingTop: 8,
    minHeight: 54, // Ensure minimum height for content visibility
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  clientNameContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clientNameText: {
    ...typography.p2,
    fontWeight: '500',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

