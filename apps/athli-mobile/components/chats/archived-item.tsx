import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Archive, MailCheck, Trash2, MailOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';
import { SwipeableRow } from '@/components/swipeable-row';
import { PressableOpacity } from 'pressto';

type ArchivedItemProps = {
  onPress: () => void;
  onMarkAsRead?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  onOpen?: (close: () => void) => void;
  hasUnread?: boolean;
};

export const ArchivedItem = ({
  onPress,
  onMarkAsRead,
  onUnarchive,
  onDelete,
  onOpen,
  hasUnread = false,
}: ArchivedItemProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const handlePress = () => {
    onPress();
  };

  const handleDelete = () => {
    if (onDelete) {
      Alert.alert(
        t('chats.delete'),
        t('library.deleteConfirmMessage'),
        [
          { text: t('general.cancel'), style: 'cancel' },
          {
            text: t('general.delete'),
            style: 'destructive',
            onPress: onDelete
          },
        ]
      );
    }
  };

  const dropdownOptions: DropdownMenuOption[] = [
    ...(onMarkAsRead && hasUnread
      ? [
        {
          label: t('chats.markAsRead'),
          icon: { sf: 'checkmark.message', IconComponent: MailCheck },
          onPress: onMarkAsRead,
        },
      ]
      : []),
    ...(onUnarchive
      ? [
        {
          label: t('chats.archived.unarchive'),
          icon: { sf: 'archivebox.fill', IconComponent: Archive },
          onPress: onUnarchive,
        },
      ]
      : []),
    ...(onDelete
      ? [
        {
          label: t('chats.delete'),
          icon: { sf: 'trash', IconComponent: Trash2 },
          destructive: true,
          onPress: handleDelete,
        },
      ]
      : []),
  ];

  return (
    <SwipeableRow
      onDelete={handleDelete}
      onOpen={onOpen}
      deleteConfirmTitle={t('chats.delete')}
      enabled={!!onDelete}
    >
      <ContextMenuWrapper options={dropdownOptions}>
        <PressableOpacity
          onPress={handlePress}
          style={styles.rowWrapper}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <PlatformIcon
                sf="archivebox"
                IconComponent={Archive}
                size={iconSizes.listIcons}
                color={themeColors.mutedText}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[styles.archivedText, { color: themeColors.mutedText }]}
              >
                {t('chats.archived.title')}
              </Text>
            </View>
          </View>
          <View style={styles.separatorContainer}>
            <View
              style={[
                styles.separator,
                {
                  backgroundColor: themeColors.mutedText,
                  opacity: 0.3,
                },
              ]}
            />
          </View>
        </PressableOpacity>
      </ContextMenuWrapper>
    </SwipeableRow>
  );
};

const styles = StyleSheet.create({
  rowWrapper: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 2,
    marginTop: -12,
    marginBottom: -8,
  },
  iconContainer: {
    marginRight: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  archivedText: {
    ...typography.p3,
    fontWeight: '600',
  },
  separatorContainer: {
    paddingLeft: 84, // 16 (content paddingHorizontal) + 56 (icon width) + 12 (marginRight)
    paddingRight: 16,
  },
  separator: {
    height: 0.5,
  },
});
