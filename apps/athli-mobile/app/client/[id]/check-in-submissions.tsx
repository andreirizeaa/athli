import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Inbox } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { PlatformIcon } from '@/components/ui/platform-icon';

type CheckInSubmissionsParams = {
  id: string;
  checkInId: string;
  checkInName: string;
};

export default function CheckInSubmissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<CheckInSubmissionsParams>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const handleBackPress = () => {
    router.back();
  };

  return (
    <ScreenWrapper useImageBackground={false}>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {t('clientDetail.checkIns.submissionsTitle')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.emptyContainer}>
        <PlatformIcon
          sf="tray.full"
          IconComponent={Inbox}
          size={48}
          color={themeColors.mutedText}
        />
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
          {t('clientDetail.checkIns.noSubmissions')}
        </Text>
        <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
          {t('clientDetail.checkIns.noSubmissionsDescription')}
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
});
