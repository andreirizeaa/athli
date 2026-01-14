import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight } from 'lucide-react-native';

import { FlashList } from '@shopify/flash-list';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';

// Mock goals data
const MOCK_GOALS = [
  { id: '1', title: 'Improve 5k Personal Best to under 20 minutes', date: '2026-03-15' },
  { id: '2', title: 'Complete consistent strength training 2x per week', date: '2026-06-01' },
  { id: '3', title: 'Increase daily water intake to 3L', date: null },
];

type Goal = {
  id: string;
  title: string;
  date: string | null;
};

export default function ClientGoalsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const iconColor = themeColors.text;

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleAddGoal = () => {
    haptics.medium();
    router.push({
      pathname: '/modals/client/add-client-goal-modal',
      params: { id },
    });
  };

  const handleGoalPress = (goalId: string) => {
    haptics.medium();
    router.push({
      pathname: '/modals/client/edit-client-goal-modal',
      params: { id, goalId },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderGoal = ({ item, index }: { item: Goal; index: number }) => (
    <View>
      {index > 0 && <Separator style={styles.separator} />}
      <PressableScale onPress={() => handleGoalPress(item.id)}>
        <View style={styles.goalItem}>
          <View style={styles.goalContent}>
            <Text style={[styles.goalTitle, { color: themeColors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.date && (
              <Text style={[styles.goalDate, { color: themeColors.mutedText }]}>
                {formatDate(item.date)}
              </Text>
            )}
          </View>
          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </PressableScale>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.overview.goals')}
          </Text>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={handleAddGoal}
            size="md"
            color={iconColor}
          />
        </View>

        {/* Goals List */}
        <FlashList
          data={MOCK_GOALS}
          renderItem={renderGoal}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState message={t('clientDetail.overview.noGoals')} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenWrapper>
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
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  goalContent: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  goalTitle: {
    ...typography.p2,
    fontWeight: '500',
  },
  goalDate: {
    ...typography.p4,
  },
  separator: {
    marginHorizontal: 16,
  },
});
