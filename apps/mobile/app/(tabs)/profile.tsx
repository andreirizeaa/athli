import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Linking, InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  BookOpen,
  Briefcase,
  ChevronRight,
  Cog,
  CreditCard,
  FileText,
  Lock,
  LogOut,
  Mail,
  MailPlus,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  User,
  UserMinus,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useClientProfileStore, useCoachProfileStore, useAppView, useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { signOut } from '@/services/auth/supabase-auth';
import { apiFetch } from '@/lib/api-client';
import { haptics } from '@/utils/haptics';

export default function ProfileTabScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  const isAthleteView = appView === 'athlete';
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);

  const currentProfile = isAthleteView ? clientProfile : coachProfile;
  const profileName = currentProfile?.name || t('profile.enterYourName');
  const profilePictureUrl = currentProfile?.profile_picture_url;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [showDeletionSuccessDialog, setShowDeletionSuccessDialog] = useState(false);
  const [showDeletionErrorDialog, setShowDeletionErrorDialog] = useState(false);
  const [showDeletionAlreadySentDialog, setShowDeletionAlreadySentDialog] = useState(false);

  const handleOpenPreferences = () => {
    router.push({ pathname: '/settings/preferences' });
  };

  const handleOpenWebURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleOpenProfileDetails = () => {
    if (isAthleteView) {
      router.push({ pathname: '/profile/client-details' });
      return;
    }

    router.push({ pathname: '/settings/edit-profile' });
  };

  const handleOpenTermsOfService = () => {
    handleOpenWebURL('https://app.tryathli.com/');
  };

  const handleOpenPrivacyPolicy = () => {
    handleOpenWebURL('https://app.tryathli.com/');
  };

  const handleOpenSupportEmail = () => {
    Linking.openURL('mailto:support@tryathli.com').catch((err) =>
      console.error('Failed to open email:', err)
    );
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

  const handleRequestDeletion = () => {
    InteractionManager.runAfterInteractions(() => {
      setShowDeletionDialog(true);
    });
  };

  const handleDeletionConfirm = async () => {
    setIsRequestingDeletion(true);
    try {
      const res = await apiFetch<{ data?: { alreadyRequested?: boolean } }>('/user/request-deletion', { method: 'POST' });
      setShowDeletionDialog(false);
      if (res.data?.alreadyRequested) {
        setShowDeletionAlreadySentDialog(true);
      } else {
        haptics.success();
        setShowDeletionSuccessDialog(true);
      }
    } catch (error) {
      console.error('Failed to request account deletion:', error);
      setShowDeletionDialog(false);
      setShowDeletionErrorDialog(true);
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  const handleDeletionCancel = () => {
    setShowDeletionDialog(false);
  };

  const handleManageGoogle = useCallback(() => {
    Linking.openURL('https://myaccount.google.com/security');
  }, []);

  const handleManageApple = useCallback(() => {
    Linking.openURL('https://appleid.apple.com/account/manage');
  }, []);

  const handleChangeEmail = useCallback(() => {
    router.push('/modals/settings/change-email-modal');
  }, [router]);

  const handleChangePassword = useCallback(() => {
    router.push('/modals/settings/change-password-modal');
  }, [router]);

  const handleSwitchToCoach = useCallback(() => {
    setAppView('coach');
  }, [setAppView]);

  const handleOpenBilling = useCallback(() => {
    router.push('/profile/billing');
  }, [router]);

  return (
    <>
    <ScreenWrapper tabScreen>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('profile.title')}
          </Text>
        </View>

        {/* Profile Settings Row (same pattern as coach settings) */}
        <PressableScale onPress={handleOpenProfileDetails}>
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
                    <PlatformIcon
                      sf="person.fill"
                      IconComponent={User}
                      size={iconSizes.tabBarIcons}
                      color="#ffffff"
                    />
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
              <PlatformIcon
                sf="chevron.right"
                IconComponent={ChevronRight}
                size={iconSizes.extraSmallIcons}
                color={themeColors.mutedText}
              />
            </View>
          </Card>
        </PressableScale>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.account')}</Text>
        <Card>
          <PressableScale onPress={handleOpenPreferences}>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="gear" IconComponent={Cog} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('profile.preferences')}
                </Text>
              </View>
              <PlatformIcon
                sf="chevron.right"
                IconComponent={ChevronRight}
                size={iconSizes.extraSmallIcons}
                color={themeColors.mutedText}
              />
            </View>
          </PressableScale>
          {/* Billing - only show for athlete view (not coach's demo client view) */}
          {isAthleteView && clientProfile?.coach_id !== clientProfile?.client_id && (
            <>
              <Separator />
              <PressableScale onPress={handleOpenBilling}>
                <View style={styles.optionRow}>
                  <View style={styles.optionIconContainer}>
                    <PlatformIcon sf="creditcard" IconComponent={CreditCard} size={iconSize} color={iconColor} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                      {t('profile.billing')}
                    </Text>
                  </View>
                  <PlatformIcon
                    sf="chevron.right"
                    IconComponent={ChevronRight}
                    size={iconSizes.extraSmallIcons}
                    color={themeColors.mutedText}
                  />
                </View>
              </PressableScale>
            </>
          )}
        </Card>

        {/* Security - hidden for coach's demo client view */}
        {clientProfile?.coach_id !== clientProfile?.client_id && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
              {t('profile.security')}
            </Text>
            <Card>
              {currentProfile?.signin_method === 'google' && (
                <PressableScale style={styles.providerRow} onPress={handleManageGoogle}>
                  <Image
                    source={require('@/assets/icons/google.png')}
                    style={styles.providerLogo}
                    contentFit="contain"
                  />
                  <Text style={[styles.providerText, { color: themeColors.text }]}>
                    {t('profile.manageWithGoogle')}
                  </Text>
                  <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                </PressableScale>
              )}
              {currentProfile?.signin_method === 'apple' && (
                <PressableScale style={styles.providerRow} onPress={handleManageApple}>
                  <Image
                    source={require('@/assets/icons/apple.png')}
                    style={[styles.providerLogo, { tintColor: themeColors.text }]}
                    contentFit="contain"
                  />
                  <Text style={[styles.providerText, { color: themeColors.text }]}>
                    {t('profile.manageWithApple')}
                  </Text>
                  <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                </PressableScale>
              )}
              {currentProfile?.signin_method === 'email' && (
                <>
                  <PressableScale style={styles.providerRow} onPress={handleChangePassword}>
                    <PlatformIcon
                      sf="lock"
                      IconComponent={Lock}
                      size={iconSizes.tabBarIcons}
                      color={themeColors.text}
                    />
                    <Text style={[styles.providerText, { color: themeColors.text }]}>
                      {t('profile.changePassword')}
                    </Text>
                    <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                  </PressableScale>
                  <Separator />
                  <PressableScale style={styles.providerRow} onPress={handleChangeEmail}>
                    <PlatformIcon
                      sf="envelope"
                      IconComponent={Mail}
                      size={iconSizes.tabBarIcons}
                      color={themeColors.text}
                    />
                    <View style={styles.providerTextContainer}>
                      <Text style={[styles.providerTextInContainer, { color: themeColors.text }]}>
                        {t('profile.changeEmail')}
                      </Text>
                      {currentProfile?.email && (
                        <Text style={[styles.providerSubtitle, { color: themeColors.mutedText }]}>
                          {currentProfile.email}
                        </Text>
                      )}
                    </View>
                    <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                  </PressableScale>
                </>
              )}
            </Card>
          </>
        )}

        {/* Coach (athlete view only) */}
        {isAthleteView && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.coach')}</Text>
            <Card>
              {clientProfile?.coach_id === clientProfile?.client_id && (
                <>
                  <SettingsOption
                    icon={<PlatformIcon sf="arrow.left.arrow.right" IconComponent={ArrowLeftRight} size={iconSize} color={iconColor} />}
                    title={t('profile.switchToCoachApp')}
                    onPress={handleSwitchToCoach}
                    showChevron
                  />
                  <Separator />
                </>
              )}
              <SettingsOption
                icon={<PlatformIcon sf="briefcase" IconComponent={Briefcase} size={iconSize} color={iconColor} />}
                title={t('profile.viewCoachProfile')}
                onPress={() => router.push('/profile/coach-profile')}
                showChevron
              />
            </Card>
          </>
        )}

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.support')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="megaphone" IconComponent={Megaphone} size={iconSize} color={iconColor} />}
            title={t('profile.featureRequests')}
            onPress={() => router.push('/settings/feature-requests')}
            showChevron
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="book" IconComponent={BookOpen} size={iconSize} color={iconColor} />}
            title={t('profile.helpArticles')}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="envelope" IconComponent={MailPlus} size={iconSize} color={iconColor} />}
            title={t('profile.supportEmail')}
            onPress={handleOpenSupportEmail}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="arrow.clockwise" IconComponent={RefreshCw} size={iconSize} color={iconColor} />}
            title={t('profile.syncData')}
            subtitle={`${t('profile.lastSynced')} ${t('profile.never')}`}
            subtitleRight
          />
        </Card>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.legal')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="doc.text" IconComponent={FileText} size={iconSize} color={iconColor} />}
            title={t('profile.termsAndConditions')}
            onPress={handleOpenTermsOfService}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="checkmark.shield" IconComponent={ShieldCheck} size={iconSize} color={iconColor} />}
            title={t('profile.privacyPolicy')}
            onPress={handleOpenPrivacyPolicy}
          />
        </Card>

        {/* Account Actions */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.accountActions')}</Text>
        <Card>
          <PressableScale onPress={handleLogout}>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="rectangle.portrait.and.arrow.right" IconComponent={LogOut} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('profile.logout')}
                </Text>
              </View>
            </View>
          </PressableScale>
          <Separator />
          <PressableScale onPress={handleRequestDeletion}>
            <View style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <PlatformIcon sf="person.badge.minus" IconComponent={UserMinus} size={iconSize} color={iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: themeColors.text }]}>
                  {t('profile.requestDeletion')}
                </Text>
              </View>
            </View>
          </PressableScale>
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
      visible={showDeletionDialog}
      onClose={handleDeletionCancel}
      title={t('profile.requestDeletionTitle')}
      message={t('profile.requestDeletionMessage')}
      buttons={[
        {
          label: t('general.cancel'),
          onPress: handleDeletionCancel,
          variant: 'secondary',
        },
        {
          label: t('profile.requestDeletion'),
          onPress: handleDeletionConfirm,
          variant: 'destructive',
          loading: isRequestingDeletion,
        },
      ]}
    />
    <Dialog
      visible={showDeletionSuccessDialog}
      onClose={() => setShowDeletionSuccessDialog(false)}
      title={t('profile.requestDeletionTitle')}
      message={t('profile.deleteAccountRequestSent')}
      buttons={[
        {
          label: t('general.ok'),
          onPress: () => setShowDeletionSuccessDialog(false),
          variant: 'primary',
        },
      ]}
    />
    <Dialog
      visible={showDeletionErrorDialog}
      onClose={() => setShowDeletionErrorDialog(false)}
      title={t('general.error')}
      message={t('profile.deleteAccountError')}
      buttons={[
        {
          label: t('general.ok'),
          onPress: () => setShowDeletionErrorDialog(false),
          variant: 'primary',
        },
      ]}
    />
    <Dialog
      visible={showDeletionAlreadySentDialog}
      onClose={() => setShowDeletionAlreadySentDialog(false)}
      title={t('profile.requestDeletionTitle')}
      message={t('profile.deleteAccountAlreadyRequested')}
      buttons={[
        {
          label: t('general.ok'),
          onPress: () => setShowDeletionAlreadySentDialog(false),
          variant: 'primary',
        },
      ]}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    flex: 1,
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
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  providerLogo: {
    width: iconSizes.tabBarIcons,
    height: iconSizes.tabBarIcons,
  },
  providerText: {
    ...typography.p1,
    flex: 1,
    marginLeft: 12,
  },
  providerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  providerTextInContainer: {
    ...typography.p1,
  },
  providerSubtitle: {
    ...typography.p3,
    marginTop: 2,
  },
});
