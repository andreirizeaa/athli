import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronRight,
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
  IconComponent: LucideIcon;
  size?: number;
  color?: string;
};

const PlatformIcon = ({ sf, IconComponent, size = 24, color = '#000000' }: PlatformIconProps) => {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
  }
  return <IconComponent {...({ size, color } as any)} />;
};

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();
  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  const isAthleteView = appView === 'athlete';

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', isAthleteView ? themeColors.background : themeColors.pageBackground]
      : [primarySoftColor, isAthleteView ? themeColors.background : themeColors.pageBackground];

  const handleOpenPreferences = () => {
    router.push({ pathname: '/preferences' });
  };

  const handleToggleView = () => {
    const newView = appView === 'athlete' ? 'coach' : 'athlete';
    setAppView(newView);
    // Navigate to default page for the new view
    const defaultRoute = newView === 'coach' ? '/clients' : '/training';
    router.replace(defaultRoute);
  };

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
    <SafeAreaView style={styles.safeArea}>
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
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: themeColors.text,
                },
              ]}
              activeOpacity={0.7}
              onPress={handleToggleView}
            >
              <View style={styles.viewToggleContent}>
                <Text style={[styles.viewToggleText, { color: themeColors.text }]}>
                  {isAthleteView ? t('profile.coachView') : t('settings.athleteView')}
                </Text>
                <PlatformIcon sf="chevron.right" IconComponent={ChevronRight} size={iconSizes.extraSmallIcons} color={themeColors.text} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Profile Card - Only shown in athlete view */}
          {isAthleteView && (
            <Card>
              <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
                <View style={styles.profileAvatar}>
                  <View style={styles.fallbackAvatar}>
                    <PlatformIcon sf="person.fill" IconComponent={User} size={iconSizes.tabBarIcons} color="#ffffff" />
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
                    <PlatformIcon sf="pencil" IconComponent={Pencil} size={iconSizes.smallIcons} color={themeColors.mutedText} />
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
              icon={<PlatformIcon sf="person.text.rectangle" IconComponent={IdCard} size={iconSize} color={iconColor} />}
              title={t('profile.personalDetails')}
              showChevron
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
            />
            <Separator />
            <SettingsOption
              icon={<PlatformIcon sf="checkmark.shield" IconComponent={ShieldCheck} size={iconSize} color={iconColor} />}
              title={t('profile.privacyPolicy')}
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
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    flex: 1,
  },
  viewToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: 2,
  },
  viewToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewToggleText: {
    ...typography.p5,
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
