import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Linking, ActivityIndicator } from 'react-native';
import { PressableScale } from 'pressto';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Storage } from '@/lib/storage';
import { haptics } from '@/utils/haptics';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronRight,
  Cog,
  FileText,
  LogOut,
  MailPlus,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  User,
  UserMinus,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore, useClientProfileStore } from '@/stores';
import { useAppView } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

type PlatformIconProps = {
  sf: string;
  mdi?: string;
  IconComponent: LucideIcon;
  size?: number;
  color?: string;
};

const PlatformIcon = ({ sf, mdi, IconComponent, size = 24, color = '#000000' }: PlatformIconProps) => {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
  }
  // For Android, use MaterialIcons if mdi is provided, otherwise use Lucide
  if (mdi && Platform.OS === 'android') {
    return <MaterialIcons name={mdi as any} size={size} color={color} />;
  }
  return <IconComponent {...({ size, color } as any)} />;
};

const LAST_SYNC_KEY = 'athli:last-sync-time';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  // Get the appropriate profile based on view
  const currentProfile = appView === 'athlete' ? clientProfile : coachProfile;
  const profileName = currentProfile?.name || t('profile.enterYourName');
  const profilePictureUrl = currentProfile?.profile_picture_url;

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const storedTime = Storage.getItem(LAST_SYNC_KEY);
    if (storedTime) {
      setLastSyncTime(storedTime);
    }
  }, []);

  const formatLastSyncTime = useCallback((isoTime: string): string => {
    const date = new Date(isoTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  const handleSyncData = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries();
      const now = new Date().toISOString();
      Storage.setItem(LAST_SYNC_KEY, now);
      setLastSyncTime(now);
      haptics.success();
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, isSyncing]);

  const isAthleteView = appView === 'athlete';
  const isCoach = !!coachProfile;

  const handleOpenPreferences = () => {
    router.push({ pathname: '/settings/preferences' });
  };

  const handleOpenProfile = () => {
    router.push('/settings/edit-profile');
  };

  const handleOpenWebURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleOpenDeleteAccount = () => {
    if (!isAthleteView) {
      handleOpenWebURL('https://app.tryathli.com/');
    }
  };

  const handleOpenTermsOfService = () => {
    handleOpenWebURL('https://app.tryathli.com/');
  };

  const handleOpenPrivacyPolicy = () => {
    handleOpenWebURL('https://app.tryathli.com/');
  };

  const handleOpenSupportEmail = () => {
    const email = 'support@tryathli.com';
    const subject = encodeURIComponent('Athli App Support Request');
    const body = encodeURIComponent('Hi Athli Support Team,\n\nI need help with:\n\n');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch((err) =>
      console.error('Failed to open email:', err)
    );
  };

  const handleLogout = () => {
    router.push('/modals/auth/logout-confirmation-modal');
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerSection}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {isAthleteView ? t('profile.title') : t('settings.title')}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        {/* Profile Card */}
        <PressableScale onPress={handleOpenProfile}>
          <Card>
            <View style={styles.profileRow}>
              <View style={styles.profileAvatar}>
                {profilePictureUrl ? (
                  <Image
                    source={{ uri: profilePictureUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.fallbackAvatar}>
                    <PlatformIcon sf="person.fill" mdi="person" IconComponent={User} size={iconSizes.tabBarIcons} color="#ffffff" />
                  </View>
                )}
              </View>
              <View style={styles.profileTextContainer}>
                <Text
                  style={[styles.profileNameText, { color: themeColors.text }]}
                  numberOfLines={1}
                >
                  {profileName}
                </Text>
              </View>
              <PlatformIcon sf="chevron.right" mdi="chevron-right" IconComponent={ChevronRight} size={iconSizes.extraSmallIcons} color={themeColors.mutedText} />
            </View>
          </Card>
        </PressableScale>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.account')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="gear" mdi="settings" IconComponent={Cog} size={iconSize} color={iconColor} />}
            title={t('profile.preferences')}
            showChevron
            onPress={handleOpenPreferences}
          />
        </Card>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.support')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="envelope" mdi="email" IconComponent={MailPlus} size={iconSize} color={iconColor} />}
            title={t('profile.supportEmail')}
            onPress={handleOpenSupportEmail}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="megaphone" mdi="campaign" IconComponent={Megaphone} size={iconSize} color={iconColor} />}
            title={t('profile.featureRequests')}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="arrow.clockwise" mdi="refresh" IconComponent={RefreshCw} size={iconSize} color={iconColor} />}
            title={t('profile.syncData')}
            subtitle={lastSyncTime ? `${t('profile.lastSynced')} ${formatLastSyncTime(lastSyncTime)}` : `${t('profile.lastSynced')} ${t('profile.never')}`}
            subtitleRight
            onPress={handleSyncData}
            rightElement={isSyncing ? <ActivityIndicator size="small" color={themeColors.mutedText} /> : undefined}
          />
        </Card>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.legal')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="doc.text" mdi="description" IconComponent={FileText} size={iconSize} color={iconColor} />}
            title={t('profile.termsAndConditions')}
            onPress={handleOpenTermsOfService}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="checkmark.shield" mdi="verified-user" IconComponent={ShieldCheck} size={iconSize} color={iconColor} />}
            title={t('profile.privacyPolicy')}
            onPress={handleOpenPrivacyPolicy}
          />
        </Card>

        {/* Account Actions */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.accountActions')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="rectangle.portrait.and.arrow.right" mdi="logout" IconComponent={LogOut} size={iconSize} color={iconColor} />}
            title={t('profile.logout')}
            onPress={handleLogout}
          />
          {!isCoach && (
            <>
              <Separator />
              <SettingsOption
                icon={<PlatformIcon sf="person.badge.minus" mdi="person-remove" IconComponent={UserMinus} size={iconSize} color={iconColor} />}
                title={t('profile.deleteAccount')}
                onPress={handleOpenDeleteAccount}
              />
            </>
          )}
        </Card>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  profileAvatar: {
    width: 65,
    height: 65,
    borderRadius: 40,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#ffb86a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileNameText: {
    ...typography.h5,
  },
});
