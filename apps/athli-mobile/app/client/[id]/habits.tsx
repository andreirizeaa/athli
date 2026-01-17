import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, CheckCircle, Repeat } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';

export default function ClientHabitsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get habits from store (already loaded by parent screen)
  const habits = useClientDetailStore((state) => state.habits);
  const isLoadingHabits = useClientDetailStore((state) => state.isLoadingHabits);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignHabit = () => {
    router.push(`/modals/shared/assign-to-clients-modal?type=habit&clientId=${id}` as any);
  };

  const handleAddHabit = () => {
    router.push(`/modals/library/add-habit-modal?clientId=${id}` as any);
  };

  const handleLogHabit = () => {
    router.push(`/modals/client/log-habit-for-client-modal?clientId=${id}` as any);
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/modals/client/habit-detail-modal?clientId=${id}&habitId=${habitId}` as any);
  };

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
          {t('clientDetail.sections.habits')}
        </Text>
        <DropdownMenuWrapper
          options={[
            {
              label: t('clientDetail.actions.assignHabit'),
              icon: { sf: 'checklist', IconComponent: ClipboardCheck },
              onPress: handleAssignHabit,
            },
            {
              label: t('clientDetail.actions.addHabit'),
              icon: { sf: 'plus', IconComponent: Plus },
              onPress: handleAddHabit,
            },
            {
              label: t('clientDetail.actions.logHabit'),
              icon: { sf: 'checkmark.circle', IconComponent: CheckCircle },
              onPress: handleLogHabit,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
      </View>

      {/* Loading state */}
      {isLoadingHabits && habits.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : habits.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <PlatformIcon sf="repeat" IconComponent={Repeat} size={48} color={themeColors.mutedText} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.habits.emptyTitle')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.habits.emptyDescription')}
          </Text>
        </View>
      ) : (
        /* Habits list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {habits.map((habit) => (
            <View key={habit.id || habit.assignment_id}>
              <PressableScale onPress={() => handleHabitPress(habit.id || habit.assignment_id)}>
                <View style={styles.habitItem}>
                  <View style={[styles.habitIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
                    <PlatformIcon
                      sf="repeat"
                      IconComponent={Repeat}
                      size={24}
                      color={themeColors.primary}
                    />
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitName, { color: themeColors.text }]}>
                      {habit.name}
                    </Text>
                    {habit.description && (
                      <Text
                        style={[styles.habitDescription, { color: themeColors.mutedText }]}
                        numberOfLines={1}
                      >
                        {habit.description}
                      </Text>
                    )}
                    <Text style={[styles.habitPeriod, { color: themeColors.mutedText }]}>
                      {habit.period === 'daily' ? t('general.daily') : t('general.weekly')}
                      {habit.amount ? ` · ${habit.amount} ${habit.unit}` : ''}
                    </Text>
                  </View>
                </View>
              </PressableScale>
              <Separator />
            </View>
          ))}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  habitIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitInfo: {
    flex: 1,
    gap: 2,
  },
  habitName: {
    ...typography.p1,
    fontWeight: '500',
  },
  habitDescription: {
    ...typography.p3,
  },
  habitPeriod: {
    ...typography.p3,
    fontWeight: '500',
  },
});
