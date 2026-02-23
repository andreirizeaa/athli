import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator, InteractionManager, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { PressableScale } from 'pressto';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Storage } from '@/lib/storage';
import { haptics } from '@/utils/haptics';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Cog,
  CreditCard,
  ArrowLeftRight,
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
import { useTerminology } from '@/hooks/useTerminology';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { signOut } from '@/services/auth/supabase-auth';
import { apiFetch } from '@/lib/api-client';
import { getClients } from '@/services/coach/coach-client-service';
import { fetchClientProfile } from '@/services/client/client-profile-service';

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
  const terminology = useTerminology();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);
  const setClientProfile = useClientProfileStore((state) => state.setProfile);
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  // Get the appropriate profile based on view
  const currentProfile = appView === 'athlete' ? clientProfile : coachProfile;
  const profileName = currentProfile?.name || t('profile.enterYourName');
  const profilePictureUrl = currentProfile?.profile_picture_url;

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleOpenNotifications = () => {
    router.push({ pathname: '/settings/notifications' });
  };

  const handleOpenBilling = () => {
    router.push({ pathname: '/settings/billing' });
  };

  const handleOpenProfile = () => {
    router.push('/settings/edit-profile');
  };

  const handleOpenWebURL = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        dismissButtonStyle: 'done',
        showTitle: true,
      });
    } catch (err) {
      console.error('Failed to open URL:', err);
    }
  };

  const handleOpenTermsOfService = () => {
    const marketingUrl = process.env.EXPO_PUBLIC_MARKETING_APP_URL ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_MARKETING_APP_URL ||
      'https://www.tryathli.com';
    handleOpenWebURL(`${marketingUrl}/terms-of-use`);
  };

  const handleOpenPrivacyPolicy = () => {
    const marketingUrl = process.env.EXPO_PUBLIC_MARKETING_APP_URL ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_MARKETING_APP_URL ||
      'https://www.tryathli.com';
    handleOpenWebURL(`${marketingUrl}/privacy-policy`);
  };

  const handleOpenHelpArticles = () => {
    handleOpenWebURL('https://docs.tryathli.com');
  };

  const handleOpenChat = () => {
    handleOpenWebURL('https://tawk.to/chat/699cd9ad9f81c11c340d9f77/1ji6b4jm3');
  };

  const handleLogout = () => {
    InteractionManager.runAfterInteractions(() => {
      setShowLogoutDialog(true);
    });
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setShowLogoutDialog(false);
      router.replace('/welcome');
    } catch (error) {
      setShowLogoutDialog(false);
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const handleDeleteAccount = () => {
    setShowDeleteAccountDialog(true);
  };

  const [isSwitchingToClient, setIsSwitchingToClient] = useState(false);

  const handleViewClientArea = async () => {
    if (!coachProfile || isSwitchingToClient) return;
    setIsSwitchingToClient(true);
    try {
      // Mark checklist item as completed
      apiFetch('/coach/new/checklist', {
        method: 'PATCH',
        body: JSON.stringify({ field: 'client_app_demo' }),
      }).catch(() => {});

      // Ensure demo client is seeded (idempotent)
      await apiFetch('/user/seed-demo-data', { method: 'POST' });

      // Find the demo client — demo uses same ID as coach (self-reference)
      const clients = await getClients();
      const demoClient = clients.find(c => c.id === coachProfile.id);
      if (!demoClient) {
        console.error('No demo client found for coach');
        return;
      }

      const demoClientProfile = await fetchClientProfile(demoClient.id, coachProfile.id);
      demoClientProfile.coach_id = coachProfile.id;
      setClientProfile(demoClientProfile);
      setAppView('athlete');
    } catch (error) {
      console.error('Failed to switch to client area:', error);
    } finally {
      setIsSwitchingToClient(false);
    }
  };

  return (
    <>
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
            onPress={handleOpenPreferences}
            showChevron
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="bell" mdi="notifications" IconComponent={Bell} size={iconSize} color={iconColor} />}
            title={t('profile.notifications')}
            onPress={handleOpenNotifications}
            showChevron
          />
          {isCoach && !isAthleteView && (
            <>
              <Separator />
              <SettingsOption
                icon={<PlatformIcon sf="creditcard" mdi="credit-card" IconComponent={CreditCard} size={iconSize} color={iconColor} />}
                title={t('settings.billing.title')}
                onPress={handleOpenBilling}
                showChevron
              />
            </>
          )}
        </Card>

        {/* Explore - only for coaches */}
        {isCoach && !isAthleteView && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.explore')}</Text>
            <PressableScale onPress={handleViewClientArea} disabled={isSwitchingToClient}>
              <Card>
                <View style={styles.profileRow}>
                  <View style={styles.optionIconContainer}>
                    <PlatformIcon sf="arrow.left.arrow.right" mdi="swap-horiz" IconComponent={ArrowLeftRight} size={iconSize} color={iconColor} />
                  </View>
                  <View style={styles.profileTextContainer}>
                    <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                      {`View your ${terminology.singularLower} area`}
                    </Text>
                  </View>
                  {isSwitchingToClient ? (
                    <ActivityIndicator size="small" color={themeColors.mutedText} />
                  ) : (
                    <PlatformIcon sf="chevron.right" mdi="chevron-right" IconComponent={ChevronRight} size={iconSizes.extraSmallIcons} color={themeColors.mutedText} />
                  )}
                </View>
              </Card>
            </PressableScale>
          </>
        )}

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.support')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="megaphone" mdi="campaign" IconComponent={Megaphone} size={iconSize} color={iconColor} />}
            title={t('profile.featureRequests')}
            onPress={() => router.push('/settings/feature-requests')}
            showChevron
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="book" mdi="menu-book" IconComponent={BookOpen} size={iconSize} color={iconColor} />}
            title={t('profile.helpArticles')}
            onPress={handleOpenHelpArticles}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="envelope" mdi="email" IconComponent={MailPlus} size={iconSize} color={iconColor} />}
            title={t('profile.supportEmail')}
            onPress={handleOpenChat}
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
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="person.badge.minus" mdi="person-remove" IconComponent={UserMinus} size={iconSize} color={iconColor} />}
            title={t('profile.deleteAccount')}
            onPress={handleDeleteAccount}
          />
        </Card>
      </View>
    </ScreenWrapper>
    <Dialog
      visible={showLogoutDialog}
      onClose={handleLogoutCancel}
      title={t('profile.logoutConfirmTitle')}
      message={t('profile.logoutConfirmMessage')}
      buttons={[
        {
          label: t('general.cancel'),
          onPress: handleLogoutCancel,
          variant: 'secondary',
        },
        {
          label: t('profile.logout'),
          onPress: handleLogoutConfirm,
          variant: 'destructive',
          loading: isLoggingOut,
        },
      ]}
    />
    <Dialog
      visible={showDeleteAccountDialog}
      onClose={() => setShowDeleteAccountDialog(false)}
      title={t('profile.deleteAccountModal.title')}
      message={t('profile.deleteAccountModal.message')}
      buttons={[
        {
          label: t('general.ok'),
          onPress: () => setShowDeleteAccountDialog(false),
          variant: 'primary',
        },
      ]}
    />
    </>
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
  optionIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  optionTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
});
