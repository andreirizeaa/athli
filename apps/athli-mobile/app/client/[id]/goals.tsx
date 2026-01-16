import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight, Target } from 'lucide-react-native';

import { FlashList } from '@shopify/flash-list';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import type { AthleteGoal } from '@/services/client/client-service';

export default function ClientGoalsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Get goals from store (already loaded by parent screen)
  const goals = useClientDetailStore((state) => state.goals);
  const isLoading = useClientDetailStore((state) => state.isLoading);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

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

  const renderGoal = ({ item, index }: { item: AthleteGoal; index: number }) => (
    <View>
      {index > 0 && <Separator style={styles.separator} />}
      <PressableScale onPress={() => handleGoalPress(item.id)}>
        <View style={styles.goalItem}>
          <View style={[styles.goalIconContainer, { backgroundColor: item.achieved ? `${themeColors.success}15` : `${themeColors.primary}15` }]}>
            <PlatformIcon
              sf="target"
              IconComponent={Target}
              size={20}
              color={item.achieved ? themeColors.success : themeColors.primary}
            />
          </View>
          <View style={styles.goalContent}>
            <Text
              style={[
                styles.goalTitle,
                { color: themeColors.text },
                item.achieved && styles.goalTitleAchieved,
              ]}
              numberOfLines={2}
            >
              {item.goal}
            </Text>
            {item.target_date && (
              <Text style={[styles.goalDate, { color: themeColors.mutedText }]}>
                {formatDate(item.target_date)}
              </Text>
            )}
          </View>
          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </PressableScale>
    </View>
  );

  // Loading state
  if (isLoading && goals.length === 0) {
    return (
      <ScreenWrapper>
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
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

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
          data={goals}
          renderItem={renderGoal}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          ListEmptyComponent={<EmptyState message={t('clientDetail.overview.noGoals')} />}
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
  headerPlaceholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 40,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  goalTitleAchieved: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  goalDate: {
    ...typography.p4,
  },
  separator: {
    marginHorizontal: 16,
  },
});
