import React from 'react';
import type { JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BellRing,
  Cog,
  ChevronRight,
  FileText,
  IdCard,
  Languages,
  LogOut,
  MailPlus,
  Megaphone,
  Pencil,
  RefreshCw,
  Ruler,
  School2,
  ShieldCheck,
  Star,
  User,
  UserMinus,
} from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';

export interface SettingsOptionProps {
  icon: JSX.Element;
  title: string;
  subtitle?: string;
  onPress?: (event: GestureResponderEvent) => void;
  showChevron?: boolean;
}

export function SettingsOption({ icon, title, subtitle, onPress, showChevron }: SettingsOptionProps) {
  const { colors: themeColors } = useThemePreference();

  const handleOptionPress = (event: GestureResponderEvent) => {
    if (!onPress) {
      return;
    }

    onPress(event);
  };

  return (
    <TouchableOpacity
      style={styles.optionRow}
      activeOpacity={0.7}
      onPress={onPress ? handleOptionPress : undefined}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        <Text style={[styles.optionTitle, { color: themeColors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.optionSubtitle, { color: themeColors.mutedText }]}>{subtitle}</Text>
        )}
      </View>
      {showChevron && (
        <View style={styles.chevronContainer}>
          <ChevronRight size={iconSizes.listIcons} color={themeColors.mutedText} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();
  const iconSize = iconSizes.settingsIcons;
  const iconColor = themeColors.text;

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.background]
      : [primarySoftColor, themeColors.background];

  const handleOpenPreferences = () => {
    router.push({ pathname: '/preferences' });
  };

  const handleToggleView = () => {
    setAppView(appView === 'athlete' ? 'coach' : 'athlete');
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
            <Text style={[styles.title, { color: themeColors.text }]}>{t('profile.title')}</Text>
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
                  {t('profile.coachView')}
                </Text>
                <ChevronRight size={iconSizes.extraSmallIcons} color={themeColors.text} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
              <View style={styles.profileAvatar}>
                <View style={styles.fallbackAvatar}>
                  <User size={iconSizes.settingsIcons} color="#ffffff" />
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
                  <Pencil size={iconSizes.smallIcons} color={themeColors.mutedText} />
                </View>
                <Text
                  style={[styles.profileSubtitleText, { color: themeColors.mutedText }]}
                  numberOfLines={1}
                >
                  {t('profile.memberSince')} 2024
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.account')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<IdCard size={iconSize} color={iconColor} />}
              title={t('profile.personalDetails')}
              showChevron
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<Cog size={iconSize} color={iconColor} />}
              title={t('profile.preferences')}
              showChevron
              onPress={handleOpenPreferences}
            />
          </View>

          {/* Support */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.support')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<MailPlus size={iconSize} color={iconColor} />}
              title={t('profile.supportEmail')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<Megaphone size={iconSize} color={iconColor} />}
              title={t('profile.featureRequests')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<RefreshCw size={iconSize} color={iconColor} />}
              title={t('profile.syncData')}
              subtitle={`${t('profile.lastSynced')} ${t('profile.never')}`}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<Star size={iconSize} color={iconColor} />}
              title={t('profile.leaveRating')}
            />
          </View>

          {/* Legal */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.legal')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<FileText size={iconSize} color={iconColor} />}
              title={t('profile.termsAndConditions')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<ShieldCheck size={iconSize} color={iconColor} />}
              title={t('profile.privacyPolicy')}
            />
          </View>

          {/* Account Actions */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.accountActions')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<LogOut size={iconSize} color={iconColor} />}
              title={t('profile.logout')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<UserMinus size={iconSize} color={iconColor} />}
              title={t('profile.deleteAccount')}
            />
          </View>
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
    ...typography.p2,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    borderWidth: 0.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  chevronContainer: {
    marginLeft: 4,
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
  optionTitle: {
    ...typography.p1,
  },
  optionSubtitle: {
    ...typography.p6,
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
