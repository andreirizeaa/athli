import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
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
};

export const DropdownMenu = ({ visible, onClose, options, anchorPosition }: DropdownMenuProps) => {
  const { colors: themeColors } = useThemePreference();

  if (!visible) {
    return null;
  }

  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const menuWidth = 200;
  const menuItemHeight = 48;
  const menuHeight = options.length * menuItemHeight;
  const menuOffset = 8;
  const rightGap = 16; // Gap from right screen edge

  // Calculate available space below and above
  const spaceBelow = screenHeight - anchorPosition.y - anchorPosition.height;
  const spaceAbove = anchorPosition.y;

  // Determine if menu should appear above or below
  const showAbove = spaceBelow < menuHeight + menuOffset && spaceAbove > spaceBelow;

  // Calculate horizontal position (right-aligned with gap)
  const leftPosition = screenWidth - menuWidth - rightGap;

  // Calculate vertical position
  const topPosition = showAbove
    ? anchorPosition.y - menuHeight - menuOffset
    : anchorPosition.y + anchorPosition.height + menuOffset;

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
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
              style={[
                styles.menuItem,
                index < options.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: themeColors.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                option.onPress();
                onClose();
              }}
            >
              <PlatformIcon
                sf={option.icon.sf}
                IconComponent={option.icon.IconComponent}
                size={iconSizes.smallIcons}
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
  },
  menuContainer: {
    position: 'absolute',
    width: 160,
    borderRadius: 22,
    borderWidth: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 2,
    minHeight: 40,
  },
  menuItemText: {
    ...typography.p3,
    flex: 1,
  },
});
