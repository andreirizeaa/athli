import React from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

export type DropdownMenuOption = {
  label: string;
  icon?: {
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
  const menuItemHeight = 44;
  const maxMenuHeight = 300; // Max height before scrolling
  const menuOffset = 16; // Spacing from anchor (increased to prevent overlap)
  const edgeGap = 16; // Gap from screen edge

  // Calculate actual menu height (capped at max)
  const fullMenuHeight = options.length * menuItemHeight;
  const actualMenuHeight = Math.min(fullMenuHeight, maxMenuHeight);
  const needsScrolling = fullMenuHeight > maxMenuHeight;

  // Calculate available space below and above
  // anchorPosition.y is the top of the element, anchorPosition.height is its height
  const anchorBottom = anchorPosition.y + anchorPosition.height;
  const spaceBelow = screenHeight - anchorBottom;
  const spaceAbove = anchorPosition.y;

  // Determine if menu should appear above or below
  // Prefer showing below, only show above if there's not enough space below
  const showAbove = spaceBelow < actualMenuHeight + menuOffset && spaceAbove > spaceBelow;

  // Calculate horizontal position
  // For alignRight: position right edge at screen edge - gap
  // For alignLeft: align to left edge of anchor
  const finalLeftPosition = alignRight
    ? screenWidth - menuWidth - edgeGap
    : Math.max(anchorPosition.x, edgeGap);

  // Calculate vertical position
  // If showing below: position starts right after the anchor bottom with offset
  // If showing above: position ends right before the anchor top
  const topPosition = showAbove
    ? Math.max(edgeGap, anchorPosition.y - actualMenuHeight - menuOffset)
    : anchorBottom + menuOffset;

  const menuItems = options.map((option, index) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      activeOpacity={0.7}
      onPress={() => {
        option.onPress();
        onClose();
      }}
    >
      {option.icon && (
        <PlatformIcon
          sf={option.icon.sf}
          IconComponent={option.icon.IconComponent}
          size={iconSizes.listIcons}
          color={themeColors.text}
        />
      )}
      <Text style={[styles.menuItemText, { color: themeColors.text, marginLeft: option.icon ? 4 : 0 }]}>{option.label}</Text>
    </TouchableOpacity>
  ));

  const menuContent = (
    <View
      style={[
        styles.menuContainer,
        {
          left: finalLeftPosition,
          top: topPosition,
          height: actualMenuHeight,
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          shadowColor: themeColors.shadowColor,
        },
      ]}
      onStartShouldSetResponder={() => true}
    >
      {needsScrolling ? (
        <ScrollView
          style={styles.menuScrollView}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {menuItems}
        </ScrollView>
      ) : (
        menuItems
      )}
    </View>
  );

  if (disableModal) {
    return menuContent;
  }

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable 
        style={styles.overlay} 
        onPress={onClose}
        onStartShouldSetResponder={() => true}
      >
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
    overflow: 'hidden',
    zIndex: 30,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 30,
  },
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'flex-start',
  },
  menuItemText: {
    ...typography.p2,
    flex: 1,
  },
});
