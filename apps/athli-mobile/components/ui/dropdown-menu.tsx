import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ContextMenu from 'zeego/context-menu';
import * as DropdownMenuZeego from 'zeego/dropdown-menu';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';

const DESTRUCTIVE_COLOR = '#EF4444';

export type DropdownMenuOption = {
  label?: string;
  subtitle?: string;
  icon?: {
    sf: string;
    IconComponent: LucideIcon;
  };
  onPress?: () => void;
  destructive?: boolean;
  separator?: boolean;
  subActions?: DropdownMenuOption[]; // Submenu items
};

// =============================================================================
// LEGACY DROPDOWN MENU (Modal-based, manual positioning)
// Used by components like selected-message-popups.tsx that need custom positioning
// =============================================================================

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
  alignRight?: boolean;
  disableModal?: boolean;
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
  const edgeGap = 16;

  const spaceBelow = screenHeight - anchorPosition.y - anchorPosition.height;
  const spaceAbove = anchorPosition.y;

  const showAbove = spaceBelow < menuHeight + menuOffset && spaceAbove > spaceBelow;

  const leftPosition = alignRight
    ? Math.min(
      anchorPosition.x + anchorPosition.width - menuWidth,
      screenWidth - menuWidth - edgeGap
    )
    : Math.max(
      anchorPosition.x,
      edgeGap
    );

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
            option.onPress?.();
            onClose();
          }}
        >
          {option.icon && (
            <PlatformIcon
              sf={option.icon.sf}
              IconComponent={option.icon.IconComponent}
              size={iconSizes.listIcons}
              color={option.destructive ? DESTRUCTIVE_COLOR : themeColors.text}
            />
          )}
          <Text style={[
            styles.menuItemText,
            { color: option.destructive ? DESTRUCTIVE_COLOR : themeColors.text }
          ]}>
            {option.label}
          </Text>
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

// =============================================================================
// ZEEGO-BASED WRAPPERS (Native context/dropdown menus)
// These use platform-native menus with SF Symbols support
// =============================================================================

type ContextMenuWrapperProps = {
  options: DropdownMenuOption[];
  children: React.ReactNode;
  onLongPress?: () => void;
};

/**
 * Context menu that appears on long press (iOS/Android native context menu)
 * Includes a custom preview with themed background for better visibility in dark mode
 */
export const ContextMenuWrapper = ({
  options,
  children,
  onLongPress,
}: ContextMenuWrapperProps) => {
  const { colors: themeColors } = useThemePreference();

  // Clone children with overridden background for the preview
  const getPreviewChildren = () => {
    if (React.isValidElement(children)) {
      // Clone the first child and override its style with surface background
      return React.cloneElement(children as React.ReactElement<any>, {
        style: [
          (children as React.ReactElement<any>).props.style,
          { backgroundColor: themeColors.surface },
        ],
      });
    }
    return children;
  };

  return (
    <ContextMenu.Root onOpenChange={(open) => {
      if (open && onLongPress) {
        onLongPress();
      }
    }}>
      <ContextMenu.Trigger action="longPress">
        <View>
          {children}
        </View>
      </ContextMenu.Trigger>
      <ContextMenu.Preview>
        {() => (
          <View style={{ backgroundColor: themeColors.surface }}>
            {getPreviewChildren()}
          </View>
        )}
      </ContextMenu.Preview>
      <ContextMenu.Content>
        {options.map((option, index) => {
          // If option has subActions, render a submenu
          if (option.subActions && option.subActions.length > 0) {
            return (
              <ContextMenu.Sub key={`submenu-${index}`}>
                <ContextMenu.SubTrigger>
                  <ContextMenu.ItemTitle>{option.label}</ContextMenu.ItemTitle>
                  {option.icon && (
                    <ContextMenu.ItemIcon
                      ios={{
                        name: option.icon.sf,
                      }}
                    />
                  )}
                </ContextMenu.SubTrigger>
                <ContextMenu.SubContent>
                  {option.subActions.map((subOption, subIndex) => (
                    <ContextMenu.Item
                      key={`subitem-${index}-${subIndex}`}
                      onSelect={subOption.onPress}
                      destructive={subOption.destructive}
                    >
                      <ContextMenu.ItemTitle>{subOption.label}</ContextMenu.ItemTitle>
                      {subOption.icon && (
                        <ContextMenu.ItemIcon
                          ios={{
                            name: subOption.icon.sf,
                          }}
                        />
                      )}
                    </ContextMenu.Item>
                  ))}
                </ContextMenu.SubContent>
              </ContextMenu.Sub>
            );
          }

          // Regular menu item
          return (
            <ContextMenu.Item
              key={`item-${index}`}
              onSelect={option.onPress}
              destructive={option.destructive}
            >
              <ContextMenu.ItemTitle>{option.label}</ContextMenu.ItemTitle>
              {option.icon && (
                <ContextMenu.ItemIcon
                  ios={{
                    name: option.icon.sf,
                  }}
                />
              )}
            </ContextMenu.Item>
          );
        })}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};

type DropdownMenuWrapperProps = {
  options: DropdownMenuOption[];
  children: React.ReactNode;
};

/**
 * Dropdown menu that appears on tap/press (iOS/Android native dropdown menu)
 */
export const DropdownMenuWrapper = ({
  options,
  children,
}: DropdownMenuWrapperProps) => {
  const handleTouchStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <DropdownMenuZeego.Root>
      <DropdownMenuZeego.Trigger>
        <Pressable onPressIn={handleTouchStart}>
          {children}
        </Pressable>
      </DropdownMenuZeego.Trigger>
      <DropdownMenuZeego.Content>
        {options.map((option, index) => {
          if (option.separator) {
            return <DropdownMenuZeego.Separator key={`separator-${index}`} />;
          }
          return (
            <DropdownMenuZeego.Item
              key={`item-${index}`}
              onSelect={option.onPress!}
              destructive={option.destructive}
            >
              <DropdownMenuZeego.ItemTitle>{option.label}</DropdownMenuZeego.ItemTitle>
              {option.subtitle && (
                <DropdownMenuZeego.ItemSubtitle>{option.subtitle}</DropdownMenuZeego.ItemSubtitle>
              )}
              {option.icon && (
                <DropdownMenuZeego.ItemIcon
                  ios={{
                    name: option.icon.sf,
                  }}
                />
              )}
            </DropdownMenuZeego.Item>
          );
        })}
      </DropdownMenuZeego.Content>
    </DropdownMenuZeego.Root>
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
