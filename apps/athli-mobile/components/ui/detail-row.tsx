import React from 'react';
import type { JSX } from 'react';
import type { GestureResponderEvent, ViewStyle } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from 'pressto';
import { SymbolView } from 'expo-symbols';
import { Pencil } from 'lucide-react-native';
import { Image } from 'expo-image';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';

type DetailRowProps = {
  label: string;
  value?: string;
  onPress?: (event: GestureResponderEvent) => void;
  avatarUrl?: string | null;
  avatarFallback?: JSX.Element;
  style?: ViewStyle;
};

export function DetailRow({
  label,
  value,
  onPress,
  avatarUrl,
  avatarFallback,
  style,
}: DetailRowProps) {
  const { colors: themeColors } = useThemePreference();

  const handlePress = (event: GestureResponderEvent) => {
    if (!onPress) return;
    haptics.medium();
    onPress(event);
  };

  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
      );
    }
    if (avatarFallback) {
      return <View style={[styles.avatarFallback, { backgroundColor: themeColors.primarySoft }]}>{avatarFallback}</View>;
    }
    return null;
  };

  const showAvatar = avatarUrl !== undefined || avatarFallback;

  return (
    <PressableScale
      style={[styles.row, style]}
      onPress={onPress ? handlePress : undefined}
    >
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      <View style={styles.rightSection}>
        {showAvatar ? (
          renderAvatar()
        ) : value ? (
          <Text
            style={[styles.value, { color: themeColors.mutedText }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {onPress && (
          <View style={styles.editIcon}>
            {Platform.OS === 'ios' ? (
              <SymbolView
                name="pencil"
                tintColor={themeColors.mutedText}
                size={iconSizes.smallIcons}
                type="monochrome"
              />
            ) : (
              <Pencil size={iconSizes.smallIcons} color={themeColors.mutedText} />
            )}
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    ...typography.p1,
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    ...typography.p2,
    maxWidth: 180,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: 20,
    alignItems: 'center',
  },
});
