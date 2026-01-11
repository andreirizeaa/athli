import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronLeft, Ellipsis, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { hexToRgba } from '@/utils/colorUtils';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { type Chat } from '@/services/chats-service';
import { type Coach } from '@/services/inbox-service';
import { typography } from '@/constants/typography';

type ChatHeaderProps = {
  // Support both Chat and Coach types
  chat?: Chat;
  coach?: Coach;
  // Optional back button
  onBackPress?: () => void;
  // Optional action buttons (for coach view)
  onUserProfilePress?: () => void;
  // Dropdown options for the ellipsis button
  dropdownOptions?: DropdownMenuOption[];
};

export const ChatHeader = ({
  chat,
  coach,
  onBackPress,
  onUserProfilePress,
  dropdownOptions,
}: ChatHeaderProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const headerBackgroundColor = themeColors.headerBackground;
  const iconColor = themeColors.text;
  const translucentHeaderBg = hexToRgba(headerBackgroundColor, 0.95);

  // Determine avatar and name from either chat or coach
  const avatar = chat?.clientAvatar || coach?.avatar;
  const name = chat?.clientName || coach?.name || '';
  const showBackButton = !!onBackPress;
  const showActionButtons = !!onUserProfilePress && dropdownOptions && dropdownOptions.length > 0;

  return (
    <View style={[styles.headerSafeArea, { paddingTop: 0 }]} pointerEvents="box-none">
      <BlurView
        intensity={30}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.headerBlur, { paddingTop: insets.top, backgroundColor: translucentHeaderBg }]}
      >
        <View style={styles.header}>
          {showBackButton && (
            <IconButton
              icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
              onPress={onBackPress}
              size="md"
              color={iconColor}
              scheme={isDark ? 'dark' : 'light'}
              style={{ marginRight: 12 }}
            />
          )}

          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarPlaceholder,
                  { backgroundColor: themeColors.border },
                ]}
              />
            )}
          </View>

          <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
            {name}
          </Text>

          {showActionButtons && (
            <View style={styles.actionButtons}>
              <IconButton
                icon={{ sf: 'person', IconComponent: User }}
                onPress={onUserProfilePress}
                size="md"
                color={iconColor}
                scheme={isDark ? 'dark' : 'light'}
              />
              <DropdownMenuWrapper options={dropdownOptions}>
                <IconButton
                  icon={{ sf: 'ellipsis', IconComponent: Ellipsis }}
                  onPress={() => { }}
                  size="md"
                  color={iconColor}
                  scheme={isDark ? 'dark' : 'light'}
                />
              </DropdownMenuWrapper>
            </View>
          )}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  name: {
    ...typography.h5,
    flex: 1,
    marginRight: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
