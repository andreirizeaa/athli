import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, User } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { DetailRow } from '@/components/ui/detail-row';
import { PlatformIcon } from '@/components/ui/platform-icon';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const coachProfile = useCoachProfileStore((state) => state.profile);

  const handleGoBack = () => {
    router.back();
  };

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
          {t('settings.personalDetails.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Card>
          <DetailRow
            label={t('settings.personalDetails.profilePicture')}
            avatarUrl={coachProfile?.profile_picture_url}
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
            value={coachProfile?.name || t('settings.personalDetails.notSet')}
            onPress={handleEditName}
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
