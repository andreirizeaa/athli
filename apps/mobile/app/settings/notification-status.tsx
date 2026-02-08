import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { NOTIFICATION_TITLES } from '@athli/shared-types';
import type { NotificationType } from '@athli/shared-types';
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from '@/services/notification-preferences-service';

const HEADER_HEIGHT = 52;

export default function NotificationStatusScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { colors: themeColors, preset } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const notificationType = type as NotificationType;
  const title = NOTIFICATION_TITLES[notificationType] || type;

  useEffect(() => {
    loadPreferences();
  }, [notificationType]);

  const loadPreferences = async () => {
    try {
      const prefs = await getNotificationPreferences();
      const pref = prefs.find((p) => p.notification_type === notificationType);
      if (pref) {
        setInAppEnabled(pref.in_app_enabled);
        setPushEnabled(pref.push_enabled);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInAppToggle = (value: boolean) => {
    setInAppEnabled(value);
    updateNotificationPreference(notificationType, { inAppEnabled: value }).catch((error) => {
      console.error('Failed to update in-app preference:', error);
      setInAppEnabled(!value);
    });
  };

  const handlePushToggle = (value: boolean) => {
    setPushEnabled(value);
    updateNotificationPreference(notificationType, { pushEnabled: value }).catch((error) => {
      console.error('Failed to update push preference:', error);
      setPushEnabled(!value);
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + HEADER_HEIGHT },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={themeColors.mutedText} style={styles.loader} />
        ) : (
          <Card style={{ paddingVertical: 12 }}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchRowTitle, { color: themeColors.text }]}>
                {t('notifications.inApp')}
              </Text>
              <Switch
                value={inAppEnabled}
                onValueChange={handleInAppToggle}
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
                {t('notifications.push')}
              </Text>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
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
        )}
      </View>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleGoBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{title}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loader: {
    marginTop: 32,
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
