import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Mock activity data
const MOCK_ACTIVITY = {
  lastActivity: '24 hours ago',
  pastWeek: 5,
  pastMonth: 18,
  nextWeek: 4,
};

export default function ClientActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const iconColor = themeColors.text;

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleMessagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Message button pressed');
    // TODO: Implement message navigation
  };

  return (
    <ScreenWrapper scrollable={true}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.overview.activity')}
        </Text>
        <IconButton
          icon={{ sf: 'message', IconComponent: MessageCircle }}
          onPress={handleMessagePress}
          size="md"
          color={iconColor}
        />
      </View>

      {/* Activity Stats Card */}
      <View style={styles.content}>
        <Card style={styles.activityCard}>
          <View style={styles.cardContentNoPadding}>
            <View style={styles.rowItemStatic}>
              <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                {t('clientDetail.overview.lastActivity')}
              </Text>
              <Text style={[styles.rowValue, { color: themeColors.text }]}>
                {MOCK_ACTIVITY.lastActivity}
              </Text>
            </View>
            <Separator style={styles.rowSeparator} />
            <View style={styles.rowItemStatic}>
              <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                {t('clientDetail.overview.pastWeek')}
              </Text>
              <Text style={[styles.rowValue, { color: themeColors.text }]}>
                {MOCK_ACTIVITY.pastWeek} {t('clientDetail.overview.completed')}
              </Text>
            </View>
            <Separator style={styles.rowSeparator} />
            <View style={styles.rowItemStatic}>
              <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                {t('clientDetail.overview.pastMonth')}
              </Text>
              <Text style={[styles.rowValue, { color: themeColors.text }]}>
                {MOCK_ACTIVITY.pastMonth} {t('clientDetail.overview.completed')}
              </Text>
            </View>
            <Separator style={styles.rowSeparator} />
            <View style={styles.rowItemStatic}>
              <Text style={[styles.rowLabel, { color: themeColors.mutedText }]}>
                {t('clientDetail.overview.nextWeek')}
              </Text>
              <Text style={[styles.rowValue, { color: themeColors.text }]}>
                {MOCK_ACTIVITY.nextWeek} {t('clientDetail.overview.planned')}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  activityCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  cardContentNoPadding: {
    paddingVertical: 4,
  },
  rowItemStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    ...typography.p2,
  },
  rowValue: {
    ...typography.p2,
    fontWeight: '600',
  },
  rowSeparator: {
    marginHorizontal: 16,
  },
});
