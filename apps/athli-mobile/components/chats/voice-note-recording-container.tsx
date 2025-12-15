import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Mic, Pause, Send, Trash2 } from 'lucide-react-native';

import { iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';
import { useThemePreference } from '@/contexts/useColorScheme';

type VoiceNoteRecordingContainerProps = {
  isRecordingPaused: boolean;
  onTrashPress: () => void;
  onPauseToggle: () => void;
  onSendPress: () => void;
};

export const VoiceNoteRecordingContainer = ({
  isRecordingPaused,
  onTrashPress,
  onPauseToggle,
  onSendPress,
}: VoiceNoteRecordingContainerProps) => {
  const { colors: themeColors } = useThemePreference();
  const iconColor = themeColors.text;

  return (
    <View style={styles.container}>
      <View style={styles.topRow} />
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.trashButton}
          activeOpacity={0.7}
          onPress={onTrashPress}
        >
          <PlatformIcon
            sf="trash"
            IconComponent={Trash2}
            size={iconSizes.tabBarIcons}
            color={iconColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerButton}
          activeOpacity={0.7}
          onPress={onPauseToggle}
        >
          <PlatformIcon
            sf={isRecordingPaused ? "mic" : "pause.fill"}
            IconComponent={isRecordingPaused ? Mic : Pause}
            size={iconSizes.tabBarIcons}
            color="#EF4444"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: themeColors.primary }]}
          activeOpacity={0.7}
          onPress={onSendPress}
        >
          <PlatformIcon
            sf="paperplane.fill"
            IconComponent={Send}
            size={iconSizes.tabBarIcons}
            color={themeColors.primaryForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
  },
  topRow: {
    height: 52,
    width: '100%',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  trashButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
