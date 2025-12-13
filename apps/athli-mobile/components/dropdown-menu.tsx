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
  alignRight?: boolean; // If true, aligns to right edge; if false, aligns to left edge
  disableModal?: boolean; // When true, renders without Modal wrapper (for use inside another Modal)
};

export const DropdownMenu = ({
  visible,
  onClose,
  options,
  anchorPosition,
  alignRight = true,
  disableModal = false,
}: DropdownMenuProps) => {
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
  const edgeGap = 16; // Gap from screen edge

  // Calculate available space below and above
  const spaceBelow = screenHeight - anchorPosition.y - anchorPosition.height;
  const spaceAbove = anchorPosition.y;

  // Determine if menu should appear above or below
  const showAbove = spaceBelow < menuHeight + menuOffset && spaceAbove > spaceBelow;

  // Calculate horizontal position
  // If alignRight is true (user messages), align to right edge of message
  // If alignRight is false (client messages), align to left edge of message
  const leftPosition = alignRight
    ? Math.min(
        anchorPosition.x + anchorPosition.width - menuWidth,
        screenWidth - menuWidth - edgeGap
      )
    : Math.max(
        anchorPosition.x,
        edgeGap
      );

  // Calculate vertical position
  const topPosition = showAbove
    ? anchorPosition.y - menuHeight - menuOffset
    : anchorPosition.y + anchorPosition.height + menuOffset;

  const menuContent = (
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
      onStartShouldSetResponder={() => true}
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
  );

  if (disableModal) {
    return menuContent;
  }

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {menuContent}
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
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 30,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 30,
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
