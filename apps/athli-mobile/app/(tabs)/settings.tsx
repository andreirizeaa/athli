import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import {
  ArrowLeftRight,
  Cog,
  FileText,
  IdCard,
  LogOut,
  MailPlus,
  Megaphone,
  Pencil,
  RefreshCw,
  ShieldCheck,
  User,
  UserMinus,
} from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/card';
import { SettingsOption } from '@/components/settings-option';
import { Separator } from '@/components/separator';

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

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  const isAthleteView = appView === 'athlete';

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', isAthleteView ? themeColors.background : themeColors.pageBackground]
      : [primarySoftColor, isAthleteView ? themeColors.background : themeColors.pageBackground];

  const handleOpenPreferences = () => {
    router.push({ pathname: '/settings/preferences' });
  };

  const handleToggleView = () => {
    const newView = appView === 'athlete' ? 'coach' : 'athlete';
    setAppView(newView);
    // Navigate to default page for the new view
    const defaultRoute = newView === 'coach' ? '/clients' : '/training';
    router.replace(defaultRoute);
  };

  const handleOpenWebURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleOpenPersonalDetails = () => {
    if (!isAthleteView) {
      handleOpenWebURL('https://app.tryathli.com/');
    }
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
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              {isAthleteView ? t('profile.title') : t('settings.title')}
            </Text>
          </View>

          {/* View Switching Card */}
          <Card>
            <SettingsOption
              icon={
                <PlatformIcon
                  sf="arrow.left.arrow.right"
                  mdi="swap-horiz"
                  IconComponent={ArrowLeftRight}
                  size={iconSize - 2}
                  color={iconColor}
                />
              }
              title={isAthleteView ? t('profile.viewCoachesArea') : t('settings.viewAthletesArea')}
              showChevron
              onPress={handleToggleView}
            />
          </Card>

          {/* Profile Card - Only shown in athlete view */}
          {isAthleteView && (
            <Card>
              <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
                <View style={styles.profileAvatar}>
                  <View style={styles.fallbackAvatar}>
                    <PlatformIcon sf="person.fill" mdi="person" IconComponent={User} size={iconSizes.tabBarIcons} color="#ffffff" />
                  </View>
                </View>
                <View style={styles.profileTextContainer}>
                  <View style={styles.profileNameRow}>
                    <Text
                      style={[styles.profileNameText, { color: themeColors.text }]}
                      numberOfLines={1}
                    >
                      {t('profile.enterYourName')}
                    </Text>
                    <PlatformIcon sf="pencil" mdi="edit" IconComponent={Pencil} size={iconSizes.smallIcons} color={themeColors.mutedText} />
                  </View>
                  <Text
                    style={[styles.profileSubtitleText, { color: themeColors.mutedText }]}
                    numberOfLines={1}
                  >
                    {t('profile.memberSince')} 2024
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          )}

          {/* Account */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.account')}</Text>
          <Card>
            <SettingsOption
              icon={<PlatformIcon sf="person.text.rectangle" mdi="badge" IconComponent={IdCard} size={iconSize} color={iconColor} />}
              title={t('profile.personalDetails')}
              showChevron
              onPress={handleOpenPersonalDetails}
            />
            <Separator />
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
              subtitle={`${t('profile.lastSynced')} ${t('profile.never')}`}
              subtitleRight
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
            />
            <Separator />
            <SettingsOption
              icon={<PlatformIcon sf="person.badge.minus" mdi="person-remove" IconComponent={UserMinus} size={iconSize} color={iconColor} />}
              title={t('profile.deleteAccount')}
              onPress={handleOpenDeleteAccount}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 20,
    marginBottom: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    backgroundColor: '#ffb86a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileNameText: {
    ...typography.h5,
  },
  profileSubtitleText: {
    ...typography.p3,
    marginTop: 2,
  },
});
