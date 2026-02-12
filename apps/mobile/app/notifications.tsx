import React, { useState, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { PressableScale, PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import Color from 'color';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { useCoachNotifications } from '@/hooks/useCoachNotifications';
import { NOTIFICATION_TYPES } from '@athli/shared-types';
import type { CoachNotification } from '@/services/coach-notifications-service';

const HEADER_HEIGHT = 52;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getNotificationNavigationRoute(notification: CoachNotification): string {
  const { client_id, notification_type, metadata } = notification;

  switch (notification_type) {
    case NOTIFICATION_TYPES.workout_completed:
    case NOTIFICATION_TYPES.workout_missed:
      return `/client/${client_id}/training`;

    case NOTIFICATION_TYPES.checkin_completed:
      if (metadata?.checkin_id) {
        return `/client/${client_id}/check-in-detail?checkInId=${metadata.checkin_id}`;
      }
      return `/client/${client_id}/check-ins`;

    case NOTIFICATION_TYPES.questionnaire_completed:
      if (metadata?.questionnaire_id) {
        return `/client/${client_id}/questionaires?questionnaireId=${metadata.questionnaire_id}`;
      }
      return `/client/${client_id}/questionaires`;

    case NOTIFICATION_TYPES.metric_logged:
      if (metadata?.assignment_id) {
        return `/client/${client_id}/metrics?assignmentId=${metadata.assignment_id}`;
      }
      return `/client/${client_id}/metrics`;

    case NOTIFICATION_TYPES.habit_logged:
      if (metadata?.assignment_id) {
        return `/client/${client_id}/habits?assignmentId=${metadata.assignment_id}`;
      }
      return `/client/${client_id}/habits`;

    case NOTIFICATION_TYPES.photo_uploaded:
      if (metadata?.date) {
        return `/client/${client_id}/photos?date=${metadata.date}`;
      }
      return `/client/${client_id}/photos`;

    case NOTIFICATION_TYPES.goal_added:
    case NOTIFICATION_TYPES.goal_edited:
      if (metadata?.goal_id) {
        return `/client/${client_id}/goals?goalId=${metadata.goal_id}`;
      }
      return `/client/${client_id}/goals`;

    case NOTIFICATION_TYPES.goal_deleted:
      return `/client/${client_id}/goals`;

    case NOTIFICATION_TYPES.injury_added:
    case NOTIFICATION_TYPES.injury_edited:
      if (metadata?.injury_id) {
        return `/client/${client_id}/injuries?injuryId=${metadata.injury_id}`;
      }
      return `/client/${client_id}/injuries`;

    case NOTIFICATION_TYPES.injury_deleted:
      return `/client/${client_id}/injuries`;

    case NOTIFICATION_TYPES.client_connected:
    default:
      return `/client/${client_id}`;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useCoachNotifications();

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Filter notifications based on current filter
  const filteredNotifications = useMemo(() => {
    if (showUnreadOnly) {
      return notifications.filter((n) => !n.read_at);
    }
    return notifications;
  }, [notifications, showUnreadOnly]);

  // Get a lighter tint of the primary color for unread background
  const unreadBackgroundColor = useMemo(() => {
    try {
      return Color(primaryColor).alpha(0.08).toString();
    } catch {
      return 'rgba(0, 122, 255, 0.08)';
    }
  }, [primaryColor]);

  const handleGoBack = () => {
    router.back();
  };

  const handleNotificationPress = (notification: CoachNotification) => {
    // Mark as read if not already read
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    // Navigate to the appropriate screen
    const route = getNotificationNavigationRoute(notification);
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      {/* Fixed Header */}
      <View
        style={[
          styles.fixedHeader,
          { paddingTop: insets.top, backgroundColor: themeColors.background },
        ]}
      >
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleGoBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('notifications.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + HEADER_HEIGHT,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={primaryColor}
            progressViewOffset={insets.top + HEADER_HEIGHT}
          />
        }
      >
        {/* Filter Buttons - only show when there are notifications */}
        {notifications.length > 0 && (
          <View style={styles.filterButtonsContainer}>
            <View style={styles.filterButtonWrapper}>
              <PressableScale
                style={[
                  styles.filterButton,
                  {
                    borderColor: primaryColor,
                    opacity: unreadCount === 0 && !showUnreadOnly ? 0.4 : 1,
                  },
                ]}
                onPress={() => setShowUnreadOnly(!showUnreadOnly)}
                disabled={unreadCount === 0 && !showUnreadOnly}
              >
                <Text style={[styles.filterButtonText, { color: primaryColor }]}>
                  {showUnreadOnly ? t('notifications.showAll') : t('notifications.showUnread')}
                </Text>
              </PressableScale>
            </View>
            <View style={styles.filterButtonWrapper}>
              {unreadCount > 0 && (
                <PressableScale
                  style={[
                    styles.filterButton,
                    { borderColor: primaryColor },
                  ]}
                  onPress={markAllAsRead}
                >
                  <Text style={[styles.filterButtonText, { color: primaryColor }]}>
                    {t('notifications.markAllAsRead')}
                  </Text>
                </PressableScale>
              )}
            </View>
          </View>
        )}

        {filteredNotifications.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
              {showUnreadOnly ? t('notifications.noUnread') : t('notifications.empty')}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <PressableOpacity
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              style={[
                styles.notificationRow,
                { borderBottomColor: themeColors.border },
                !notification.read_at && {
                  backgroundColor: unreadBackgroundColor,
                },
              ]}
            >
              {/* Unread indicator */}
              {!notification.read_at && (
                <View
                  style={[styles.unreadIndicator, { backgroundColor: primaryColor }]}
                />
              )}

              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {notification.client_avatar_url ? (
                  <Image
                    source={{ uri: notification.client_avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: themeColors.border },
                    ]}
                  >
                    <Text
                      style={[styles.avatarText, { color: themeColors.mutedText }]}
                    >
                      {getInitials(notification.client_name)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                <Text
                  style={[
                    styles.clientName,
                    { color: themeColors.text },
                    !notification.read_at && styles.unreadText,
                  ]}
                  numberOfLines={1}
                >
                  {notification.client_name}
                </Text>
                <Text
                  style={[styles.notificationTitle, { color: themeColors.mutedText }]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text
                  style={[styles.timestamp, { color: themeColors.mutedText }]}
                >
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </Text>
              </View>
            </PressableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterButtonWrapper: {
    flex: 1,
  },
  filterButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  filterButtonText: {
    ...typography.p1,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...typography.p1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.p2,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  clientName: {
    ...typography.p1,
    fontWeight: '500',
    marginBottom: 2,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationTitle: {
    ...typography.p2,
    marginBottom: 4,
  },
  timestamp: {
    ...typography.p3,
  },
});
