import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Activity, ClipboardCheck } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';

export default function MetricsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignMetric = () => {
    router.push('/modals/shared/assign-to-clients-modal?type=metric');
  };

  const handleAddMetric = () => {
    router.push('/modals/library/add-metric-modal');
  };

  const handleLogMetric = () => {
    router.push('/modals/client/log-metric-for-client-modal');
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <IconButton
          icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.sections.metrics')}</Text>
        <DropdownMenuWrapper options={[
          {
            label: t('clientDetail.actions.assignMetric'),
            icon: { sf: 'checklist', IconComponent: ClipboardCheck },
            onPress: handleAssignMetric
          },
          {
            label: t('clientDetail.actions.addMetric'),
            icon: { sf: 'plus', IconComponent: Plus },
            onPress: handleAddMetric
          },
          {
            label: t('clientDetail.actions.logMetric'),
            icon: { sf: 'chart.bar', IconComponent: Activity },
            onPress: handleLogMetric
          }
        ]}>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => { }}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>
      <View style={styles.content}>
        <Text style={{ color: themeColors.mutedText }}>{t('clientDetail.metricsPlaceholder')}</Text>
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
  headerRightPlaceholder: {
    width: 44,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
