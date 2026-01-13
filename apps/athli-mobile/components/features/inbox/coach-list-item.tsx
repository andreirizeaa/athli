import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Archive, MailCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { type Coach } from '@/services/inbox-service';

type CoachListItemProps = {
  coach: Coach;
  onPress: (coachId: string) => void | Promise<void>;
  isEditMode?: boolean;
  isSelected?: boolean;
  onArchive?: (coachId: string) => void;
  onMarkAsRead?: (coachId: string) => void;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // If less than 24 hours, show exact time in 24-hour format
  if (diffInHours < 24) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // If more than 24 hours but less than a week, show "yesterday" or day name
  if (diffInDays < 7) {
    if (diffInDays === 1) {
      return 'Yesterday';
    }
    return DAY_NAMES[date.getDay()];
  }

  // If more than a week, show date in dd/mm/yyyy format
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const CoachListItem = ({
  coach,
  onPress,
  isEditMode = false,
  isSelected = false,
  onArchive,
  onMarkAsRead,
}: CoachListItemProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(coach.id);
  };

  const handleLongPress = () => {
    // Prevent navigation on long press
    // The Zeego ContextMenuWrapper handles the actual menu
  };

  const handlePressIn = () => {
    if (!isEditMode) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const checkboxBorderColor =
    isSelected
      ? themeColors.primary
      : colorScheme === 'dark'
        ? themeColors.border
        : themeColors.mutedText;

  const dropdownOptions: DropdownMenuOption[] = [
    ...(onMarkAsRead && (coach.unreadCount ?? 0) > 0
      ? [
        {
          label: t('chats.markAsRead'),
          icon: {
            sf: 'checkmark.message',
            IconComponent: MailCheck,
          },
          onPress: () => {
            onMarkAsRead(coach.id);
          },
        },
      ]
      : []),
    ...(onArchive
      ? [
        {
          label: t('chats.archive'),
          icon: {
            sf: 'archivebox',
            IconComponent: Archive,
          },
          onPress: () => {
            onArchive(coach.id);
          },
        },
      ]
      : []),
  ];

  const content = (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View
        style={[
          styles.rowWrapper,
          (isSelected || isPressed) && {
            backgroundColor: themeColors.backgroundTertiary,
          },
        ]}
      >
        <View style={styles.content}>
          {isEditMode && (
            <View style={styles.checkboxContainer}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: checkboxBorderColor,
                    backgroundColor: isSelected ? themeColors.primary : 'transparent',
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      {
                        borderColor: themeColors.primaryForeground,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          )}
          <View style={styles.avatarContainer}>
            {coach.avatar ? (
              <Image source={{ uri: coach.avatar }} style={styles.avatar} />
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
          <View style={styles.messageContainer}>
            <View style={styles.messageHeader}>
              <Text
                style={[styles.coachName, { color: themeColors.text }]}
                numberOfLines={1}
              >
                {coach.name}
              </Text>
              {coach.lastMessageTime && (
                <View style={styles.timestampContainer}>
                  <Text
                    style={[
                      styles.timestamp,
                      {
                        color: (coach.unreadCount ?? 0) > 0 ? themeColors.primary : themeColors.mutedText,
                      },
                    ]}
                  >
                    {formatMessageTime(coach.lastMessageTime)}
                  </Text>
                </View>
              )}
            </View>
            {coach.lastMessage && (
              <View style={styles.messageFooter}>
                <View style={styles.lastMessageContainer}>
                  <Text
                    style={[
                      styles.lastMessage,
                      { color: themeColors.mutedText },
                    ]}
                    numberOfLines={2}
                  >
                    {coach.lastMessage}
                  </Text>
                </View>
                <View style={styles.rightColumn}>
                  {(coach.unreadCount ?? 0) > 0 && (
                    <View
                      style={[
                        styles.unreadBadge,
                        { backgroundColor: themeColors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.unreadCount,
                          { color: themeColors.primaryForeground },
                        ]}
                      >
                        {coach.unreadCount! > 99 ? '99+' : coach.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
      <View
        style={[
          styles.separatorContainer,
          isEditMode && styles.separatorContainerEdit,
        ]}
      >
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
    </Pressable>
  );

  // In edit mode, don't wrap with context menu
  if (isEditMode || dropdownOptions.length === 0) {
    return content;
  }

  return (
    <ContextMenuWrapper options={dropdownOptions}>
      {content}
    </ContextMenuWrapper>
  );
};

const styles = StyleSheet.create({
  rowWrapper: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  checkboxContainer: {
    width: 20,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 5,
    height: 8,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    marginTop: -2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  coachName: {
    ...typography.h7,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  timestampContainer: {
    alignItems: 'flex-end',
    minWidth: 60,
    flexShrink: 0,
  },
  timestamp: {
    ...typography.p3,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lastMessageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  lastMessage: {
    ...typography.p3,
    flex: 1,
  },
  rightColumn: {
    width: 60,
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    ...typography.p6,
    fontWeight: '600',
  },
  separatorContainer: {
    paddingLeft: 82, // 16 (content paddingHorizontal) + 54 (avatar) + 12 (marginRight)
    paddingRight: 16,
  },
  separatorContainerEdit: {
    paddingLeft: 114, // 16 (content paddingHorizontal) + 20 (checkbox) + 12 (marginRight) + 54 (avatar) + 12 (marginRight)
    paddingRight: 16,
  },
  separator: {
    height: 0.75,
  },
});

