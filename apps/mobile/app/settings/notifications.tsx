import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { NOTIFICATION_TITLES } from '@athli/shared-types';
import type { NotificationType } from '@athli/shared-types';
import {
  bulkUpdateNotificationPreferences,
  getNotificationPreferences,
  type NotificationPreference,
} from '@/services/notification-preferences-service';

interface NotificationGroup {
  titleKey: string;
  types: NotificationType[];
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    titleKey: 'notifications.categories.training',
    types: ['workout_completed', 'workout_missed'],
  },
  {
    titleKey: 'notifications.categories.forms',
    types: ['checkin_completed', 'questionnaire_completed'],
  },
  {
    titleKey: 'notifications.categories.tracking',
    types: ['metric_logged', 'habit_logged', 'photo_uploaded'],
  },
  {
    titleKey: 'notifications.categories.profile',
    types: ['client_connected', 'goal_added', 'goal_edited', 'goal_deleted', 'injury_added', 'injury_edited', 'injury_deleted'],
  },
];

const HEADER_HEIGHT = 52;

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: themeColors, preset } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);

  const allInAppOff = preferences.length > 0 && preferences.every(p => !p.in_app_enabled);
  const allPushOff = preferences.length > 0 && preferences.every(p => !p.push_enabled);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleGoBack = () => {
    router.back();
  };

  const handleNotificationPress = (type: NotificationType) => {
    router.push({
      pathname: '/settings/notification-status',
      params: { type },
    });
  };

  const handleToggleAllInApp = (value: boolean) => {
    // Optimistic: update local state immediately
    setPreferences(prev => prev.map(p => ({ ...p, in_app_enabled: !value })));
    bulkUpdateNotificationPreferences({ inAppEnabled: !value })
      .then(() => loadPreferences())
      .catch((error) => {
        console.error('Failed to bulk update in-app preferences:', error);
        loadPreferences();
      });
  };

  const handleToggleAllPush = (value: boolean) => {
    setPreferences(prev => prev.map(p => ({ ...p, push_enabled: !value })));
    bulkUpdateNotificationPreferences({ pushEnabled: !value })
      .then(() => loadPreferences())
      .catch((error) => {
        console.error('Failed to bulk update push preferences:', error);
        loadPreferences();
      });
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {NOTIFICATION_GROUPS.map((group) => (
          <View key={group.titleKey}>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
              {t(group.titleKey)}
            </Text>
            <Card style={{ paddingVertical: 12 }}>
              {group.types.map((type, index) => (
                <React.Fragment key={type}>
                  {index > 0 && <Separator />}
                  <PressableScale
                    style={styles.notificationRow}
                    onPress={() => handleNotificationPress(type)}
                  >
                    <Text
                      style={[styles.notificationLabel, { color: themeColors.text }]}
                      numberOfLines={2}
                    >
                      {NOTIFICATION_TITLES[type]}
                    </Text>
                    <PlatformIcon
                      sf="chevron.right"
                      IconComponent={ChevronRight}
                      size={iconSizes.extraSmallIcons}
                      color={themeColors.mutedText}
                    />
                  </PressableScale>
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        {/* Bulk Actions */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
          {t('notifications.bulkActions')}
        </Text>
        <Card style={{ paddingVertical: 12 }}>
          <View style={styles.switchRow}>
            <Text style={[styles.switchRowTitle, { color: themeColors.text }]}>
              {t('notifications.turnOffAllInApp')}
            </Text>
            <Switch
              value={allInAppOff}
              onValueChange={handleToggleAllInApp}
              trackColor={
                preset === 'default'
                  ? undefined
                  : { false: themeColors.border, true: themeColors.primary }
              }
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              ios_backgroundColor={preset === 'default' ? undefined : themeColors.border}
              style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
            />
          </View>
          <Separator />
          <View style={styles.switchRow}>
            <Text style={[styles.switchRowTitle, { color: themeColors.text }]}>
              {t('notifications.turnOffAllPush')}
            </Text>
            <Switch
              value={allPushOff}
              onValueChange={handleToggleAllPush}
              trackColor={
                preset === 'default'
                  ? undefined
                  : { false: themeColors.border, true: themeColors.primary }
              }
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              ios_backgroundColor={preset === 'default' ? undefined : themeColors.border}
              style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
            />
          </View>
        </Card>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notificationLabel: {
    ...typography.p1,
    lineHeight: 22,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchRowTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});
