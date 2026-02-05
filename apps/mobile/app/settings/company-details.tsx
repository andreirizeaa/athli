import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building2 } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useCoachCompanyStore } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { DetailRow } from '@/components/ui/detail-row';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { findCountry } from '@/services/coach/coach-company-service';

export default function CompanyDetailsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const company = useCoachCompanyStore((state) => state.company);

  const handleGoBack = () => {
    router.back();
  };

  const handleEditLogo = () => {
    router.push({
      pathname: '/modals/settings/edit-company-details-modal',
      params: { field: 'logo' },
    });
  };

  const handleEditName = () => {
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
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleGoBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('settings.companyDetails.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
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
            onPress={handleEditName}
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
      </View>
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
    paddingTop: 16,
  },
});
