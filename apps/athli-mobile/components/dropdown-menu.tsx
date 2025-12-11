import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const menuWidth = 200;
  const menuTopOffset = 8;

  const leftPosition = anchorPosition.x + anchorPosition.width - menuWidth;
  const topPosition = anchorPosition.y + anchorPosition.height + menuTopOffset;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
              <Text style={[styles.menuItemText, { color: themeColors.text }]}>{option.label}</Text>
              <PlatformIcon
                sf={option.icon.sf}
                IconComponent={option.icon.IconComponent}
                size={iconSizes.smallIcons}
                color={themeColors.text}
              />
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
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  menuItemText: {
    ...typography.p3,
    flex: 1,
  },
});
