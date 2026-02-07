import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, ChevronLeft, ChevronRight, Lock, Mail, User } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';

import { typography, iconSizes } from '@/constants/typography';
import {
  useThemePreference,
  useAppView,
  useCoachProfileStore,
  useCoachCompanyStore,
  useClientProfileStore,
} from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { DetailRow } from '@/components/ui/detail-row';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { findCountry } from '@/services/coach/coach-company-service';
import { TimezonePickerModal } from '@/components/ui/form-inputs/timezone-picker-modal';
import { TIMEZONE_OPTIONS } from '@athli/shared-types';
import { haptics } from '@/utils/haptics';
import { apiFetch } from '@/lib/api-client';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const coachProfile = useCoachProfileStore((state) => state.profile);
  const company = useCoachCompanyStore((state) => state.company);
  const clientProfile = useClientProfileStore((state) => state.profile);

  const coachUpdateProfile = useCoachProfileStore((state) => state.updateProfile);
  const clientUpdateProfile = useClientProfileStore((state) => state.updateProfile);

  const isAthleteView = appView === 'athlete';

  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);
  const [timezoneSearchQuery, setTimezoneSearchQuery] = useState('');
  const [currentTimezone, setCurrentTimezone] = useState<string | null>(null);

  // Fetch timezone from /user/me API (reads from user_profiles directly, works for both coach and client)
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await apiFetch<{ data: { user: { timezone?: string | null } } }>('/user/me');
        setCurrentTimezone(response.data.user.timezone || null);
      } catch {
        // Non-critical — timezone just won't be shown
      }
    };
    fetchTimezone();
  }, []);

  const timezoneDisplayLabel = useMemo(() => {
    if (!currentTimezone) return null;
    const option = TIMEZONE_OPTIONS.find((tz) => tz.value === currentTimezone);
    const label = option?.label ?? currentTimezone;
    return label.replace(/^\(UTC[^)]*\)\s*/, '');
  }, [currentTimezone]);

  const handleEditTimezone = useCallback(() => {
    setTimezoneModalVisible(true);
    setTimezoneSearchQuery('');
  }, []);

  const handleCloseTimezoneModal = useCallback(() => {
    setTimezoneModalVisible(false);
    setTimezoneSearchQuery('');
  }, []);

  const handleSelectTimezone = useCallback(async (tzValue: string): Promise<void> => {
    const previousTimezone = currentTimezone;
    setCurrentTimezone(tzValue);
    try {
      if (isAthleteView) {
        await clientUpdateProfile({ timezone: tzValue });
      } else {
        await coachUpdateProfile({ timezone: tzValue });
      }
      haptics.success();
      setTimezoneModalVisible(false);
      setTimezoneSearchQuery('');
    } catch (error) {
      console.error('Failed to update timezone:', error);
      setCurrentTimezone(previousTimezone);
      haptics.error();
    }
  }, [isAthleteView, clientUpdateProfile, coachUpdateProfile, currentTimezone]);

  // Log client data when navigating to this screen
  useEffect(() => {
    if (isAthleteView) {
      console.log('[EditProfileScreen] Client profile data:', clientProfile);
    } else {
      console.log('[EditProfileScreen] Coach profile data:', coachProfile);
      console.log('[EditProfileScreen] Company data:', company);
    }
  }, [isAthleteView, clientProfile, coachProfile, company]);

  const handleGoBack = () => {
    router.back();
  };

  // Personal Details handlers
  const handleEditProfilePicture = () => {
    router.push({
      pathname: '/modals/settings/edit-personal-details-modal',
      params: { field: 'profilePicture' },
    });
  };

  const handleEditName = () => {
    router.push({
      pathname: '/modals/settings/edit-personal-details-modal',
      params: { field: 'name' },
    });
  };

  // Company Details handlers
  const handleEditLogo = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'logo' },
    });
  };

  const handleEditCompanyName = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'companyName', currentValue: company?.company_name || '' },
    });
  };

  const handleEditWebsite = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'website', currentValue: company?.website || '' },
    });
  };

  const handleEditLinkedin = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'linkedin', currentValue: company?.linkedin || '' },
    });
  };

  const handleEditLocation = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'location', currentValue: company?.location || '' },
    });
  };

  const handleEditSpecialities = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'specialities', currentValue: JSON.stringify(company?.specialities || []) },
    });
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

  const getSpecialitiesLabel = () => {
    const count = company?.specialities?.length || 0;
    if (count === 0) return t('settings.companyDetails.noneSelected');
    return `${count} ${t('settings.companyDetails.selected')}`;
  };

  // Get country with flag for display
  const locationCountry = useMemo(() => {
    return findCountry(company?.location);
  }, [company?.location]);

  const getLocationDisplay = () => {
    if (!company?.location) return t('settings.companyDetails.notSet');
    if (locationCountry) {
      return `${locationCountry.flag} ${locationCountry.name}`;
    }
    return company.location;
  };

  // Get the appropriate profile based on view
  const currentProfile = isAthleteView ? clientProfile : coachProfile;
  const HEADER_HEIGHT = 52;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.backgroundPrimary,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + HEADER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Details */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
          {t('profile.personalDetails')}
        </Text>
        <Card>
          <DetailRow
            label={t('settings.personalDetails.profilePicture')}
            avatarUrl={currentProfile?.profile_picture_url}
            avatarFallback={
              <PlatformIcon
                sf="person.fill"
                IconComponent={User}
                size={iconSizes.tabBarIcons}
                color={themeColors.primary}
              />
            }
            onPress={handleEditProfilePicture}
          />
          <Separator />
          <DetailRow
            label={t('settings.personalDetails.fullName')}
            value={currentProfile?.name || t('settings.personalDetails.notSet')}
            onPress={handleEditName}
          />
          <Separator />
          <DetailRow
            label={t('settings.personalDetails.email')}
            value={currentProfile?.email || t('settings.personalDetails.notSet')}
          />
        </Card>

        {/* Timezone */}
        <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
          {t('profile.timezone')}
        </Text>
        <Card>
          <DetailRow
            label={t('profile.timezone')}
            value={timezoneDisplayLabel || t('profile.timezoneNotSet')}
            onPress={handleEditTimezone}
          />
        </Card>

        {/* Security */}
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

        {/* Company Details - Only for coach view */}
        {!isAthleteView && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>
              {t('profile.companyDetails')}
            </Text>
            <Card>
              <DetailRow
                label={t('settings.companyDetails.logo')}
                avatarUrl={company?.logo_url}
                avatarFallback={
                  <PlatformIcon
                    sf="building.2"
                    IconComponent={Building2}
                    size={iconSizes.tabBarIcons}
                    color={themeColors.primary}
                  />
                }
                onPress={handleEditLogo}
              />
              <Separator />
              <DetailRow
                label={t('settings.companyDetails.companyName')}
                value={company?.company_name || t('settings.companyDetails.notSet')}
                onPress={handleEditCompanyName}
              />
              <Separator />
              <DetailRow
                label={t('settings.companyDetails.website')}
                value={company?.website || t('settings.companyDetails.notSet')}
                onPress={handleEditWebsite}
              />
              <Separator />
              <DetailRow
                label={t('settings.companyDetails.linkedin')}
                value={company?.linkedin || t('settings.companyDetails.notSet')}
                onPress={handleEditLinkedin}
              />
              <Separator />
              <DetailRow
                label={t('settings.companyDetails.location')}
                value={getLocationDisplay()}
                onPress={handleEditLocation}
              />
              <Separator />
              <DetailRow
                label={t('settings.companyDetails.specialities')}
                value={getSpecialitiesLabel()}
                onPress={handleEditSpecialities}
              />
            </Card>
          </>
        )}

      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleGoBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('profile.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <TimezonePickerModal
        visible={timezoneModalVisible}
        onClose={handleCloseTimezoneModal}
        onSelect={handleSelectTimezone}
        selectedTimezone={currentTimezone || null}
        searchQuery={timezoneSearchQuery}
        onSearchChange={setTimezoneSearchQuery}
        confirmable
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...typography.p1,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: 8,
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
  providerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  providerText: {
    ...typography.p1,
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
