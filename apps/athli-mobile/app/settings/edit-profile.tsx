import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, ChevronLeft, User } from 'lucide-react-native';

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

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { appView } = useAppView();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const coachProfile = useCoachProfileStore((state) => state.profile);
  const company = useCoachCompanyStore((state) => state.company);
  const clientProfile = useClientProfileStore((state) => state.profile);

  const isAthleteView = appView === 'athlete';

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

  const getSpecialitiesLabel = () => {
    const count = company?.specialities?.length || 0;
    if (count === 0) return t('settings.companyDetails.noneSelected');
    return `${count} ${t('settings.companyDetails.selected')}`;
  };

  // Get the appropriate profile based on view
  const currentProfile = isAthleteView ? clientProfile : coachProfile;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.backgroundPrimary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.header}>
        <IconButton
          icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
          onPress={handleGoBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('profile.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
                value={company?.location || t('settings.companyDetails.notSet')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    ...typography.h5,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
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
});
