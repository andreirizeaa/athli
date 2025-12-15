import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PlatformIcon } from './platform-icon';
import { iconSizes } from '@/constants/typography';

type IconButtonSize = 'sm' | 'md' | 'lg';

type IconConfig = {
  sf: string;
  IconComponent: LucideIcon;
};

type IconButtonProps = {
  icon: IconConfig;
  onPress: () => void;
  size?: IconButtonSize;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
  activeOpacity?: number;
};

type DoubleIconButtonProps = {
  leftIcon: IconConfig;
  rightIcon: IconConfig;
  onLeftPress: () => void;
  onRightPress: () => void;
  size?: IconButtonSize;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
  activeOpacity?: number;
};

const SIZE_CONFIG: Record<IconButtonSize, { buttonSize: number; iconSize: number }> = {
  sm: {
    buttonSize: 36,
    iconSize: 14,
  },
  md: {
    buttonSize: 44,
    iconSize: iconSizes.navigationChevrons,
  },
  lg: {
    buttonSize: 52,
    iconSize: 24,
  },
};

export const IconButton = ({
  icon,
  onPress,
  size = 'md',
  color,
  backgroundColor,
  disabled = false,
  style,
  activeOpacity = 0.7,
}: IconButtonProps) => {
  const { buttonSize, iconSize } = SIZE_CONFIG[size];
  const borderRadius = buttonSize / 2;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
      activeOpacity={activeOpacity}
      onPress={onPress}
      disabled={disabled}
    >
      <PlatformIcon sf={icon.sf} IconComponent={icon.IconComponent} size={iconSize} color={color} />
    </TouchableOpacity>
  );
};

export const DoubleIconButton = React.forwardRef<View, DoubleIconButtonProps>(
  (
    {
      leftIcon,
      rightIcon,
      onLeftPress,
      onRightPress,
      size = 'md',
      color,
      backgroundColor,
      disabled = false,
      style,
      activeOpacity = 0.7,
    },
    ref
  ) => {
    const { buttonSize, iconSize } = SIZE_CONFIG[size];
    const borderRadius = buttonSize / 2;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.doubleButtonContainer,
          {
            borderRadius,
            backgroundColor,
            minHeight: buttonSize,
          },
          style,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.nestedButton,
            {
              width: buttonSize,
              height: buttonSize,
            },
          ]}
          activeOpacity={activeOpacity}
          onPress={onLeftPress}
          disabled={disabled}
        >
          <PlatformIcon sf={leftIcon.sf} IconComponent={leftIcon.IconComponent} size={iconSize} color={color} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nestedButton,
            {
              width: buttonSize,
              height: buttonSize,
            },
          ]}
          activeOpacity={activeOpacity}
          onPress={onRightPress}
          disabled={disabled}
        >
          <PlatformIcon sf={rightIcon.sf} IconComponent={rightIcon.IconComponent} size={iconSize} color={color} />
        </TouchableOpacity>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  nestedButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
