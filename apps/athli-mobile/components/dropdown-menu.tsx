import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { LucideIcon } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

export type DropdownMenuOption = {
  label: string;
  icon: {
    sf: string;
    IconComponent: LucideIcon;
  };
  onPress: () => void;
};

type DropdownMenuProps = {
  visible: boolean;
  onClose: () => void;
  options: DropdownMenuOption[];
  anchorPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  alignRight?: boolean; // If true, aligns to right edge; if false, aligns to left edge
  containerPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  messageData?: {
    text: string;
    timestamp: Date;
    isSent: boolean;
    themeColors: {
      primary: string;
      primaryForeground: string;
      surfaceSecondary: string;
      text: string;
      mutedText: string;
    };
  };
};

export const DropdownMenu = ({
  visible,
  onClose,
  options,
  anchorPosition,
  alignRight = true,
  containerPosition,
  messageData,
}: DropdownMenuProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (!visible) {
    return null;
  }

  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const menuWidth = 200;
  const menuItemHeight = 48;
  const menuHeight = options.length * menuItemHeight;
  const menuOffset = 8;
  const edgeGap = 16; // Gap from screen edge

  // Calculate available space below and above
  const spaceBelow = screenHeight - anchorPosition.y - anchorPosition.height;
  const spaceAbove = anchorPosition.y;

  // Determine if menu should appear above or below
  const showAbove = spaceBelow < menuHeight + menuOffset && spaceAbove > spaceBelow;

  // Calculate horizontal position
  // If alignRight is true (user messages), align to right edge
  // If alignRight is false (client messages), align to left edge
  const leftPosition = alignRight
    ? screenWidth - menuWidth - edgeGap
    : edgeGap;

  // Calculate vertical position
  const topPosition = showAbove
    ? anchorPosition.y - menuHeight - menuOffset
    : anchorPosition.y + anchorPosition.height + menuOffset;

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Blur only the message list container area */}
        {containerPosition && (
          <BlurView
            intensity={50}
            style={[
              {
                position: 'absolute',
                left: containerPosition.x,
                top: containerPosition.y,
                width: containerPosition.width,
                height: containerPosition.height,
              },
            ]}
            tint={blurTint}
          />
        )}
        {/* Render message above blur */}
        {messageData && (
          <View
            style={[
              styles.messageOverlay,
              {
                left: anchorPosition.x,
                top: anchorPosition.y,
                width: anchorPosition.width,
                maxWidth: '70%',
              },
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                messageData.isSent
                  ? { backgroundColor: messageData.themeColors.primary }
                  : { backgroundColor: messageData.themeColors.surfaceSecondary },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  messageData.isSent
                    ? { color: messageData.themeColors.primaryForeground }
                    : { color: messageData.themeColors.text },
                ]}
              >
                {messageData.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  messageData.isSent
                    ? { color: messageData.themeColors.primaryForeground, opacity: 0.7 }
                    : { color: messageData.themeColors.mutedText },
                ]}
              >
                {formatTime(messageData.timestamp)}
              </Text>
            </View>
          </View>
        )}
        <View
          style={[
            styles.menuContainer,
            {
              left: leftPosition,
              top: topPosition,
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              shadowColor: themeColors.shadowColor,
            },
          ]}
        >
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                option.onPress();
                onClose();
              }}
            >
              <PlatformIcon
                sf={option.icon.sf}
                IconComponent={option.icon.IconComponent}
                size={iconSizes.listIcons}
                color={themeColors.text}
              />
              <Text style={[styles.menuItemText, { color: themeColors.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  messageOverlay: {
    position: 'absolute',
    zIndex: 1,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
  },
  messageText: {
    ...typography.p3,
    marginBottom: 4,
  },
  messageTime: {
    ...typography.p6,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  menuContainer: {
    position: 'absolute',
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  menuItemText: {
    ...typography.p2,
    marginLeft: 4,
    flex: 1,
  },
});
