import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Archive, MailCheck, Send, CheckCircle } from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference, useAuthSessionStore } from '@/stores';
import { useTranslations } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { PressableScale } from 'pressto';
import { type Coach } from '@/services/inbox-service';

type CoachListItemProps = {
  coach: Coach;
  onPress: (coachId: string) => void | Promise<void>;
  onPressIn?: (coachId: string) => void;
  isEditMode?: boolean;
  isSelected?: boolean;
  onArchive?: (coachId: string) => void;
  onMarkAsRead?: (coachId: string) => void;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatMessageTime = (date: Date | null | undefined): string => {
  // Handle null/undefined dates
  if (!date) return '';

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
  onPressIn,
  isEditMode = false,
  isSelected = false,
  onArchive,
  onMarkAsRead,
}: CoachListItemProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const userId = useAuthSessionStore((state) => state.userId);

  // Check if we sent the last message
  const weSentLastMessage = coach.last_message_sender_id === userId;

  const handlePress = () => {
    onPress(coach.id);
  };

  const handlePressIn = () => {
    onPressIn?.(coach.id);
  };

  const checkboxBorderColor =
    isSelected
      ? themeColors.primary
      : colorScheme === 'dark'
        ? themeColors.border
        : themeColors.mutedText;

  const dropdownOptions: DropdownMenuOption[] = [
    ...(onMarkAsRead && (coach.unread_count ?? 0) > 0
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
    <PressableScale
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={styles.rowWrapper}
    >
      <View
        style={[
          styles.content,
          isSelected && {
            backgroundColor: themeColors.backgroundTertiary,
          },
        ]}
      >
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
            <SquircleView cornerSmoothing={1} style={styles.avatar}>
              {coach.other_user_avatar ? (
                <Image source={{ uri: coach.other_user_avatar }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: themeColors.border },
                  ]}
                />
              )}
            </SquircleView>
          </View>
          <View style={styles.messageContainer}>
            <View style={styles.messageHeader}>
              <Text
                style={[styles.coachName, { color: themeColors.text }]}
                numberOfLines={1}
              >
                {coach.other_user_name}
              </Text>
              {coach.last_message_at && (
                <View style={styles.timestampContainer}>
                  <Text
                    style={[
                      styles.timestamp,
                      {
                        color: (coach.unread_count ?? 0) > 0 ? themeColors.primary : themeColors.mutedText,
                      },
                    ]}
                  >
                    {formatMessageTime(coach.last_message_at)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.messageFooter}>
              <View style={styles.lastMessageContainer}>
                {weSentLastMessage && coach.last_message_preview && (
                  <View style={styles.readReceiptContainer}>
                    <PlatformIcon
                      sf={coach.last_message_is_read ? "checkmark.circle" : "paperplane"}
                      IconComponent={coach.last_message_is_read ? CheckCircle : Send}
                      size={iconSizes.extraSmallIcons}
                      color={
                        coach.last_message_is_read
                          ? themeColors.primary
                          : themeColors.mutedText
                      }
                    />
                  </View>
                )}
                <Text
                  style={[
                    styles.lastMessage,
                    {
                      color: themeColors.mutedText,
                      fontStyle: coach.last_message_preview ? 'normal' : 'italic',
                      opacity: coach.last_message_preview ? 1 : 0.6,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {coach.last_message_preview || t('chats.beFirstToMessage')}
                </Text>
              </View>
              <View style={styles.rightColumn}>
                {coach.unread_count != null && coach.unread_count > 0 ? (
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
                      {coach.unread_count > 99 ? '99+' : coach.unread_count}
                    </Text>
                  </View>
                ) : null}
              </View>
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
    </PressableScale>
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 54,
    height: 54,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
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
  readReceiptContainer: {
    marginRight: 4,
    marginTop: 2,
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

