import React from 'react';
import { StyleSheet, Text, View, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  Cog,
  FileText,
  IdCard,
  LogOut,
  MailPlus,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  User,
  UserMinus,
} from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/ui/card';
import { SettingsOption } from '@/components/ui/settings-option';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

export default function ProfileTabScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  const isAthleteView = appView === 'athlete';

  const handleOpenPreferences = () => {
    router.push({ pathname: '/settings/preferences' });
  };

  const handleToggleView = () => {
    const newView = appView === 'athlete' ? 'coach' : 'athlete';
    setAppView(newView);
    const defaultRoute = newView === 'coach' ? '/clients' : '/home';
    router.replace(defaultRoute);
  };

  const handleOpenWebURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleOpenPersonalDetails = () => {
    router.push({ pathname: '/personal-details' });
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
    Linking.openURL('mailto:support@tryathli.com').catch((err) =>
      console.error('Failed to open email:', err)
    );
  };

  return (
    <ScreenWrapper contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('profile.title')}
          </Text>
        </View>
        {/* View Switching Card */}
        <Card>
          <SettingsOption
            icon={
              <PlatformIcon
                sf="arrow.left.arrow.right"
                IconComponent={ArrowLeftRight}
                size={iconSize - 2}
                color={iconColor}
              />
            }
            title={t('profile.viewCoachesArea')}
            showChevron
            onPress={handleToggleView}
          />
        </Card>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.account')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="person.text.rectangle" IconComponent={IdCard} size={iconSize} color={iconColor} />}
            title={t('profile.personalDetails')}
            showChevron
            onPress={handleOpenPersonalDetails}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="gear" IconComponent={Cog} size={iconSize} color={iconColor} />}
            title={t('profile.preferences')}
            showChevron
            onPress={handleOpenPreferences}
          />
        </Card>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.support')}</Text>
        <Card>
          <SettingsOption
            icon={<PlatformIcon sf="envelope" IconComponent={MailPlus} size={iconSize} color={iconColor} />}
            title={t('profile.supportEmail')}
            onPress={handleOpenSupportEmail}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="megaphone" IconComponent={Megaphone} size={iconSize} color={iconColor} />}
            title={t('profile.featureRequests')}
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
          <SettingsOption
            icon={<PlatformIcon sf="rectangle.portrait.and.arrow.right" IconComponent={LogOut} size={iconSize} color={iconColor} />}
            title={t('profile.logout')}
          />
          <Separator />
          <SettingsOption
            icon={<PlatformIcon sf="person.badge.minus" IconComponent={UserMinus} size={iconSize} color={iconColor} />}
            title={t('profile.deleteAccount')}
            onPress={handleOpenDeleteAccount}
          />
        </Card>
        <View style={{ height: 60 }} />
      </View>
    </ScreenWrapper>
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
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
});
