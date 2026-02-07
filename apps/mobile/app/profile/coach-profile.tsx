import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink, User } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useClientProfileStore, useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { fetchCoachPublicProfile } from '@/services/client/coach-profile-service';
import type { CoachPublicProfile } from '@/services/client/coach-profile-service';
import { findCountry, SPECIALITY_OPTIONS } from '@/services/coach/coach-company-service';

export default function CoachProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const coachId = useClientProfileStore((state) => state.profile?.coach_id);

  const [profile, setProfile] = useState<CoachPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCoachPublicProfile(coachId);
        if (!cancelled) setProfile(data);
      } catch (error) {
        console.error('[CoachProfile] Failed to load:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coachId]);

  const handleBack = () => router.back();

  const handleOpenUrl = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(fullUrl).catch((err) => console.error('Failed to open URL:', err));
  };

  const company = profile?.company;
  const country = company?.location ? findCountry(company.location) : undefined;
  const countryDisplay = country ? `${country.flag} ${country.name}` : undefined;

  const specialityLabels = company?.specialities
    ?.map((val) => SPECIALITY_OPTIONS.find((o) => o.value === val)?.label)
    .filter(Boolean)
    .join(', ');

  const notSet = t('coachProfile.notSet');
  const iconColor = themeColors.text;

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: themeColors.backgroundPrimary,
          paddingTop: insets.top,
          paddingBottom: 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBack}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('coachProfile.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : profile ? (
          <>
            {/* Coach header */}
            <View style={styles.coachHeader}>
              <View style={styles.avatarContainer}>
                {profile.profile_picture_url ? (
                  <Image
                    source={{ uri: profile.profile_picture_url }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.fallbackAvatar}>
                    <PlatformIcon
                      sf="person.fill"
                      IconComponent={User}
                      size={32}
                      color="#ffffff"
                    />
                  </View>
                )}
              </View>
              <Text style={[styles.coachName, { color: themeColors.text }]}>
                {profile.name}
              </Text>
            </View>

            {/* Company Details */}
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
              {t('coachProfile.companyDetails')}
            </Text>
            <Card>
              <DetailRow label={t('coachProfile.companyName')} value={company?.company_name || notSet} />
              <Separator />
              <DetailRow
                label={t('coachProfile.location')}
                value={countryDisplay || notSet}
              />
              <Separator />
              <DetailRow label={t('coachProfile.specialities')} value={specialityLabels || notSet} />
              <Separator />
              {company?.website ? (
                <PressableScale
                  style={styles.linkRow}
                  onPress={() => handleOpenUrl(company!.website!)}
                >
                  <Text style={[styles.linkLabel, { color: themeColors.text }]}>
                    {t('coachProfile.visitWebsite')}
                  </Text>
                  <ExternalLink {...({ size: 16, color: themeColors.primary } as any)} />
                </PressableScale>
              ) : (
                <DetailRow label={t('coachProfile.visitWebsite')} value={notSet} />
              )}
              <Separator />
              {company?.linkedin ? (
                <PressableScale
                  style={styles.linkRow}
                  onPress={() => handleOpenUrl(company!.linkedin!)}
                >
                  <Text style={[styles.linkLabel, { color: themeColors.text }]}>
                    {t('coachProfile.viewLinkedin')}
                  </Text>
                  <ExternalLink {...({ size: 16, color: themeColors.primary } as any)} />
                </PressableScale>
              ) : (
                <DetailRow label={t('coachProfile.viewLinkedin')} value={notSet} />
              )}
              {company?.logo_url && (
                <>
                  <Separator />
                  <DetailRow
                    label={t('coachProfile.companyLogo')}
                    avatarUrl={company.logo_url}
                  />
                </>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
  },
  headerPlaceholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  coachHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#ffb86a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: {
    ...typography.h4,
    marginTop: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkLabel: {
    ...typography.p1,
    flex: 1,
  },
});
