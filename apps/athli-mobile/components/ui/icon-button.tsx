import React from 'react';
import { StyleSheet, View, ViewStyle, ActivityIndicator } from 'react-native';
import { PressableScale } from 'pressto';
import type { LucideIcon } from 'lucide-react-native';
import { PlatformIcon } from './platform-icon';
import { iconSizes } from '@/constants/typography';
import { createPresetPalette } from '@/constants/theme';
import { useThemePreference } from '@/stores';

type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonScheme = 'auto' | 'light' | 'dark';

type IconButtonVariant = 'default' | 'primary';

type IconConfig = {
  sf: string;
  IconComponent: LucideIcon;
};

export type IconButtonProps = {
  icon: IconConfig;
  onPress: () => void;
  size?: IconButtonSize;
  color?: string;
  backgroundColor?: string;
  loadingColor?: string;
  scheme?: IconButtonScheme;
  variant?: IconButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

type DoubleIconButtonProps = {
  leftIcon: IconConfig;
  rightIcon: IconConfig;
  onLeftPress: () => void;
  onRightPress: () => void;
  size?: IconButtonSize;
  color?: string;
  scheme?: IconButtonScheme;
  variant?: IconButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
};

const SIZE_CONFIG: Record<IconButtonSize, { buttonSize: number; iconSize: number }> = {
  sm: {
    buttonSize: 36,
    iconSize: 14,
  },
  md: {
    buttonSize: 46,
    iconSize: iconSizes.navigationChevrons + 4,
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
  loadingColor,
  scheme = 'auto',
  variant = 'default',
  disabled = false,
  loading = false,
  style,
}: IconButtonProps) => {
  const { preset, colors: themeColors } = useThemePreference();
  const { buttonSize, iconSize } = SIZE_CONFIG[size];
  const borderRadius = buttonSize / 2;

  const resolvedColors =
    scheme === 'auto' ? themeColors : createPresetPalette(preset, scheme);

  const background = backgroundColor ?? (variant === 'primary' ? resolvedColors.primary : resolvedColors.surfacePrimary);
  const iconColor =
    color ?? (variant === 'primary' ? resolvedColors.primaryForeground : resolvedColors.text);

  return (
    <PressableScale
      style={[
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius,
          backgroundColor: background,
          opacity: disabled && !loading ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      enabled={!disabled && !loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={loadingColor ?? iconColor} />
      ) : (
        <PlatformIcon sf={icon.sf} IconComponent={icon.IconComponent} size={iconSize} color={iconColor} />
      )}
    </PressableScale>
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
      scheme = 'auto',
      variant = 'default',
      disabled = false,
      style,
    },
    ref
  ) => {
    const { preset, colors: themeColors } = useThemePreference();
    const { buttonSize, iconSize } = SIZE_CONFIG[size];
    const borderRadius = buttonSize / 2;

    const resolvedColors =
      scheme === 'auto' ? themeColors : createPresetPalette(preset, scheme);

    const background = variant === 'primary' ? resolvedColors.primary : resolvedColors.surfacePrimary;
    const iconColor =
      color ?? (variant === 'primary' ? resolvedColors.primaryForeground : resolvedColors.text);

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.doubleButtonContainer,
          {
            borderRadius,
            backgroundColor: background,
            minHeight: buttonSize,
          },
          style,
        ]}
      >
        <PressableScale
          style={[
            styles.nestedButton,
            {
              width: buttonSize,
              height: buttonSize,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={onLeftPress}
          enabled={!disabled}
        >
          <PlatformIcon sf={leftIcon.sf} IconComponent={leftIcon.IconComponent} size={iconSize} color={iconColor} />
        </PressableScale>
        <PressableScale
          style={[
            styles.nestedButton,
            {
              width: buttonSize,
              height: buttonSize,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={onRightPress}
          enabled={!disabled}
        >
          <PlatformIcon sf={rightIcon.sf} IconComponent={rightIcon.IconComponent} size={iconSize} color={iconColor} />
        </PressableScale>
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
