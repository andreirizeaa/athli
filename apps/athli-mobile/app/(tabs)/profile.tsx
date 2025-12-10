import React from 'react';
import type { JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';

type PlatformIconProps = {
  sf: string;
  mdi: string;
  size?: number;
  color?: string;
};

const PlatformIcon = ({ sf, mdi, size = 24, color = '#000000' }: PlatformIconProps) => {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
  }
  return <MaterialIcons name={mdi as any} size={size} color={color} />;
};

export interface SettingsOptionProps {
  icon: JSX.Element;
  title: string;
  subtitle?: string;
  subtitleRight?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  showChevron?: boolean;
}

export function SettingsOption({ icon, title, subtitle, subtitleRight, onPress, showChevron }: SettingsOptionProps) {
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
        {subtitle && !subtitleRight && (
          <Text style={[styles.optionSubtitle, { color: themeColors.mutedText }]}>{subtitle}</Text>
        )}
      </View>
      {subtitle && subtitleRight && (
        <View style={styles.subtitleRightContainer}>
          <Text style={[styles.optionSubtitleRight, { color: themeColors.mutedText }]}>{subtitle}</Text>
        </View>
      )}
      {showChevron && (
        <View style={styles.chevronContainer}>
          <PlatformIcon sf="chevron.right" mdi="chevron-right" size={iconSizes.navigationChevrons} color={themeColors.mutedText} />
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

  const isAthleteView = appView === 'athlete';

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', isAthleteView ? themeColors.background : themeColors.pageBackground]
      : [primarySoftColor, isAthleteView ? themeColors.background : themeColors.pageBackground];

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
                <PlatformIcon sf="chevron.right" mdi="chevron-right" size={iconSizes.extraSmallIcons} color={themeColors.text} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Profile Card - Only shown in athlete view */}
          {isAthleteView && (
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
                <View style={styles.profileAvatar}>
                  <View style={styles.fallbackAvatar}>
                    <PlatformIcon sf="person.fill" mdi="person" size={iconSizes.settingsIcons} color="#ffffff" />
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
                    <PlatformIcon sf="pencil" mdi="edit" size={iconSizes.smallIcons} color={themeColors.mutedText} />
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
          )}

          {/* Account */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.account')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={
                <PlatformIcon
                  sf="person.text.rectangle"
                  mdi="badge"
                  size={iconSize}
                  color={iconColor}
                />
              }
              title={t('profile.personalDetails')}
              showChevron
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<PlatformIcon sf="gear" mdi="settings" size={iconSize} color={iconColor} />}
              title={t('profile.preferences')}
              showChevron
              onPress={handleOpenPreferences}
            />
          </View>

          {/* Support */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.support')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<PlatformIcon sf="envelope.badge" mdi="mail-outline" size={iconSize} color={iconColor} />}
              title={t('profile.supportEmail')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<PlatformIcon sf="megaphone" mdi="campaign" size={iconSize} color={iconColor} />}
              title={t('profile.featureRequests')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<PlatformIcon sf="arrow.clockwise" mdi="refresh" size={iconSize} color={iconColor} />}
              title={t('profile.syncData')}
              subtitle={`${t('profile.lastSynced')} ${t('profile.never')}`}
              subtitleRight
            />
          </View>

          {/* Legal */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.legal')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<PlatformIcon sf="doc.text" mdi="description" size={iconSize} color={iconColor} />}
              title={t('profile.termsAndConditions')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<PlatformIcon sf="checkmark.shield" mdi="verified-user" size={iconSize} color={iconColor} />}
              title={t('profile.privacyPolicy')}
            />
          </View>

          {/* Account Actions */}
          <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{t('profile.accountActions')}</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <SettingsOption
              icon={<PlatformIcon sf="rectangle.portrait.and.arrow.right" mdi="logout" size={iconSize} color={iconColor} />}
              title={t('profile.logout')}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
            <SettingsOption
              icon={<PlatformIcon sf="person.badge.minus" mdi="person-remove" size={iconSize} color={iconColor} />}
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
  subtitleRightContainer: {
    marginRight: 4,
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
  optionSubtitleRight: {
    ...typography.p6,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
