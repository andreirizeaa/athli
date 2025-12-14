import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { iconSizes, typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { MessageInputBar } from '@/components/message-input-bar';
import { KeyboardAwareToolbar } from '@/components/keyboard-aware-toolbar';

type CameraPreviewToolbarProps = {
  value: string;
  onChangeText: (text: string) => void;
  clientName?: string;
  onSend: () => void;
};

export const CameraPreviewToolbar = ({
  value,
  onChangeText,
  clientName,
  onSend,
}: CameraPreviewToolbarProps) => {
  const { colors: themeColors } = useThemePreference();
  const insets = useSafeAreaInsets();
  const mutedSurfaceColor = themeColors.surfaceSecondary;

  return (
    <KeyboardAwareToolbar
      closedBaseHeight={110}
      openBaseHeight={130}
      contentStyle={{ flex: 1 }}
    >
      <View style={styles.wrapper}>
        <View style={[styles.inputContainer]}>
          <MessageInputBar
            value={value}
            onChangeText={onChangeText}
            placeholder="Add a caption..."
            style={styles.messageInputBar}
          />
        </View>

        <View
          style={[
            styles.container,
            {
              backgroundColor: themeColors.headerBackground,
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

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
              activeOpacity={0.7}
              onPress={onSend}
            >
              <PlatformIcon
                sf="paperplane.fill"
                IconComponent={Send}
                size={iconSizes.navigationChevrons}
                color={themeColors.primaryForeground}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAwareToolbar>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flex: 1,
    flexDirection: 'column',
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 0,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

